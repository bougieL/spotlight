import type { Component } from 'vue';
import type { SearchResultItem, SearchParams, RenderParams } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { tauriApi, type AppInfo } from '@spotlight/api';
import { toPinyin, toPinyinInitials, normalizeForSearch, fuzzyMatch } from './pinyin';

// Chinese to English app name translation map
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

interface CachedApp {
  info: AppInfo;
  normalizedName: string;
  searchTerms: string[];
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
        const searchTerms: string[] = [normalizedName];

        // Add Chinese translation and its pinyin for matching
        const englishName = CHINESE_APP_NAMES[info.name];
        if (englishName) {
          searchTerms.push(normalizeForSearch(englishName));
          searchTerms.push(normalizeForSearch(info.name));
        }

        // Check if app name has a Chinese translation
        for (const [chinese, english] of Object.entries(CHINESE_APP_NAMES)) {
          if (english.toLowerCase() === info.name.toLowerCase()) {
            searchTerms.push(normalizeForSearch(chinese));
            break;
          }
        }

        return {
          info,
          normalizedName,
          searchTerms,
        };
      });
      this.cacheLoaded = true;
    } catch {
      this.cachedApps = [];
      this.cacheLoaded = true;
    }

    return this.cachedApps;
  }

  private async launchApp(info: AppInfo): Promise<void> {
    if (!info.path) return;

    console.log('Launching app:', info.name, 'at path:', info.path);

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

    return apps
      .filter((app) => {
        const name = app.info.name.toLowerCase();
        const normalized = app.normalizedName;

        // Direct match
        if (name.includes(lowerQuery)) return true;

        // Fuzzy match on app name (e.g., "vs" matches "visual studio")
        const fuzzyScore = fuzzyMatch(params.query, app.info.name);
        if (fuzzyScore > 0) return true;

        // Check search terms for pinyin match
        for (const term of app.searchTerms) {
          if (term.includes(queryPinyin)) return true;
        }

        // Pinyin full match (e.g., "weixin" matches "微信")
        if (normalized.includes(queryPinyin)) return true;

        // Pinyin initials match (e.g., "wx" matches "微信")
        const nameInitials = toPinyinInitials(app.info.name).toLowerCase();
        if (nameInitials.includes(queryInitials) || queryInitials.length >= 2 && nameInitials.startsWith(queryInitials)) {
          return true;
        }

        // Fuzzy match on pinyin initials (e.g., "vs" matches "wei xin")
        const pinyinInitialsScore = fuzzyMatch(queryInitials, nameInitials);
        if (pinyinInitialsScore > 0) return true;

        return false;
      })
      .slice(0, params.limit ?? 10)
      .map((app) => ({
        iconUrl: app.info.icon_data ?? undefined,
        title: app.info.name,
        desc: app.info.path,
        action: async () => this.launchApp(app.info),
      }));
  }

  async render(_params: RenderParams): Promise<Component | null> {
    return null;
  }
}

export const appSearchPlugin = new AppSearchPlugin();
