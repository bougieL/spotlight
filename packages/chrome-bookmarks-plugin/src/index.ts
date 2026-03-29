import type { SearchResultItem, SearchParams, PluginActions } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { tauriApi } from '@spotlight/api';
import { toPinyin, toPinyinInitials, normalizeForSearch, fuzzyMatch } from '@spotlight/utils/pinyin';
import { registerTranslations, useI18n } from '@spotlight/i18n';
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
const ACTION_SEARCH = 'search';

const URL_PATTERN = /^https?:\/\//i;

// Search engine configurations
interface SearchEngine {
  patterns: RegExp[];
  name: string;
  searchUrl: (query: string) => string;
  icon: string;
}

const SEARCH_ENGINES: SearchEngine[] = [
  {
    patterns: [/^google\s+/i, /^谷歌\s+/i],
    name: 'Google',
    searchUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    icon: 'google',
  },
  {
    patterns: [/^baidu\s+/i, /^百度\s+/i],
    name: 'Baidu',
    searchUrl: (q) => `https://www.baidu.com/s?wd=${encodeURIComponent(q)}`,
    icon: 'baidu',
  },
  {
    patterns: [/^github\s+/i, /^gh\s+/i],
    name: 'GitHub',
    searchUrl: (q) => `https://github.com/search?q=${encodeURIComponent(q)}`,
    icon: 'github',
  },
];

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

function matchSearchEngine(query: string): { engine: SearchEngine; searchQuery: string } | null {
  for (const engine of SEARCH_ENGINES) {
    for (const pattern of engine.patterns) {
      const match = query.match(pattern);
      if (match) {
        const searchQuery = query.slice(match[0].length);
        if (searchQuery.trim()) {
          return { engine, searchQuery: searchQuery.trim() };
        }
      }
    }
  }
  return null;
}

export class ChromeBookmarksPlugin extends BasePlugin {
  get name(): string {
    const { t } = useI18n();
    return t('plugin.chrome-bookmarks');
  }
  get description(): string | undefined {
    const { t } = useI18n();
    return t('plugin.description.chromeBookmarks');
  }
  iconUrl = chromeIconUrl;
  pluginId = 'chrome-bookmarks-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  private cachedBookmarks: CachedBookmark[] = [];
  private cacheLoaded = false;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  registerAction(): PluginActions {
    return {
      [ACTION_OPEN]: async (data) => {
        logger.info(`[ChromeBookmarksPlugin] Open handler called with data: ${data}`);
        if (typeof data !== 'string') {
          logger.warn('[ChromeBookmarksPlugin] Data is not a string');
          return;
        }
        await this.openUrl(data);
      },
      [ACTION_COPY_URL]: async (data) => {
        logger.info(`[ChromeBookmarksPlugin] Copy URL handler called with data: ${data}`);
        if (typeof data !== 'string') {
          logger.warn('[ChromeBookmarksPlugin] Data is not a string');
          return;
        }
        await this.copyUrl(data);
      },
      [ACTION_SEARCH]: async (data) => {
        logger.info(`[ChromeBookmarksPlugin] Search handler called with data: ${data}`);
        if (typeof data !== 'object' || data === null || !('url' in data)) {
          logger.warn('[ChromeBookmarksPlugin] Search data is invalid');
          return;
        }
        const { url } = data as { url: string };
        await this.openUrl(url);
      },
    };
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
      const { t } = useI18n();
      return [{
        title: query,
        desc: t('plugin.chrome-bookmarks.open'),
        iconUrl: chromeIconUrl,
        pluginId: this.pluginId,
        actionId: ACTION_OPEN,
        actionData: query,
      }];
    }

    // Check for search engine shortcuts
    const searchMatch = matchSearchEngine(query);
    if (searchMatch) {
      const { t } = useI18n();
      const searchResult: SearchResultItem = {
        title: `${searchMatch.engine.name} Search: ${searchMatch.searchQuery}`,
        desc: t('plugin.chrome-bookmarks.search', { engine: searchMatch.engine.name }),
        iconUrl: chromeIconUrl,
        pluginId: this.pluginId,
        actionId: ACTION_SEARCH,
        actionData: { url: searchMatch.engine.searchUrl(searchMatch.searchQuery) },
      };
      return [searchResult];
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
        pluginId: this.pluginId,
        actionId: ACTION_OPEN,
        actionData: cb.bookmark.url,
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
      pluginId: this.pluginId,
      actionId: ACTION_OPEN,
      actionData: cb.bookmark.url,
    }));
  }
}

export const chromeBookmarksPlugin = new ChromeBookmarksPlugin();
