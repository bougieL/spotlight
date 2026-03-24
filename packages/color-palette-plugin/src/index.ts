import { Palette } from 'lucide-vue-next';
import { defineAsyncComponent } from 'vue';
import type { Component } from 'vue';
import type { SearchResultItem, SearchResultItemContext, SearchParams, RenderParams } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { pluginRegistry } from '@spotlight/plugin-registry';
import { registerTranslations, translations, getLocale } from '@spotlight/i18n';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const PLUGIN_NAME = 'colorPalette';
const ACTION_OPEN = 'open';

// Color name to hex mapping
const COLOR_NAMES: Record<string, string> = {
  red: '#FF0000',
  green: '#00FF00',
  blue: '#0000FF',
  yellow: '#FFFF00',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  white: '#FFFFFF',
  black: '#000000',
  orange: '#FFA500',
  purple: '#800080',
  pink: '#FFC0CB',
  brown: '#A52A2A',
  gray: '#808080',
  grey: '#808080',
};

// Regex patterns for color formats
const HEX_PATTERN = /^#?([a-f\d]{6}|[a-f\d]{3})$/i;
const RGB_PATTERN = /^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i;
const RGBA_PATTERN = /^rgba\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*[\d.]+\s*\)$/i;
const HSL_PATTERN = /^hsl\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})%?\s*,\s*(\d{1,3})%?\s*\)$/i;
const HSLA_PATTERN = /^hsla\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})%?\s*,\s*(\d{1,3})%?\s*,\s*[\d.]+\s*\)$/i;

function isColorString(input: string): boolean {
  const trimmed = input.trim().toLowerCase();
  return (
    HEX_PATTERN.test(trimmed) ||
    RGB_PATTERN.test(trimmed) ||
    RGBA_PATTERN.test(trimmed) ||
    HSL_PATTERN.test(trimmed) ||
    HSLA_PATTERN.test(trimmed) ||
    trimmed.toLowerCase() in COLOR_NAMES
  );
}

function normalizeColor(input: string): string {
  const trimmed = input.trim();

  // Already hex
  if (HEX_PATTERN.test(trimmed)) {
    const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    // Expand 3-char hex
    if (hex.length === 4) {
      return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toUpperCase();
    }
    return hex.toUpperCase();
  }

  // RGB
  const rgbMatch = trimmed.match(RGB_PATTERN);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
  }

  // HSL
  const hslMatch = trimmed.match(HSL_PATTERN);
  if (hslMatch) {
    const h = parseInt(hslMatch[1], 10);
    const s = parseInt(hslMatch[2], 10) / 100;
    const l = parseInt(hslMatch[3], 10) / 100;
    return hslToHex({ h, s, l });
  }

  // Color name
  const colorName = trimmed.toLowerCase();
  if (colorName in COLOR_NAMES) {
    return COLOR_NAMES[colorName].toUpperCase();
  }

  return trimmed.toUpperCase();
}

function hslToHex(hsl: { h: number; s: number; l: number }): string {
  const { h, s, l } = hsl;
  const sNorm = Math.max(0, Math.min(1, s));
  const lNorm = Math.max(0, Math.min(1, l));
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = lNorm - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

export class ColorPalettePlugin extends BasePlugin {
  get name(): string {
    return translations[getLocale()]['colorPalette'] ?? 'Color Palette';
  }
  get description(): string | undefined {
    return translations[getLocale()]['colorPalette.description'];
  }
  pluginId = 'color-palette-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  constructor() {
    super();
    pluginRegistry.registerAction({
      pluginName: PLUGIN_NAME,
      actionId: ACTION_OPEN,
      handler: async (_data, ctx) => {
        const component = await this.render({ query: '' });
        if (component) {
          ctx.setPanel(component, this.name);
        }
      },
    });
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim();
    if (query.length === 0) {
      return [];
    }

    const queryLower = query.toLowerCase();
    const keywords = ['color', 'palette', 'colour', '色盘', '颜色', 'colors'];

    const isKeywordMatch = keywords.some(
      (kw) => kw.includes(queryLower) || queryLower.includes(kw)
    );

    const isColorMatch = isColorString(query);

    if (!isKeywordMatch && !isColorMatch) {
      return [];
    }

    const title = isColorMatch ? `Color: ${normalizeColor(query)}` : this.name;
    const normalizedColor = isColorMatch ? normalizeColor(query) : null;

    return [
      {
        icon: Palette,
        iconComponentName: 'Palette',
        title,
        score: isColorMatch ? 950 : 900,
        sourcePlugin: PLUGIN_NAME,
        actionId: ACTION_OPEN,
        actionData: normalizedColor,
        action: async (ctx: SearchResultItemContext) => {
          const component = await this.render({ query: normalizedColor ?? '' });
          if (component) {
            ctx.setPanel(component, this.name);
          }
        },
      },
    ];
  }

  async render(_params: RenderParams): Promise<Component | null> {
    return defineAsyncComponent(() => import('./components/ColorPalettePanel.vue'));
  }
}

export const colorPalettePlugin = new ColorPalettePlugin();
