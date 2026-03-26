import type { SearchResultItem, SearchParams, PluginActions } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { registerTranslations, translations, getLocale } from '@spotlight/i18n';
import { tauriApi } from '@spotlight/api';
import logger from '@spotlight/logger';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const screenshotIconUrl = new URL('../assets/screenshot.svg', import.meta.url).href;

const ACTION_SCREENSHOT = 'screenshot';
const OVERLAY_WINDOW_LABEL = 'screenshot-overlay';

export class ScreenshotPlugin extends BasePlugin {
  get name(): string {
    return translations[getLocale()]['screenshot'] ?? 'Screenshot';
  }
  get description(): string | undefined {
    return translations[getLocale()]['plugin.description.screenshot'];
  }
  pluginId = 'screenshot-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  registerAction(): PluginActions {
    return {
      [ACTION_SCREENSHOT]: async () => {
        await this.startScreenshot();
      },
    };
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim().toLowerCase();
    const keywords = ['screenshot', 'screen', 'capture', '截图', '截屏', '屏幕截图'];

    const isKeywordMatch = keywords.some(
      (kw) => kw.toLowerCase().includes(query) || query.includes(kw.toLowerCase())
    );

    if (isKeywordMatch) {
      return [
        {
          iconUrl: screenshotIconUrl,
          title: this.name,
          score: 900,
          pluginId: this.pluginId,
          actionId: ACTION_SCREENSHOT,
          actionData: null,
        },
      ];
    }

    return [];
  }

  async startScreenshot(): Promise<void> {
    try {
      const url = this.getPublicUrl('screenshot.html');
      await tauriApi.createOverlayWindow(url, OVERLAY_WINDOW_LABEL);
      logger.info('Screenshot started');
    } catch (error) {
      logger.error('Failed to start screenshot:', error);
    }
  }
}

export const screenshotPlugin = new ScreenshotPlugin();
