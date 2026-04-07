import type { SearchResultItem, SearchParams, PluginActions, Plugin } from '@spotlight/core';
import { getPluginPublicUrl } from '@spotlight/core';
import { registerTranslations, useI18n } from '@spotlight/i18n';
import { tauriApi, registerTrayItem, unRegisterTrayItem } from '@spotlight/api';
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

export class ScreenshotPlugin implements Plugin {
  private readonly i18n = useI18n();

  get name(): string {
    return this.i18n.t('screenshot.name');
  }
  get description(): string | undefined {
    return this.i18n.t('screenshot.description');
  }
  iconUrl = screenshotIconUrl;
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
    const keywordStr = this.i18n.t('screenshot.keywords');
    const keywords = keywordStr.split('|');

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

  getPublicUrl(filePath: string): string {
    return getPluginPublicUrl(this.pluginId, filePath);
  }

  async startScreenshot(): Promise<void> {
    try {
      await tauriApi.hideWindow();
      const url = this.getPublicUrl('screenshot.html');
      await tauriApi.createOverlayWindow(url, OVERLAY_WINDOW_LABEL);
      logger.info('Screenshot started');
    } catch (error) {
      logger.error('Failed to start screenshot:', error);
    }
  }

  async onMount(): Promise<void> {
    const label = this.i18n.t('tray.screenshot');
    await registerTrayItem({
      id: 'screenshot',
      text: label,
      action: async () => {
        logger.info('Screenshot menu item clicked');
        await this.startScreenshot();
      },
    });
    logger.info('Screenshot tray item registered');
  }

  async onUnmount(): Promise<void> {
    await unRegisterTrayItem('screenshot');
    logger.info('Screenshot tray item unregistered');
  }
}

const screenshotPlugin = new ScreenshotPlugin();
export default screenshotPlugin;
