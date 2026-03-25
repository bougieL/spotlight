import { defineAsyncComponent } from 'vue';
import type { Component } from 'vue';
import type { SearchResultItem, SearchResultItemContext, SearchParams, RenderParams } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { pluginRegistry } from '@spotlight/plugin-registry';
import { registerTranslations, translations, getLocale } from '@spotlight/i18n';
import { normalizeForSearch, toPinyinInitials, matchKeyword } from '@spotlight/utils/pinyin';
import { isColorString, normalizeColor } from './utils/colorUtils';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const paletteIconUrl = new URL('./assets/palette.svg', import.meta.url).href;

const ACTION_OPEN = 'open';

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
      pluginId: this.pluginId,
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

    const keywords = [
      { keyword: 'color', normalized: normalizeForSearch('color') },
      { keyword: 'palette', normalized: normalizeForSearch('palette') },
      { keyword: 'colour', normalized: normalizeForSearch('colour') },
      { keyword: 'colors', normalized: normalizeForSearch('colors') },
      { keyword: '色盘', normalized: normalizeForSearch('色盘'), pinyinInitials: toPinyinInitials('色盘') },
      { keyword: '颜色', normalized: normalizeForSearch('颜色'), pinyinInitials: toPinyinInitials('颜色') },
    ];

    const isKeywordMatch = matchKeyword(queryLower, keywords);

    const isColorMatch = isColorString(query);

    if (!isKeywordMatch && !isColorMatch) {
      return [];
    }

    const title = isColorMatch ? `Color: ${normalizeColor(query)}` : this.name;
    const normalizedColor = isColorMatch ? normalizeColor(query) : null;

    return [
      {
        iconUrl: paletteIconUrl,
        title,
        score: isColorMatch ? 950 : 900,
        sourcePlugin: this.pluginId,
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
