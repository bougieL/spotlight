import type { SearchResultItem, SearchParams, PluginActions, ActionContext } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { registerTranslations, useI18n } from '@spotlight/i18n';
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
  private readonly i18n = useI18n();

  get name(): string {
    return this.i18n.t('qrcode.name');
  }
  get description(): string | undefined {
    return this.i18n.t('qrcode.description');
  }
  iconUrl = qrcodeIconUrl;
  pluginId = 'qrcode-plugin';
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

  getPanelRoutes() {
    return [
      { name: 'main', componentLoader: () => import('./components/QrCodePanel.vue') },
    ];
  }
}

const qrcodePlugin = new QrCodePlugin();
export default qrcodePlugin;
