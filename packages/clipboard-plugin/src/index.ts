import type { SearchResultItem, SearchParams, PluginActions, ActionContext } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { registerTranslations, useI18n } from '@spotlight/i18n';
import { createPluginStorage, type PluginStorage, tauriApi, on, type UnlistenFn } from '@spotlight/api';
import { normalizeForSearch, toPinyinInitials, matchKeyword } from '@spotlight/utils/pinyin';
import logger from '@spotlight/logger';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const clipboardIconUrl = new URL('./assets/clipboard.svg', import.meta.url).href;

const STORAGE_KEY = 'clipboard_data';
const ACTION_OPEN = 'open';
const MAX_ITEMS = 50;

export type ClipboardItemType = 'text' | 'image' | 'files';

export interface ClipboardItem {
  id: string;
  type: ClipboardItemType;
  content: string;
  timestamp: number;
  favorite?: boolean;
}

export interface ClipboardData {
  items: ClipboardItem[];
  favorites: ClipboardItem[];
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export class ClipboardPlugin extends BasePlugin {
  private readonly i18n = useI18n();

  get name(): string {
    return this.i18n.t('clipboard.name');
  }
  get description(): string | undefined {
    return this.i18n.t('clipboard.description');
  }
  iconUrl = clipboardIconUrl;
  pluginId = 'clipboard-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  private storage: PluginStorage = createPluginStorage(this.pluginId);
  private unlisten: UnlistenFn | null = null;
  private monitoring = false;

  onMount(): void {
    this.startMonitoring().catch((err: unknown) => {
      logger.error('Failed to start clipboard monitoring:', err);
    });
  }

  onUnmount?(): void {
    this.stopMonitoring();
  }

  registerAction(ctx: ActionContext): PluginActions {
    return {
      [ACTION_OPEN]: async () => {
        ctx.navigateToPlugin(this.pluginId);
      },
    };
  }

  async getData(): Promise<ClipboardData> {
    const data = await this.storage.get<ClipboardData>(STORAGE_KEY, { items: [], favorites: [] });
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
      const favoriteContents = new Set(data.favorites.map(f => f.content));
      let nonFavoriteCount = 0;
      data.items = data.items.filter(item => {
        if (favoriteContents.has(item.content)) {
          return true;
        }
        nonFavoriteCount++;
        return nonFavoriteCount <= MAX_ITEMS;
      });
    }

    await this.saveData(data);
  }

  async clearItems(): Promise<void> {
    const data = await this.getData();
    await this.saveData({ items: [], favorites: data.favorites });
  }

  async toggleFavorite(item: ClipboardItem): Promise<void> {
    const data = await this.getData();
    const existingIndex = data.favorites.findIndex(f => f.content === item.content);

    if (existingIndex !== -1) {
      data.favorites.splice(existingIndex, 1);
    } else {
      data.favorites.unshift({ ...item, favorite: true, timestamp: Date.now() });
    }

    await this.saveData(data);
  }

  async isFavorite(content: string): Promise<boolean> {
    const data = await this.getData();
    return data.favorites.some(f => f.content === content);
  }

  async startMonitoring(): Promise<void> {
    if (this.monitoring) return;

    this.monitoring = true;

    this.unlisten = await on.clipboardChanged(async () => {
      try {
        await this.checkClipboard();
      } catch (error) {
        logger.error('Clipboard check error:', error);
      }
    });

    await tauriApi.startClipboardMonitor();
  }

  async stopMonitoring(): Promise<void> {
    if (!this.monitoring) return;

    this.monitoring = false;

    await tauriApi.stopClipboardMonitor();

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
      } else if (item.type === 'image') {
        await tauriApi.setClipboardImage(item.content);
      } else if (item.type === 'files') {
        const files = item.content.split('\n').filter(f => f.trim());
        await tauriApi.setClipboardFiles(files);
      }
    } catch (error) {
      logger.error('Failed to copy to clipboard:', error);
    }
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim().toLowerCase();

    const keywords = [
      { keyword: 'clipboard', normalized: normalizeForSearch('clipboard') },
      { keyword: 'copy', normalized: normalizeForSearch('copy') },
      { keyword: 'paste', normalized: normalizeForSearch('paste') },
      { keyword: '剪贴板', normalized: normalizeForSearch('剪贴板'), pinyinInitials: toPinyinInitials('剪贴板') },
      { keyword: '粘贴', normalized: normalizeForSearch('粘贴'), pinyinInitials: toPinyinInitials('粘贴') },
    ];

    if (!matchKeyword(query, keywords) && query.length > 0) {
      return [];
    }

    return [
      {
        iconUrl: clipboardIconUrl,
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
      { name: 'main', componentLoader: () => import('./components/ClipboardPanel.vue') },
    ];
  }
}

export const clipboardPlugin = new ClipboardPlugin();
