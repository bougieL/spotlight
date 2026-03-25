import { defineAsyncComponent } from 'vue';
import type { Component } from 'vue';
import type { SearchResultItem, SearchResultItemContext, SearchParams, RenderParams } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { pluginRegistry } from '@spotlight/plugin-registry';
import { registerTranslations, translations, getLocale } from '@spotlight/i18n';
import { isColorString, normalizeColor } from './utils/colorUtils';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const paletteIconUrl = new URL('./assets/icons/palette.svg', import.meta.url).href;

const PLUGIN_NAME = 'colorPalette';
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
        iconUrl: paletteIconUrl,
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
