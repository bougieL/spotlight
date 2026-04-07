import type { SearchResultItem, SearchParams, PluginActions, ActionContext, Plugin } from '@spotlight/core';
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

export class ColorPalettePlugin implements Plugin {
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

    const keywordStr = this.i18n.t('colorPalette.keywords');
    const keywordList = keywordStr.split('|');
    const keywords = keywordList.map((keyword: string) => ({
      keyword,
      normalized: normalizeForSearch(keyword),
      pinyinInitials: toPinyinInitials(keyword),
    }));

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

const colorPalettePlugin = new ColorPalettePlugin();
export default colorPalettePlugin;
