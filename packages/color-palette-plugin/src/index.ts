import type { SearchResultItem, SearchParams, PluginActions, ActionContext } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { registerTranslations, useI18n } from '@spotlight/i18n';
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
  private readonly i18n = useI18n();

  get name(): string {
    return this.i18n.t('colorPalette.name');
  }

  get description(): string | undefined {
    return this.i18n.t('colorPalette.description');
  }

  iconUrl = paletteIconUrl;
  pluginId = 'color-palette-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  registerAction(ctx: ActionContext): PluginActions {
    return {
      [ACTION_OPEN]: async () => {
        ctx.navigateToPlugin(this.pluginId);
      },
    };
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
        score: 900,
        pluginId: this.pluginId,
        actionId: ACTION_OPEN,
        actionData: normalizedColor,
      },
    ];
  }

  getPanelRoutes() {
    return [
      { name: 'main', componentLoader: () => import('./components/ColorPalettePanel.vue') },
    ];
  }
}

export const colorPalettePlugin = new ColorPalettePlugin();
