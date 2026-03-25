import { defineAsyncComponent, type Component } from 'vue';
import type { SearchResultItem, SearchParams, RenderParams } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { registerTranslations, translations, getLocale } from '@spotlight/i18n';
import { createPluginStorage, type PluginStorage } from '@spotlight/api';
import { formatTime } from '@spotlight/utils';
import { normalizeForSearch, toPinyinInitials, matchKeyword } from '@spotlight/utils/pinyin';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const recentIconUrl = new URL('./assets/clock.svg', import.meta.url).href;

const STORAGE_KEY = 'recent_items';
const MAX_RECENT_ITEMS = 10;

export interface RecentItem {
  id: string;
  title: string;
  desc?: string;
  iconUrl?: string;
  pluginId: string;
  actionId: string;
  actionData: unknown;
  timestamp: number;
}

export interface RecentData {
  items: RecentItem[];
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export class RecentPlugin extends BasePlugin {
  get name(): string {
    return translations[getLocale()]['recent'] ?? 'Recent';
  }
  get description(): string | undefined {
    return translations[getLocale()]['plugin.description.recent'];
  }
  pluginId = 'recent-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  private storage: PluginStorage = createPluginStorage(this.pluginId);

  registerAction() {
    return {};
  }

  async getData(): Promise<RecentData> {
    const data = await this.storage.get<RecentData>(STORAGE_KEY, { items: [] });
    return data;
  }

  async saveData(data: RecentData): Promise<void> {
    await this.storage.set(STORAGE_KEY, data);
  }

  async recordSelection(params: {
    item: Pick<RecentItem, 'title' | 'desc' | 'iconUrl'>;
    pluginId: string;
    actionId: string;
    actionData: unknown;
  }): Promise<void> {
    const { item, pluginId, actionId, actionData } = params;
    const data = await this.getData();

    const filteredItems = data.items.filter(i => i.title !== item.title);

    const newItem: RecentItem = {
      ...item,
      id: generateId(),
      timestamp: Date.now(),
      pluginId,
      actionId,
      actionData,
    };

    const newItems = [newItem, ...filteredItems].slice(0, MAX_RECENT_ITEMS);

    await this.saveData({ items: newItems });
  }

  async clearItems(): Promise<void> {
    await this.saveData({ items: [] });
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim();

    if (query.length > 0) {
      const keywords = [
        { keyword: 'recent', normalized: normalizeForSearch('recent') },
        { keyword: 'recently', normalized: normalizeForSearch('recently') },
        { keyword: '最近', normalized: normalizeForSearch('最近'), pinyinInitials: toPinyinInitials('最近') },
        { keyword: '最近使用', normalized: normalizeForSearch('最近使用'), pinyinInitials: toPinyinInitials('最近使用') },
      ];

      if (!matchKeyword(query.toLowerCase(), keywords)) {
        return [];
      }
    }

    const data = await this.getData();
    const items = data.items;

    if (items.length === 0) {
      return [
        {
          iconUrl: recentIconUrl,
          title: this.name,
          desc: translations[getLocale()]['recent.empty'] ?? 'No recent items',
          score: 900,
          pluginId: this.pluginId,
          actionId: 'noop',
          actionData: null,
        },
      ];
    }

    return items.map((item): SearchResultItem => {
      return {
        iconUrl: item.iconUrl,
        title: item.title,
        desc: item.desc || formatTime(item.timestamp),
        score: 1000 - (Date.now() - item.timestamp) / 100000,
        pluginId: item.pluginId,
        actionId: item.actionId,
        actionData: item.actionData,
      };
    });
  }

  async render(_params: RenderParams): Promise<Component | null> {
    return defineAsyncComponent(() => import('./components/RecentPanel.vue'));
  }
}

export const recentPlugin = new RecentPlugin();
