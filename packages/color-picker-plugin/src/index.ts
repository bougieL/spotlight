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

const colorPickerIconUrl = new URL('./assets/color-picker.svg', import.meta.url).href;

const ACTION_PICK = 'pick';
const OVERLAY_WINDOW_LABEL = 'color-picker-overlay';

export class ColorPickerPlugin extends BasePlugin {
  get name(): string {
    return translations[getLocale()]['colorPicker'] ?? 'Color Picker';
  }
  get description(): string | undefined {
    return translations[getLocale()]['plugin.description.colorPicker'];
  }
  pluginId = 'color-picker-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  registerAction(): PluginActions {
    return {
      [ACTION_PICK]: async () => {
        await this.startColorPicker();
      },
    };
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim().toLowerCase();
    const keywords = ['color', 'picker', 'colour', '取色', '颜色'];

    const isKeywordMatch = keywords.some(
      (kw) => kw.toLowerCase().includes(query) || query.includes(kw.toLowerCase())
    );

    if (isKeywordMatch) {
      return [
        {
          iconUrl: colorPickerIconUrl,
          title: this.name,
          score: 900,
          pluginId: this.pluginId,
          actionId: ACTION_PICK,
          actionData: null,
        },
      ];
    }

    return [];
  }

  async startColorPicker(): Promise<void> {
    try {
      const publicUrl = this.getPublicUrl('color-picker.html');
      const url = import.meta.env.DEV
        ? `http://localhost:1420${publicUrl}`
        : `asset://localhost${publicUrl}`;
      await tauriApi.createOverlayWindow(url, OVERLAY_WINDOW_LABEL);
      logger.info('Color picker started');
    } catch (error) {
      logger.error('Failed to start color picker:', error);
    }
  }
}

export const colorPickerPlugin = new ColorPickerPlugin();
