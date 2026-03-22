import { Clock } from 'lucide-vue-next';
import { defineAsyncComponent } from 'vue';
import type { Component } from 'vue';
import type { SearchResultItem, SearchResultItemContext, SearchParams, RenderParams } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { registerTranslations, translations, getLocale } from '@spotlight/i18n';
import { createPluginStorage, type PluginStorage } from '@spotlight/api';
import { pluginRegistry } from '@spotlight/plugin-registry';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const STORAGE_KEY = 'recent_items';
const PLUGIN_NAME = 'recent';
const MAX_RECENT_ITEMS = 10;

export interface RecentItem {
  id: string;
  title: string;
  desc?: string;
  iconUrl?: string;
  sourcePlugin: string;
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
  name = PLUGIN_NAME;
  version = '1.0.0';
  description = 'Recent items tracker';
  author = 'Spotlight Team';

  private storage: PluginStorage = createPluginStorage(PLUGIN_NAME);

  async getData(): Promise<RecentData> {
    const data = await this.storage.get<RecentData>(STORAGE_KEY, { items: [] });
    return data;
  }

  async saveData(data: RecentData): Promise<void> {
    await this.storage.set(STORAGE_KEY, data);
  }

  async recordSelection(params: {
    item: Omit<RecentItem, 'id' | 'timestamp' | 'sourcePlugin' | 'actionId' | 'actionData'>;
    sourcePlugin: string;
    actionId: string;
    actionData: unknown;
  }): Promise<void> {
    const { item, sourcePlugin, actionId, actionData } = params;
    const data = await this.getData();

    const existingIndex = data.items.findIndex(i => i.title === item.title);
    if (existingIndex !== -1) {
      data.items.splice(existingIndex, 1);
    }

    const newItem: RecentItem = {
      ...item,
      id: generateId(),
      timestamp: Date.now(),
      sourcePlugin,
      actionId,
      actionData,
    };

    data.items.unshift(newItem);

    if (data.items.length > MAX_RECENT_ITEMS) {
      data.items = data.items.slice(0, MAX_RECENT_ITEMS);
    }

    await this.saveData(data);
  }

  async clearItems(): Promise<void> {
    await this.saveData({ items: [] });
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim();

    if (query.length > 0) {
      const keywords = ['recent', 'recently', '最近', '最近使用'];
      const isKeywordMatch = keywords.some(
        kw => kw.includes(query.toLowerCase()) || query.toLowerCase().includes(kw)
      );
      if (!isKeywordMatch) {
        return [];
      }
    }

    const data = await this.getData();
    const items = data.items;

    if (items.length === 0) {
      return [
        {
          icon: Clock,
          title: translations[getLocale()]['recent'] ?? 'Recent',
          desc: translations[getLocale()]['recent.empty'] ?? 'No recent items',
          score: 900,
          action: async () => {},
        },
      ];
    }

    return items.map((item): SearchResultItem => {
      const IconComponent = item.iconUrl ? undefined : Clock;
      return {
        icon: IconComponent as Component,
        iconUrl: item.iconUrl,
        title: item.title,
        desc: item.desc,
        score: 1000 - (Date.now() - item.timestamp) / 100000,
        action: async (ctx: SearchResultItemContext) => {
          await pluginRegistry.executeAction({
            sourcePlugin: item.sourcePlugin,
            actionId: item.actionId,
            data: item.actionData,
            ctx,
          });
        },
      };
    });
  }

  async render(_params: RenderParams): Promise<Component | null> {
    return defineAsyncComponent(() => import('./components/RecentPanel.vue'));
  }
}

export const recentPlugin = new RecentPlugin();
