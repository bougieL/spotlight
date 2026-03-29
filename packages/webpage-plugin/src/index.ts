import type { Component } from 'vue';
import type { SearchResultItem, SearchParams, PluginActions, ActionContext } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { createPluginStorage, type PluginStorage } from '@spotlight/api';
import { registerTranslations, translations, getLocale } from '@spotlight/i18n';
import { normalizeForSearch, toPinyinInitials, matchKeyword } from '@spotlight/utils/pinyin';
import logger from '@spotlight/logger';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const webpageIconUrl = new URL('./assets/webpage.svg', import.meta.url).href;

export interface WebpageItem {
  id: string;
  name: string;
  url: string;
}

const STORAGE_KEY = 'webpages';
const ACTION_OPEN = 'open';
const ACTION_OPEN_WEBPAGE = 'open_webpage';

export class WebpagePlugin extends BasePlugin {
  get name(): string {
    return translations[getLocale()]['webpage'] ?? 'Webpages';
  }

  get description(): string | undefined {
    return translations[getLocale()]['plugin.description.webpage'];
  }

  iconUrl = webpageIconUrl;
  pluginId = 'webpage-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  private storage: PluginStorage = createPluginStorage(this.pluginId);

  registerAction(ctx: ActionContext): PluginActions {
    return {
      [ACTION_OPEN]: async () => {
        ctx.navigateToPlugin(this.pluginId);
      },
      [ACTION_OPEN_WEBPAGE]: async (data) => {
        if (!data || typeof data !== 'object') return;
        const item = data as WebpageItem;
        if (!item.url) return;
        logger.info(`Opening webpage: ${item.name} (${item.url})`);
        ctx.navigateToPlugin(this.pluginId);
      },
    };
  }

  async getWebpages(): Promise<WebpageItem[]> {
    const stored = await this.storage.get<WebpageItem[]>(STORAGE_KEY, []);
    if (Array.isArray(stored)) {
      return stored;
    }
    return [];
  }

  async saveWebpages(webpages: WebpageItem[]): Promise<void> {
    await this.storage.set(STORAGE_KEY, webpages);
  }

  async addWebpage(name: string, url: string): Promise<WebpageItem> {
    const webpages = await this.getWebpages();
    const newItem: WebpageItem = {
      id: crypto.randomUUID(),
      name: name.trim(),
      url: this.normalizeUrl(url.trim()),
    };
    webpages.push(newItem);
    await this.saveWebpages(webpages);
    logger.info(`Webpage added: ${newItem.name}`);
    return newItem;
  }

  async updateWebpage(id: string, updates: { name?: string; url?: string }): Promise<void> {
    const webpages = await this.getWebpages();
    const index = webpages.findIndex((w) => w.id === id);
    if (index !== -1) {
      if (updates.name !== undefined) {
        webpages[index].name = updates.name.trim();
      }
      if (updates.url !== undefined) {
        webpages[index].url = this.normalizeUrl(updates.url.trim());
      }
      await this.saveWebpages(webpages);
      logger.info(`Webpage updated: ${webpages[index].name}`);
    }
  }

  async deleteWebpage(id: string): Promise<void> {
    const webpages = await this.getWebpages();
    const filtered = webpages.filter((w) => w.id !== id);
    await this.saveWebpages(filtered);
    logger.info(`Webpage deleted, remaining: ${filtered.length}`);
  }

  private normalizeUrl(url: string): string {
    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = 'https://' + normalized;
    }
    return normalized;
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim();
    if (!query) {
      return [];
    }

    const keywords = [
      { keyword: 'webpage', normalized: normalizeForSearch('webpage') },
      { keyword: 'web', normalized: normalizeForSearch('web') },
      { keyword: '网页', normalized: normalizeForSearch('网页'), pinyinInitials: toPinyinInitials('网页') },
      { keyword: 'website', normalized: normalizeForSearch('website') },
      { keyword: 'open', normalized: normalizeForSearch('open') },
      { keyword: '打开', normalized: normalizeForSearch('打开'), pinyinInitials: toPinyinInitials('打开') },
    ];

    const isTriggered = matchKeyword(query, keywords);
    const webpages = await this.getWebpages();

    if (isTriggered) {
      return [
        {
          iconUrl: webpageIconUrl,
          title: this.name,
          score: 900,
          pluginId: this.pluginId,
          actionId: ACTION_OPEN,
          actionData: null,
        },
      ];
    }

    if (webpages.length === 0) {
      return [];
    }

    const normalizedQuery = normalizeForSearch(query);
    const queryPinyinInitials = toPinyinInitials(query);

    const results: SearchResultItem[] = [];

    for (const webpage of webpages) {
      const nameNormalized = normalizeForSearch(webpage.name);
      const namePinyinInitials = toPinyinInitials(webpage.name);

      let score = 0;

      if (nameNormalized === normalizedQuery) {
        score = 1000;
      } else if (nameNormalized.startsWith(normalizedQuery)) {
        score = 900;
      } else if (nameNormalized.includes(normalizedQuery)) {
        score = 800;
      } else if (
        namePinyinInitials &&
        (namePinyinInitials.startsWith(queryPinyinInitials) || namePinyinInitials.includes(queryPinyinInitials))
      ) {
        score = 700;
      }

      if (score > 0) {
        results.push({
          iconUrl: webpageIconUrl,
          title: webpage.name,
          desc: webpage.url,
          score,
          pluginId: this.pluginId,
          actionId: ACTION_OPEN_WEBPAGE,
          actionData: webpage,
        });
      }
    }

    return results;
  }

  getPanelComponentLoader(): () => Promise<Component> {
    return () => import('./components/WebpagePanel.vue');
  }
}

export const webpagePlugin = new WebpagePlugin();
