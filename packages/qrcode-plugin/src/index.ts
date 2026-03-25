import { defineAsyncComponent } from 'vue';
import type { Component } from 'vue';
import type { SearchResultItem, SearchResultItemContext, SearchParams, RenderParams } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { pluginRegistry } from '@spotlight/plugin-registry';
import { registerTranslations, translations, getLocale } from '@spotlight/i18n';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const qrcodeIconUrl = new URL('./assets/qr-code.svg', import.meta.url).href;

const PLUGIN_NAME = 'qrcode';
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
    const query = params.query.trim().toLowerCase();
    const keywords = ['qr', 'qrcode', 'qr code', '二维码', 'erweima'];

    const isKeywordMatch = keywords.some(
      (kw) => kw.includes(query) || query.includes(kw)
    );

    if (!isKeywordMatch && query.length > 0) {
      return [];
    }

    return [
      {
        iconUrl: qrcodeIconUrl,
        title: this.name,
        score: 900,
        sourcePlugin: PLUGIN_NAME,
        actionId: ACTION_OPEN,
        actionData: null,
        action: async (ctx: SearchResultItemContext) => {
          const component = await this.render({ query: params.query });
          if (component) {
            ctx.setPanel(component, this.name);
          }
        },
      },
    ];
  }

  async render(_params: RenderParams): Promise<Component | null> {
    return defineAsyncComponent(() => import('./components/QrCodePanel.vue'));
  }
}

export const qrcodePlugin = new QrCodePlugin();
