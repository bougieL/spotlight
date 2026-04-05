import type { SearchResultItem, SearchParams, PluginActions, ActionContext } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { registerTranslations, useI18n } from '@spotlight/i18n';
import { normalizeForSearch, toPinyinInitials, matchKeyword } from '@spotlight/utils/pinyin';
import { listWindows, focusWindow, type WindowInfo } from '@spotlight/api';
import logger from '@spotlight/logger';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const windowIconUrl = new URL('./assets/window.svg', import.meta.url).href;

const ACTION_OPEN = 'open';
const ACTION_FOCUS = 'focus';

class WindowManagerPlugin extends BasePlugin {
  private readonly i18n = useI18n();

  get name(): string {
    return this.i18n.t('windowManager.name');
  }

  get description(): string | undefined {
    return this.i18n.t('windowManager.description');
  }

  iconUrl = windowIconUrl;
  pluginId = 'window-manager-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  registerAction(ctx: ActionContext): PluginActions {
    return {
      [ACTION_OPEN]: async () => {
        ctx.navigateToPlugin(this.pluginId);
      },
      [ACTION_FOCUS]: async (data) => {
        if (typeof data !== 'number') return;
        try {
          await focusWindow(data);
          logger.info(`Window focused: hwnd=${data}`);
        } catch (error) {
          logger.error('Failed to focus window', error);
        }
      },
    };
  }

  async getWindows(): Promise<WindowInfo[]> {
    try {
      return await listWindows();
    } catch (error) {
      logger.error('Failed to list windows', error);
      return [];
    }
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim();
    const keywords = this.getKeywords();
    const keywordStrs = keywords.map((k) => k.keyword);
    const matchResult = matchKeyword(query, keywords);

    logger.info(`[WindowManagerPlugin] search: query="${query}", keywords=${JSON.stringify(keywordStrs)}, matchResult=${matchResult}`);

    if (matchResult) {
      return [
        {
          iconUrl: windowIconUrl,
          title: this.name,
          score: 900,
          pluginId: this.pluginId,
          actionId: ACTION_OPEN,
          actionData: null,
        },
      ];
    }

    const windows = await this.getWindows();
    const normalizedQuery = normalizeForSearch(query).toLowerCase();

    const matchingWindows = windows
      .filter((w) => {
        const titleNorm = normalizeForSearch(w.title).toLowerCase();
        const processNorm = normalizeForSearch(w.processName).toLowerCase();
        return titleNorm.includes(normalizedQuery) || processNorm.includes(normalizedQuery);
      })
      .slice(0, 10);

    if (matchingWindows.length === 0) {
      return [];
    }

    return matchingWindows.map((w) => ({
      iconUrl: windowIconUrl,
      title: w.title,
      desc: `${this.i18n.t('window.process')}: ${w.processName}`,
      score: 800,
      pluginId: this.pluginId,
      actionId: ACTION_FOCUS,
      actionData: w.hwnd,
    }));
  }

  private getKeywords() {
    const keywordsStr = this.i18n.t('windowManager.keywords');
    return keywordsStr.split('|').map((k: string) => ({
      keyword: k,
      normalized: normalizeForSearch(k),
      pinyinInitials: toPinyinInitials(k),
    }));
  }

  getPanelRoutes() {
    return [
      { name: 'main', componentLoader: () => import('./components/WindowManagerPanel.vue') },
    ];
  }
}

const windowManagerPlugin = new WindowManagerPlugin();
export default windowManagerPlugin;
