import { Clipboard } from 'lucide-vue-next';
import { defineAsyncComponent } from 'vue';
import type { Component } from 'vue';
import type { SearchResultItem, SearchResultItemContext, SearchParams, RenderParams } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { registerTranslations, translations, getLocale } from '@spotlight/i18n';
import { createPluginStorage, type PluginStorage, tauriApi } from '@spotlight/api';
import { pluginRegistry } from '@spotlight/plugin-registry';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import logger from '@spotlight/logger';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const STORAGE_KEY = 'clipboard_data';
const PLUGIN_NAME = 'clipboard';
const ACTION_OPEN = 'open';
const MAX_ITEMS = 50;

export type ClipboardItemType = 'text' | 'image' | 'files';

export interface ClipboardItem {
  id: string;
  type: ClipboardItemType;
  content: string;
  timestamp: number;
}

export interface ClipboardData {
  items: ClipboardItem[];
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export class ClipboardPlugin extends BasePlugin {
  name = PLUGIN_NAME;
  version = '1.0.0';
  description = 'Clipboard history manager';
  author = 'Spotlight Team';

  private storage: PluginStorage = createPluginStorage(PLUGIN_NAME);
  private unlisten: UnlistenFn | null = null;
  private monitoring = false;

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

    this.startMonitoring().catch((err: unknown) => {
      logger.error('Failed to start clipboard monitoring:', err);
    });
  }

  async getData(): Promise<ClipboardData> {
    const data = await this.storage.get<ClipboardData>(STORAGE_KEY, { items: [] });
    return data;
  }

  async saveData(data: ClipboardData): Promise<void> {
    await this.storage.set(STORAGE_KEY, data);
  }

  async addItem(type: ClipboardItemType, content: string): Promise<void> {
    const data = await this.getData();

    const existingIndex = data.items.findIndex(item => item.content === content);
    if (existingIndex !== -1) {
      data.items.splice(existingIndex, 1);
    }

    const newItem: ClipboardItem = {
      id: generateId(),
      type,
      content,
      timestamp: Date.now(),
    };

    data.items.unshift(newItem);

    if (data.items.length > MAX_ITEMS) {
      data.items = data.items.slice(0, MAX_ITEMS);
    }

    await this.saveData(data);
  }

  async clearItems(): Promise<void> {
    await this.saveData({ items: [] });
  }

  async startMonitoring(): Promise<void> {
    if (this.monitoring) return;

    this.monitoring = true;

    this.unlisten = await listen('clipboard-changed', async () => {
      try {
        await this.checkClipboard();
      } catch (error) {
        logger.error('Clipboard check error:', error);
      }
    });

    await invoke('start_clipboard_monitor');
  }

  async stopMonitoring(): Promise<void> {
    if (!this.monitoring) return;

    this.monitoring = false;

    await invoke('stop_clipboard_monitor');

    if (this.unlisten) {
      this.unlisten();
      this.unlisten = null;
    }
  }

  private async checkClipboard(): Promise<void> {
    try {
      const text = await tauriApi.getClipboardText();
      if (text && text.trim()) {
        const data = await this.getData();
        const lastItem = data.items[0];
        if (!lastItem || lastItem.content !== text) {
          await this.addItem('text', text);
        }
      }
    } catch (_error) {
      // Ignore clipboard read errors
    }

    try {
      const files = await tauriApi.getClipboardFilePaths();
      if (files.length > 0) {
        const content = files.join('\n');
        const data = await this.getData();
        const lastItem = data.items[0];
        if (!lastItem || lastItem.content !== content) {
          await this.addItem('files', content);
        }
      }
    } catch (_error) {
      // Ignore clipboard read errors
    }

    try {
      const imageData = await tauriApi.getClipboardImage();
      if (imageData) {
        const data = await this.getData();
        const lastItem = data.items[0];
        if (!lastItem || lastItem.content !== imageData) {
          await this.addItem('image', imageData);
        }
      }
    } catch (_error) {
      // Ignore clipboard read errors
    }
  }

  async copyToClipboard(item: ClipboardItem): Promise<void> {
    try {
      if (item.type === 'text') {
        await tauriApi.setClipboardText(item.content);
      } else if (item.type === 'files') {
        logger.warn('File copy not implemented');
      }
    } catch (error) {
      logger.error('Failed to copy to clipboard:', error);
    }
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim().toLowerCase();

    const keywords = ['clipboard', 'copy', '粘贴', '剪贴板'];

    const isKeywordMatch = keywords.some(
      kw => kw.includes(query) || query.includes(kw)
    );

    if (!isKeywordMatch && query.length > 0) {
      return [];
    }

    return [
      {
        icon: Clipboard,
        iconComponentName: 'Clipboard',
        title: translations[getLocale()]['clipboard'] ?? 'Clipboard',
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
    return defineAsyncComponent(() => import('./components/ClipboardPanel.vue'));
  }
}

export const clipboardPlugin = new ClipboardPlugin();
