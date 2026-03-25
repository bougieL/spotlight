import { defineAsyncComponent } from 'vue';
import type { Component } from 'vue';
import type { SearchResultItem, SearchParams, RenderParams, PluginActions } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { registerTranslations, translations, getLocale } from '@spotlight/i18n';
import { normalizeForSearch, toPinyinInitials, matchKeyword } from '@spotlight/utils/pinyin';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const qrcodeIconUrl = new URL('./assets/qrcode.svg', import.meta.url).href;

const ACTION_OPEN = 'open';

export class QrCodePlugin extends BasePlugin {
  get name(): string {
    return translations[getLocale()]['qrcode'] ?? 'QR Code';
  }
  get description(): string | undefined {
    return translations[getLocale()]['plugin.description.qrcode'];
  }
  pluginId = 'qrcode-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  registerAction(): PluginActions {
    return {
      [ACTION_OPEN]: async (_data, ctx) => {
        const component = await this.render({ query: '' });
        if (component) {
          ctx.setPanel(component, this.name);
        }
      },
    };
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim().toLowerCase();

    const keywords = [
      { keyword: 'qr', normalized: normalizeForSearch('qr') },
      { keyword: 'qrcode', normalized: normalizeForSearch('qrcode') },
      { keyword: 'qr code', normalized: normalizeForSearch('qr code') },
      { keyword: '二维码', normalized: normalizeForSearch('二维码'), pinyinInitials: toPinyinInitials('二维码') },
    ];

    if (query.length > 0 && !matchKeyword(query, keywords)) {
      return [];
    }

    return [
      {
        iconUrl: qrcodeIconUrl,
        title: this.name,
        score: 900,
        pluginId: this.pluginId,
        actionId: ACTION_OPEN,
        actionData: null,
      },
    ];
  }

  async render(_params: RenderParams): Promise<Component | null> {
    return defineAsyncComponent(() => import('./components/QrCodePanel.vue'));
  }
}

export const qrcodePlugin = new QrCodePlugin();
