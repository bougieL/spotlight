import type { SearchResultItem, SearchParams, RenderParams } from '../../base';
import { BasePlugin } from '../../base';
import { tauriApi, type AppInfo } from '../../../api/tauri';

interface CachedApp {
  info: AppInfo;
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
      this.cachedApps = apps.map((info) => ({ info }));
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

    return apps
      .filter((app) => app.info.name.toLowerCase().includes(lowerQuery))
      .slice(0, params.limit ?? 10)
      .map((app) => ({
        iconUrl: app.info.icon_data ?? undefined,
        title: app.info.name,
        desc: app.info.path,
        action: () => this.launchApp(app.info),
      }));
  }

  async render(_params: RenderParams): Promise<ReturnType<typeof import('vue')['defineComponent']> | null> {
    return null;
  }
}

export const appSearchPlugin = new AppSearchPlugin();
