import type { SearchResultItem, SearchParams, PluginActions, ActionContext } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { createPluginStorage, type PluginStorage } from '@spotlight/api';
import { registerTranslations, useI18n } from '@spotlight/i18n';
import { normalizeForSearch, toPinyinInitials, matchKeyword } from '@spotlight/utils/pinyin';
import logger from '@spotlight/logger';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const calculatorIconUrl = new URL('./assets/calculator.svg', import.meta.url).href;

const STORAGE_KEY = 'calculator_expressions';
const ACTION_OPEN = 'open';
const ACTION_CALCULATE = 'calculate';

export class CalculatorPlugin extends BasePlugin {
  private readonly i18n = useI18n();

  get name(): string {
    return this.i18n.t('calculator.name');
  }
  get description(): string | undefined {
    return this.i18n.t('calculator.description');
  }
  iconUrl = calculatorIconUrl;
  pluginId = 'calculator-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  private storage: PluginStorage = createPluginStorage(this.pluginId);

  registerAction(ctx: ActionContext): PluginActions {
    return {
      [ACTION_OPEN]: async () => {
        ctx.navigateToPlugin(this.pluginId);
      },
      [ACTION_CALCULATE]: async (data) => {
        if (typeof data !== 'string') return;
        try {
          await navigator.clipboard.writeText(data);
          logger.info('Calculator result copied to clipboard:', data);
        } catch (error) {
          logger.error('Failed to copy to clipboard:', error);
        }
        ctx.navigateToPlugin(this.pluginId);
      },
    };
  }

  async getExpressions(): Promise<string[]> {
    const stored = await this.storage.get<string[]>(STORAGE_KEY, ['', '', '']);
    if (Array.isArray(stored) && stored.length >= 1) {
      return stored;
    }
    return ['', '', ''];
  }

  async saveExpressions(expressions: string[]): Promise<void> {
    await this.storage.set(STORAGE_KEY, expressions);
  }

  private evaluateExpression(expr: string): number | null {
    // Remove leading = if present
    const cleanExpr = expr.startsWith('=') ? expr.slice(1) : expr;
    const trimmed = cleanExpr.trim();

    if (!trimmed) {
      return null;
    }

    // Security check: only allow safe mathematical characters
    const safePattern = /^[\d+\-*/().%\s^sqrtabsincontaolrllexppi\d,]+$/i;
    if (!safePattern.test(trimmed)) {
      return null;
    }

    // Preprocess the expression
    let processedExpr = trimmed
      .replace(/\^/g, '**')
      .replace(/sqrt/gi, 'Math.sqrt')
      .replace(/abs/gi, 'Math.abs')
      .replace(/sin/gi, 'Math.sin')
      .replace(/cos/gi, 'Math.cos')
      .replace(/tan/gi, 'Math.tan')
      .replace(/log/gi, 'Math.log')
      .replace(/exp/gi, 'Math.exp')
      .replace(/pi/gi, String(Math.PI))
      .replace(/ln\s/g, 'Math.log(')
      .replace(/,\s*/g, ', ');

    // Handle implicit multiplication like 2(3) = 6
    processedExpr = processedExpr.replace(/(\d)\(/g, '$1*(');
    processedExpr = processedExpr.replace(/\)(\d)/g, ')*$1');

    // Handle percentage (e.g., 50% = 0.5)
    processedExpr = processedExpr.replace(/(\d+)%/g, '($1/100)');

    try {
      return this.evaluate(processedExpr);
    } catch {
      return null;
    }
  }

  /**
   * Safe expression evaluator using recursive descent parsing.
   * This avoids the security risks of eval() while supporting mathematical expressions.
   */
  private evaluate(expr: string): number {
    const tokenizer = new Tokenizer(expr);
    const parser = new Parser(tokenizer);
    return parser.parse();
  }

