import { Pipette } from 'lucide-vue-next';
import type { Component } from 'vue';
import type { SearchResultItem, SearchParams, RenderParams } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { pluginRegistry } from '@spotlight/plugin-registry';
import { registerTranslations, translations, getLocale } from '@spotlight/i18n';
import { tauriApi } from '@spotlight/api';
import logger from '@spotlight/logger';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const PLUGIN_NAME = 'color-picker';
const ACTION_PICK = 'pick';
const OVERLAY_WINDOW_LABEL = 'color-picker-overlay';

const getOverlayUrl = (): string => {
  if (import.meta.env.DEV) {
    return 'http://localhost:1420/plugins/color-picker-plugin/color-picker.html';
  }
  // Production: use asset protocol
  return 'asset://localhost/plugins/color-picker-plugin/color-picker.html';
};

export class ColorPickerPlugin extends BasePlugin {
  name = PLUGIN_NAME;
  version = '1.0.0';
  description = 'Pick colors from screen';
  author = 'Spotlight Team';

  constructor() {
    super();
    pluginRegistry.registerAction({
      pluginName: PLUGIN_NAME,
      actionId: ACTION_PICK,
      handler: async () => {
        await this.startColorPicker();
      },
    });
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
          icon: Pipette,
          iconComponentName: 'Pipette',
          title: translations[getLocale()]['colorPicker'] ?? 'Color Picker',
          score: 900,
          sourcePlugin: PLUGIN_NAME,
          actionId: ACTION_PICK,
          actionData: null,
          action: async () => {
            await this.startColorPicker();
          },
        },
      ];
    }

    return [];
  }

  async render(_params: RenderParams): Promise<Component | null> {
    return null;
  }

  async startColorPicker(): Promise<void> {
    try {
      await tauriApi.createOverlayWindow(getOverlayUrl(), OVERLAY_WINDOW_LABEL);
      logger.info('Color picker started');
    } catch (error) {
      logger.error('Failed to start color picker:', error);
    }
  }
}

export const colorPickerPlugin = new ColorPickerPlugin();
