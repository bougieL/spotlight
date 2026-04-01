import type { SearchResultItem, SearchParams, PluginActions, ActionContext } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { registerTranslations, translations, getLocale } from '@spotlight/i18n';
import { normalizeForSearch, toPinyinInitials, matchKeyword } from '@spotlight/utils/pinyin';
import {
  listWindows,
  minimizeWindow,
  maximizeWindow,
  restoreWindow,
  closeWindow,
  setWindowAlwaysOnTop,
  focusWindow,
  type WindowInfo,
} from '@spotlight/api';
import logger from '@spotlight/logger';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

export type { WindowInfo };

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const windowIconUrl = new URL('./assets/window.svg', import.meta.url).href;

const ACTION_OPEN = 'open';
const ACTION_MINIMIZE = 'minimize';
const ACTION_MAXIMIZE = 'maximize';
const ACTION_RESTORE = 'restore';
const ACTION_CLOSE = 'close';
const ACTION_ALWAYS_ON_TOP = 'always_on_top';
const ACTION_FOCUS = 'focus';

export class WindowManagerPlugin extends BasePlugin {
  get name(): string {
    return translations[getLocale()]['windowManager'] ?? 'Window Manager';
  }

  get description(): string | undefined {
    return translations[getLocale()]['windowManager.description'];
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
      [ACTION_MINIMIZE]: async (data) => {
        if (typeof data !== 'number') return;
        try {
          await minimizeWindow(data);
          logger.info(`Window minimized: hwnd=${data}`);
        } catch (error) {
          logger.error('Failed to minimize window', error);
        }
      },
      [ACTION_MAXIMIZE]: async (data) => {
        if (typeof data !== 'number') return;
        try {
          await maximizeWindow(data);
          logger.info(`Window maximized: hwnd=${data}`);
        } catch (error) {
          logger.error('Failed to maximize window', error);
        }
      },
      [ACTION_RESTORE]: async (data) => {
        if (typeof data !== 'number') return;
        try {
          await restoreWindow(data);
          logger.info(`Window restored: hwnd=${data}`);
        } catch (error) {
          logger.error('Failed to restore window', error);
        }
      },
      [ACTION_CLOSE]: async (data) => {
        if (typeof data !== 'number') return;
        try {
          await closeWindow(data);
          logger.info(`Window closed: hwnd=${data}`);
        } catch (error) {
          logger.error('Failed to close window', error);
        }
      },
      [ACTION_ALWAYS_ON_TOP]: async (data) => {
        if (!data || typeof data !== 'object') return;
        const { hwnd, onTop } = data as { hwnd: number; onTop: boolean };
        try {
          await setWindowAlwaysOnTop(hwnd, onTop);
          logger.info(`Window always on top set: hwnd=${hwnd}, onTop=${onTop}`);
        } catch (error) {
          logger.error('Failed to set window always on top', error);
        }
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

    if (matchKeyword(query, keywords)) {
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

    // Search through open windows if query doesn't match keywords
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
      desc: `${translations[getLocale()]['window.process']}: ${w.processName}`,
      score: 800,
      pluginId: this.pluginId,
      actionId: ACTION_FOCUS,
      actionData: w.hwnd,
    }));
  }

  private getKeywords() {
    const locale = getLocale();
    const keywordsStr = translations[locale]['keywords'] ?? 'window|windows|manager';
    return keywordsStr.split('|').map((k) => ({
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

export const windowManagerPlugin = new WindowManagerPlugin();