  private formatResult(value: number): string {
    // Format number to avoid floating point precision issues
    const formatted = Number(value.toPrecision(12));
    if (Number.isInteger(formatted)) {
      return formatted.toString();
    }
    return formatted.toString();
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim();

    // Keywords with pinyin support
    const keywords = [
      { keyword: 'calculator', normalized: normalizeForSearch('calculator') },
      { keyword: 'calcul', normalized: normalizeForSearch('calcul') },
      { keyword: 'calc', normalized: normalizeForSearch('calc') },
      { keyword: '计算器', normalized: normalizeForSearch('计算器'), pinyinInitials: toPinyinInitials('计算器') },
      { keyword: '计算', normalized: normalizeForSearch('计算'), pinyinInitials: toPinyinInitials('计算') },
      { keyword: '数学', normalized: normalizeForSearch('数学'), pinyinInitials: toPinyinInitials('数学') },
      { keyword: 'math', normalized: normalizeForSearch('math') },
      { keyword: 'expression', normalized: normalizeForSearch('expression') },
      { keyword: '表达式', normalized: normalizeForSearch('表达式'), pinyinInitials: toPinyinInitials('表达式') },
    ];

    if (matchKeyword(query, keywords)) {
      return [
        {
          iconUrl: calculatorIconUrl,
          title: this.name,
          score: 900,
          pluginId: this.pluginId,
          actionId: ACTION_OPEN,
          actionData: null,
        },
      ];
    }

    // Check if query looks like a math expression
    const mathPattern = /^[\d+\-*/().%\s^sqrtabsincostanlogexppi,]+$/i;
    if (!mathPattern.test(query)) {
      // Also check for expressions starting with =
      if (!query.startsWith('=')) {
        return [];
      }
    }

    const result = this.evaluateExpression(query);
    if (result === null) {
      return [];
    }

    const formattedResult = this.formatResult(result);
    const displayExpression = query.startsWith('=') ? query.slice(1).trim() : query;

    return [
      {
        iconUrl: calculatorIconUrl,
        title: `${displayExpression} = ${formattedResult}`,
        score: 1000,
        pluginId: this.pluginId,
        actionId: ACTION_CALCULATE,
        actionData: formattedResult,
      },
    ];
  }

  getPanelRoutes() {
    return [
      { name: 'main', componentLoader: () => import('./components/CalculatorPanel.vue') },
    ];
  }
}

export const calculatorPlugin = new CalculatorPlugin();

// ============================================================================
// Safe Expression Parser (replaces eval)
// ============================================================================

type TokenType = 'NUMBER' | 'OPERATOR' | 'LPAREN' | 'RPAREN' | 'COMMA' | 'EOF';

interface Token {
  type: TokenType;
  value: string | number;
}

class Tokenizer {
  private pos = 0;
  private readonly input: string;

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (this.pos < this.input.length) {
      const token = this.nextToken();
      if (token) {
        tokens.push(token);
      }
    }
    tokens.push({ type: 'EOF', value: '' });
    return tokens;
  }

  private nextToken(): Token | null {
    this.skipWhitespace();
    if (this.pos >= this.input.length) {
      return null;
    }

    const ch = this.input[this.pos];

    if (this.isDigit(ch) || ch === '.') {
      return this.readNumber();
    }

    if (this.isAlpha(ch)) {
      return this.readIdentifier();
    }

    switch (ch) {
      case '+':
        this.pos++;
        return { type: 'OPERATOR', value: '+' };
      case '-':
        this.pos++;
        return { type: 'OPERATOR', value: '-' };
      case '*':
        this.pos++;
        return { type: 'OPERATOR', value: '*' };
      case '/':
        this.pos++;
        return { type: 'OPERATOR', value: '/' };
      case '%':
        this.pos++;
        return { type: 'OPERATOR', value: '%' };
      case '(':
        this.pos++;
        return { type: 'LPAREN', value: '(' };
      case ')':
        this.pos++;
        return { type: 'RPAREN', value: ')' };
      case ',':
        this.pos++;
        return { type: 'COMMA', value: ',' };
      case '^':
        this.pos++;
        return { type: 'OPERATOR', value: '^' };
    }

    // Skip unknown characters (should not reach here due to regex validation)
    this.pos++;
    return null;
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++;
    }
  }

  private isDigit(ch: string): boolean {
    return /[0-9]/.test(ch);
  }

  private isAlpha(ch: string): boolean {
    return /[a-zA-Z]/.test(ch);
  }

  private readNumber(): Token {
    let numStr = '';
    while (this.pos < this.input.length && (this.isDigit(this.input[this.pos]) || this.input[this.pos] === '.')) {
      numStr += this.input[this.pos];
      this.pos++;
    }
    return { type: 'NUMBER', value: parseFloat(numStr) };
  }

  private readIdentifier(): Token {
    let ident = '';
    while (this.pos < this.input.length && (this.isAlpha(this.input[this.pos]) || this.isDigit(this.input[this.pos]))) {
      ident += this.input[this.pos];
      this.pos++;
    }
    return { type: 'OPERATOR', value: ident };
  }
}

class Parser {
  private tokens: Token[] = [];
  private pos = 0;

  constructor(tokenizer: Tokenizer) {
    this.tokens = tokenizer.tokenize();
  }

