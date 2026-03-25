import type { Component } from 'vue';
import type { SearchResultItem, SearchResultItemContext, SearchParams, RenderParams } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { tauriApi } from '@spotlight/api';
import { pluginRegistry } from '@spotlight/plugin-registry';
import { toPinyin, toPinyinInitials, normalizeForSearch, fuzzyMatch } from '@spotlight/utils/pinyin';
import { registerTranslations, translations, getLocale } from '@spotlight/i18n';
import logger from '@spotlight/logger';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

const chromeIconUrl = new URL('./assets/chrome-icon.svg', import.meta.url).href;

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const ACTION_OPEN = 'open';
const ACTION_COPY_URL = 'copy-url';

const URL_PATTERN = /^https?:\/\//i;

export interface ChromeBookmark {
  id: string;
  name: string;
  url: string;
  profile: string;
  folder_path: string[];
}

interface CachedBookmark {
  bookmark: ChromeBookmark;
  normalizedName: string;
  searchTerms: string[];
  pinyin: string;
  initials: string;
}

function isUrl(input: string): boolean {
  return URL_PATTERN.test(input.trim());
}

export class ChromeBookmarksPlugin extends BasePlugin {
  get name(): string {
    return translations[getLocale()]['plugin.chrome-bookmarks'] ?? 'Chrome Bookmarks';
  }
  get description(): string | undefined {
    return translations[getLocale()]['plugin.description.chromeBookmarks'];
  }
  pluginId = 'chrome-bookmarks-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  private cachedBookmarks: CachedBookmark[] = [];
  private cacheLoaded = false;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    super();
    this.registerActions();
  }

  private registerActions(): void {
    pluginRegistry.registerAction({
      pluginId: this.pluginId,
      actionId: ACTION_OPEN,
      handler: async (data, _ctx) => {
        logger.info(`[ChromeBookmarksPlugin] Open handler called with data: ${data}`);
        if (typeof data !== 'string') {
          logger.warn('[ChromeBookmarksPlugin] Data is not a string');
          return;
        }
        await this.openUrl(data);
      },
    });

    pluginRegistry.registerAction({
      pluginId: this.pluginId,
      actionId: ACTION_COPY_URL,
      handler: async (data, _ctx) => {
        logger.info(`[ChromeBookmarksPlugin] Copy URL handler called with data: ${data}`);
        if (typeof data !== 'string') {
          logger.warn('[ChromeBookmarksPlugin] Data is not a string');
          return;
        }
        await this.copyUrl(data);
      },
    });
  }

  private async loadBookmarks(): Promise<CachedBookmark[]> {
    const now = Date.now();
    if (this.cacheLoaded && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.cachedBookmarks;
    }

    try {
      const bookmarks = await tauriApi.getChromeBookmarks();
      logger.info(`[ChromeBookmarksPlugin] Loaded ${bookmarks.length} bookmarks`);

      this.cachedBookmarks = bookmarks.map((bookmark) => {
        const normalizedName = normalizeForSearch(bookmark.name);
        const pinyin = toPinyin(bookmark.name).toLowerCase();
        const initials = toPinyinInitials(bookmark.name).toLowerCase();
        const searchTerms: string[] = [normalizedName, bookmark.url.toLowerCase()];

        return {
          bookmark,
          normalizedName,
          searchTerms,
          pinyin,
          initials,
        };
      });

      this.cacheLoaded = true;
      this.cacheTimestamp = now;
    } catch (error) {
      logger.error('[ChromeBookmarksPlugin] Failed to load bookmarks:', error);
      this.cachedBookmarks = [];
      this.cacheLoaded = true;
      this.cacheTimestamp = now;
    }

    return this.cachedBookmarks;
  }

  private async openUrl(url: string): Promise<void> {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
    } catch (error) {
      logger.error('[ChromeBookmarksPlugin] Failed to open URL:', error);
    }
  }

  private async copyUrl(url: string): Promise<void> {
    try {
      await tauriApi.setClipboardText(url);
    } catch (error) {
      logger.error('[ChromeBookmarksPlugin] Failed to copy URL:', error);
    }
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim();
    const limit = params.limit ?? 10;

    // If query looks like a URL, try to open it directly
    if (isUrl(query)) {
      const locale = getLocale();
      return [{
        title: query,
        desc: translations[locale]?.['plugin.chrome-bookmarks.open'] ?? 'Open in Chrome',
        iconUrl: chromeIconUrl,
        sourcePlugin: this.pluginId,
        actionId: ACTION_OPEN,
        actionData: query,
        action: async (_ctx: SearchResultItemContext) => this.openUrl(query),
      }];
    }

    const bookmarks = await this.loadBookmarks();
    const lowerQuery = query.toLowerCase();
    const queryPinyin = toPinyin(query).toLowerCase();
    const queryInitials = toPinyinInitials(query).toLowerCase();

    if (!lowerQuery) {
      return bookmarks.slice(0, limit).map((cb) => ({
        title: cb.bookmark.name,
        desc: cb.bookmark.url,
        iconUrl: chromeIconUrl,
        sourcePlugin: this.pluginId,
        actionId: ACTION_OPEN,
        actionData: cb.bookmark.url,
        action: async (_ctx: SearchResultItemContext) => this.openUrl(cb.bookmark.url),
      }));
    }

    const scored: Array<{ bookmark: CachedBookmark; score: number }> = [];

    for (const cb of bookmarks) {
      const name = cb.bookmark.name.toLowerCase();
      const url = cb.bookmark.url.toLowerCase();
      let score = -1;

      // Exact name or URL match
      if (name === lowerQuery || url === lowerQuery) {
        score = 1000;
      } else if (name.startsWith(lowerQuery)) {
        score = 900;
      } else if (url.startsWith(lowerQuery)) {
        score = 850;
      } else if (name.includes(lowerQuery)) {
        score = 800;
      } else if (url.includes(lowerQuery)) {
        score = 750;
      }

      // Fuzzy match on name
      if (score < 0) {
        const fuzzyScore = fuzzyMatch(query, cb.bookmark.name);
        if (fuzzyScore > 0) {
          score = 700 + fuzzyScore;
        }
      }

      // Pinyin match
      if (score < 0) {
        for (const term of cb.searchTerms) {
          if (term.includes(queryPinyin)) {
            score = 600;
            break;
          }
        }
      }

      // Pinyin contains query
      if (score < 0) {
        if (cb.pinyin.includes(queryPinyin)) {
          score = 500;
        }
      }

      // Initials start match
      if (score < 0) {
        if (cb.initials.startsWith(queryInitials)) {
          score = 400;
        } else if (cb.initials.includes(queryInitials)) {
          score = 300;
        }
      }

      // Fuzzy initials match
      if (score < 0) {
        const pinyinFuzzy = fuzzyMatch(queryInitials, cb.initials);
        if (pinyinFuzzy > 0) {
          score = 200 + pinyinFuzzy;
        }
      }

      if (score > 0) {
        scored.push({ bookmark: cb, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(({ bookmark: cb, score }) => ({
      title: cb.bookmark.name,
      desc: `${cb.bookmark.folder_path.join(' > ')} (${cb.bookmark.profile})`,
      score,
      iconUrl: chromeIconUrl,
      sourcePlugin: this.pluginId,
      actionId: ACTION_OPEN,
      actionData: cb.bookmark.url,
      action: async (_ctx: SearchResultItemContext) => this.openUrl(cb.bookmark.url),
    }));
  }

  async render(_params: RenderParams): Promise<Component | null> {
    return null;
  }
}

export const chromeBookmarksPlugin = new ChromeBookmarksPlugin();
