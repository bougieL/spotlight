import type { Component } from 'vue';
import type { SearchResultItem, SearchResultItemContext, SearchParams, RenderParams } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { tauriApi, type AppInfo } from '@spotlight/api';
import { toPinyin, toPinyinInitials, normalizeForSearch, fuzzyMatch } from './pinyin';
import { registerTranslations } from '@spotlight/i18n';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const CHINESE_APP_NAMES: Record<string, string> = {
  '记事本': 'Notepad',
  '备忘录': 'Notepad',
  '截图工具': 'Snipping Tool',
  '截图': 'Snipping Tool',
  '截屏': 'Snipping Tool',
  '画图': 'Paint',
  '画图3D': 'Paint',
  '计算器': 'Calculator',
  '应用商店': 'Store',
  '商店': 'Store',
  '终端': 'Windows Terminal',
  'Windows终端': 'Windows Terminal',
  '帮助': 'Get Help',
  '媒体播放器': 'Media Player',
  '音乐': 'Media Player',
  '视频': 'Media Player',
};

const ENGLISH_TO_CHINESE: Record<string, string> = Object.fromEntries(
  Object.entries(CHINESE_APP_NAMES).map(([k, v]) => [v.toLowerCase(), k])
);

interface CachedApp {
  info: AppInfo;
  normalizedName: string;
  searchTerms: string[];
  pinyin: string;
  initials: string;
}

export class AppSearchPlugin extends BasePlugin {
  name = 'app-search';
  version = '1.0.0';
  description = 'Search for installed applications';
  author = 'Spotlight Team';

  private cachedApps: CachedApp[] = [];
  private cacheLoaded = false;

  async loadApps(): Promise<CachedApp[]> {
    if (this.cacheLoaded) {
      return this.cachedApps;
    }

    try {
      const apps = await tauriApi.getInstalledApplications();
      this.cachedApps = apps.map((info) => {
        const normalizedName = normalizeForSearch(info.name);
        const pinyin = toPinyin(info.name).toLowerCase();
        const initials = toPinyinInitials(info.name).toLowerCase();
        const searchTerms: string[] = [normalizedName];

        const englishName = CHINESE_APP_NAMES[info.name];
        if (englishName) {
          searchTerms.push(normalizeForSearch(englishName));
        }

        const englishLower = info.name.toLowerCase();
        const reverseChinese = ENGLISH_TO_CHINESE[englishLower];
        if (reverseChinese) {
          searchTerms.push(normalizeForSearch(reverseChinese));
        }

        return {
          info,
          normalizedName,
          searchTerms,
          pinyin,
          initials,
        };
      });
      this.cacheLoaded = true;
    } catch {
      this.cachedApps = [];
      this.cacheLoaded = true;
    }

    return this.cachedApps;
  }

  private iconCache = new Map<string, string | null>();
  private iconLoading = new Map<string, Promise<string | null>>();

  private async getIcon(path: string): Promise<string | null> {
    const cached = this.iconCache.get(path);
    if (cached !== undefined) return cached;

    let loader = this.iconLoading.get(path);
    if (!loader) {
      loader = tauriApi.getAppIcon(path);
      this.iconLoading.set(path, loader);
    }

    const icon = await loader;
    this.iconCache.set(path, icon);
    this.iconLoading.delete(path);
    return icon;
  }

  private async launchApp(info: AppInfo): Promise<void> {
    if (!info.path) return;

    try {
      await tauriApi.launchApp(info.path);
    } catch (error) {
      console.error('Failed to launch app:', error);
    }
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const apps = await this.loadApps();
    const lowerQuery = params.query.toLowerCase();
    const queryPinyin = toPinyin(params.query).toLowerCase();
    const queryInitials = toPinyinInitials(params.query).toLowerCase();
    const limit = params.limit ?? 10;

    if (!lowerQuery) {
      return apps.slice(0, limit).map((app) => ({
        title: app.info.name,
        desc: app.info.path,
        action: async (_ctx: SearchResultItemContext) => this.launchApp(app.info),
      }));
    }

    const scored: Array<{ app: CachedApp; score: number }> = [];

    for (const app of apps) {
      const name = app.info.name.toLowerCase();
      let score = -1;

      if (name === lowerQuery) {
        score = 1000;
      } else if (name.startsWith(lowerQuery)) {
        score = 900;
      } else if (name.includes(lowerQuery)) {
        score = 800;
      }

      if (score < 0) {
        const fuzzyScore = fuzzyMatch(params.query, app.info.name);
        if (fuzzyScore > 0) {
          score = 700 + fuzzyScore;
        }
      }

      if (score < 0) {
        for (const term of app.searchTerms) {
          if (term.includes(queryPinyin)) {
            score = 600;
            break;
          }
        }
      }

      if (score < 0) {
        if (app.pinyin.includes(queryPinyin)) {
          score = 500;
        }
      }

      if (score < 0) {
        if (app.initials.startsWith(queryInitials)) {
          score = 400;
        } else if (app.initials.includes(queryInitials)) {
          score = 300;
        }
      }

      if (score < 0) {
        const pinyinFuzzy = fuzzyMatch(queryInitials, app.initials);
        if (pinyinFuzzy > 0) {
          score = 200 + pinyinFuzzy;
        }
      }

      if (score > 0) {
        scored.push({ app, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    const topApps = scored.slice(0, limit);
    const iconPromises = topApps.map(async ({ app, score }) => {
      const icon = await this.getIcon(app.info.path);
      return { app, score, icon };
    });

    const results = await Promise.all(iconPromises);

    return results.map(({ app, score, icon }) => ({
      iconUrl: icon ?? undefined,
      title: app.info.name,
      desc: app.info.path,
      score,
      action: async (_ctx: SearchResultItemContext) => this.launchApp(app.info),
    }));
  }

  async render(_params: RenderParams): Promise<Component | null> {
    return null;
  }
}

export const appSearchPlugin = new AppSearchPlugin();