  parse(): number {
    if (this.tokens.length === 1 && this.tokens[0].type === 'EOF') {
      throw new Error('Empty expression');
    }
    const result = this.parseExpression();
    if (this.currentToken().type !== 'EOF') {
      throw new Error('Unexpected token');
    }
    return result;
  }

  private currentToken(): Token {
    return this.tokens[this.pos] ?? { type: 'EOF', value: '' };
  }

  private advance(): Token {
    const token = this.currentToken();
    if (this.pos < this.tokens.length - 1) {
      this.pos++;
    }
    return token;
  }

  private parseExpression(): number {
    return this.parseAdditive();
  }

  private parseAdditive(): number {
    let left = this.parseMultiplicative();

    while (this.currentToken().type === 'OPERATOR' && (this.currentToken().value === '+' || this.currentToken().value === '-')) {
      const op = this.advance().value;
      const right = this.parseMultiplicative();
      if (op === '+') {
        left += right;
      } else {
        left -= right;
      }
    }

    return left;
  }

  private parseMultiplicative(): number {
    let left = this.parsePower();

    while (this.currentToken().type === 'OPERATOR' &&
           (this.currentToken().value === '*' || this.currentToken().value === '/' || this.currentToken().value === '%')) {
      const op = this.advance().value;
      const right = this.parsePower();
      if (op === '*') {
        left *= right;
      } else if (op === '/') {
        if (right === 0) throw new Error('Division by zero');
        left /= right;
      } else {
        left %= right;
      }
    }

    return left;
  }

  private parsePower(): number {
    let left = this.parseUnary();

    if (this.currentToken().type === 'OPERATOR' && this.currentToken().value === '^') {
      this.advance();
      const right = this.parsePower(); // Right associative
      left = Math.pow(left, right);
    }

    return left;
  }

  private parseUnary(): number {
    if (this.currentToken().type === 'OPERATOR' && this.currentToken().value === '-') {
      this.advance();
      return -this.parseUnary();
    }
    if (this.currentToken().type === 'OPERATOR' && this.currentToken().value === '+') {
      this.advance();
      return this.parseUnary();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const token = this.currentToken();

    if (token.type === 'NUMBER') {
      this.advance();
      return token.value as number;
    }

    if (token.type === 'LPAREN') {
      this.advance();
      const value = this.parseExpression();
      if (this.currentToken().type !== 'RPAREN') {
        throw new Error('Expected closing parenthesis');
      }
      this.advance();
      return value;
    }

    if (token.type === 'OPERATOR') {
      // This is a function name or Math constant
      const name = token.value as string;
      this.advance();

      if (this.currentToken().type === 'LPAREN') {
        // Function call
        this.advance();
        const args: number[] = [];
        if (this.currentToken().type !== 'RPAREN') {
          args.push(this.parseExpression());
          while (this.currentToken().type === 'COMMA') {
            this.advance();
            args.push(this.parseExpression());
          }
        }
        if (this.currentToken().type !== 'RPAREN') {
          throw new Error('Expected closing parenthesis after arguments');
        }
        this.advance();
        return this.evaluateFunction(name, args);
      } else {
        // Constant (e.g., Math.PI was replaced with its value, but let's handle it)
        return this.evaluateConstant(name);
      }
    }

    throw new Error(`Unexpected token: ${token.value}`);
  }

  private evaluateFunction(name: string, args: number[]): number {
    const lowerName = name.toLowerCase();
    switch (lowerName) {
      case 'math.sqrt':
        if (args.length !== 1) throw new Error('sqrt expects 1 argument');
        return Math.sqrt(args[0]);
      case 'math.abs':
        if (args.length !== 1) throw new Error('abs expects 1 argument');
        return Math.abs(args[0]);
      case 'math.sin':
        if (args.length !== 1) throw new Error('sin expects 1 argument');
        return Math.sin(args[0]);
      case 'math.cos':
        if (args.length !== 1) throw new Error('cos expects 1 argument');
        return Math.cos(args[0]);
      case 'math.tan':
        if (args.length !== 1) throw new Error('tan expects 1 argument');
        return Math.tan(args[0]);
      case 'math.log':
        if (args.length !== 1) throw new Error('log expects 1 argument');
        return Math.log(args[0]);
      case 'math.exp':
        if (args.length !== 1) throw new Error('exp expects 1 argument');
        return Math.exp(args[0]);
      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }

  private evaluateConstant(name: string): number {
    // Handle Math.PI replacement (already replaced with actual value, but for safety)
    if (name === String(Math.PI)) {
      return Math.PI;
    }
    throw new Error(`Unknown constant: ${name}`);
  }
}
