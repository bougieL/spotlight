import { defineAsyncComponent } from 'vue';
import type { Component } from 'vue';
import type { SearchResultItem, SearchParams, RenderParams, PluginActions } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { createPluginStorage, type PluginStorage } from '@spotlight/api';
import { registerTranslations, translations, getLocale } from '@spotlight/i18n';
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
  get name(): string {
    return translations[getLocale()]['calculator'] ?? 'Calculator';
  }
  get description(): string | undefined {
    return translations[getLocale()]['plugin.description.calculator'];
  }
  pluginId = 'calculator-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  private storage: PluginStorage = createPluginStorage(this.name);

  registerAction(): PluginActions {
    return {
      [ACTION_OPEN]: async (_data, ctx) => {
        const component = await this.render({ query: '' });
        if (component) {
          ctx.setPanel(component, this.name);
        }
      },
      [ACTION_CALCULATE]: async (data, ctx) => {
        if (typeof data !== 'string') return;
        try {
          await navigator.clipboard.writeText(data);
          logger.info('Calculator result copied to clipboard:', data);
        } catch (error) {
          logger.error('Failed to copy to clipboard:', error);
        }
        const component = await this.render({ query: data });
        if (component) {
          ctx.setPanel(component, this.name);
        }
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

    // Replace common math functions with JavaScript equivalents
    let jsExpr = trimmed
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
    jsExpr = jsExpr.replace(/(\d)\(/g, '$1*(');
    jsExpr = jsExpr.replace(/\)(\d)/g, ')*$1');

    // Handle percentage (e.g., 50% = 0.5)
    jsExpr = jsExpr.replace(/(\d+)%/g, '($1/100)');

    try {
      // eslint-disable-next-line no-eval
      const result = eval(jsExpr);
      if (typeof result === 'number' && isFinite(result)) {
        return result;
      }
      return null;
    } catch {
      return null;
    }
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

  async render(_params: RenderParams): Promise<Component | null> {
    return defineAsyncComponent(() => import('./components/CalculatorPanel.vue'));
  }
}

export const calculatorPlugin = new CalculatorPlugin();
