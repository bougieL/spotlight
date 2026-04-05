import type { SearchResultItem, SearchParams, PluginActions, ActionContext } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { registerTranslations, useI18n } from '@spotlight/i18n';
import { createPluginStorage, type PluginStorage, createChildWebview, closeChildWebview } from '@spotlight/api';
import { normalizeForSearch, toPinyinInitials, matchKeyword } from '@spotlight/utils/pinyin';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const webOpenIconUrl = new URL('./assets/web-open.svg', import.meta.url).href;

const ACTION_OPEN = 'open';

const STORAGE_KEYS = {
  recentUrls: 'recentUrls',
} as const;

const MAX_RECENT_URLS = 10;

export class WebOpenPlugin extends BasePlugin {
  private readonly i18n = useI18n();
  iconUrl = webOpenIconUrl;
  pluginId = 'web-open-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  get name(): string {
    return this.i18n.t('webOpen.name');
  }
  get description(): string | undefined {
    return this.i18n.t('webOpen.description');
  }

  private storage: PluginStorage = createPluginStorage(this.pluginId);

  registerAction(ctx: ActionContext): PluginActions {
    return {
      [ACTION_OPEN]: async () => {
        ctx.navigateToPlugin(this.pluginId);
      },
    };
  }

  async getRecentUrls(): Promise<string[]> {
    return this.storage.get<string[]>(STORAGE_KEYS.recentUrls, []);
  }

  async addRecentUrl(url: string): Promise<void> {
    const urls = await this.getRecentUrls();
    const filtered = urls.filter((u) => u !== url);
    const updated = [url, ...filtered].slice(0, MAX_RECENT_URLS);
    await this.storage.set(STORAGE_KEYS.recentUrls, updated);
  }

  async clearRecentUrls(): Promise<void> {
    await this.storage.set(STORAGE_KEYS.recentUrls, []);
  }

  async openUrl(
    url: string,
    options: { x: number; y: number; width: number; height: number; parentLabel: string }
  ): Promise<string> {
    const label = `webview-${Date.now()}`;
    await createChildWebview(url, label, options);
    return label;
  }

  async closeUrl(label: string): Promise<void> {
    await closeChildWebview(label);
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim().toLowerCase();

    const keywords = [
      { keyword: 'web', normalized: normalizeForSearch('web') },
      { keyword: 'open', normalized: normalizeForSearch('open') },
      { keyword: 'url', normalized: normalizeForSearch('url') },
      { keyword: 'http', normalized: normalizeForSearch('http') },
      { keyword: '网页', normalized: normalizeForSearch('网页'), pinyinInitials: toPinyinInitials('网页') },
      { keyword: '打开', normalized: normalizeForSearch('打开'), pinyinInitials: toPinyinInitials('打开') },
    ];

    if (query.length > 0 && !matchKeyword(query, keywords)) {
      return [];
    }

    return [
      {
        iconUrl: webOpenIconUrl,
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
      { name: 'main', componentLoader: () => import('./components/WebOpenPanel.vue') },
      { name: 'view', componentLoader: () => import('./components/WebViewPage.vue') },
    ];
  }
}

export const webOpenPlugin = new WebOpenPlugin();
