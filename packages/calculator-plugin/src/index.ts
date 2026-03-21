import { Calculator } from 'lucide-vue-next';
import type { Component } from 'vue';
import type { SearchResultItem, SearchParams, RenderParams } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';

export class CalculatorPlugin extends BasePlugin {
  name = 'calculator';
  version = '1.0.0';
  description = 'Perform mathematical calculations';
  author = 'Spotlight Team';

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
        icon: Calculator,
        title: `${displayExpression} = ${formattedResult}`,
        action: async () => {
          // Copy result to clipboard
          try {
            await navigator.clipboard.writeText(formattedResult);
            console.log('Calculator result copied to clipboard:', formattedResult);
          } catch (error) {
            console.error('Failed to copy to clipboard:', error);
          }
        },
      },
    ];
  }

  async render(_params: RenderParams): Promise<Component | null> {
    return null;
  }
}

export const calculatorPlugin = new CalculatorPlugin();
