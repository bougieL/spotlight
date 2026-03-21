import type { Component } from 'vue';
import type { SearchResultItem, SearchParams, RenderParams } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { tauriApi, type AppInfo } from '@spotlight/api';
import { toPinyin, toPinyinInitials, normalizeForSearch } from './pinyin';

interface CachedApp {
  info: AppInfo;
  normalizedName: string;
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
      this.cachedApps = apps.map((info) => ({
        info,
        normalizedName: normalizeForSearch(info.name),
      }));
      this.cacheLoaded = true;
    } catch {
      this.cachedApps = [];
      this.cacheLoaded = true;
    }

    return this.cachedApps;
  }

  private launchApp(info: AppInfo): void {
    if (!info.path) return;

    import('@tauri-apps/plugin-opener').then(({ openPath }) => {
      openPath(info.path).catch(() => {});
    }).catch(() => {});
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

        // Pinyin full match (e.g., "weixin" matches "微信")
        if (normalized.includes(queryPinyin)) return true;

        // Pinyin initials match (e.g., "wx" matches "微信")
        const nameInitials = toPinyinInitials(app.info.name).toLowerCase();
        if (nameInitials.includes(queryInitials) || queryInitials.length >= 2 && nameInitials.startsWith(queryInitials)) {
          return true;
        }

        return false;
      })
      .slice(0, params.limit ?? 10)
      .map((app) => ({
        iconUrl: app.info.icon_data ?? undefined,
        title: app.info.name,
        desc: app.info.path,
        action: () => this.launchApp(app.info),
      }));
  }

  async render(_params: RenderParams): Promise<Component | null> {
    return null;
  }
}

export const appSearchPlugin = new AppSearchPlugin();
