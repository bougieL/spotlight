import type { SearchResultItem, SearchParams, PluginActions } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { tauriApi, type AppInfo } from '@spotlight/api';
import { toPinyin, toPinyinInitials, normalizeForSearch, fuzzyMatch } from '@spotlight/utils/pinyin';
import { registerTranslations, translations, getLocale } from '@spotlight/i18n';
import logger from '@spotlight/logger';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const ACTION_LAUNCH = 'launch';

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
  get name(): string {
    return translations[getLocale()]['plugin.app-search'] ?? 'App Search';
  }
  get description(): string | undefined {
    return translations[getLocale()]['plugin.description.appSearch'];
  }
  pluginId = 'app-search-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  private cachedApps: CachedApp[] = [];
  private cacheLoaded = false;

  registerAction(): PluginActions {
    return {
      [ACTION_LAUNCH]: async (data) => {
        logger.info(`[AppSearchPlugin] Launch handler called with data: ${data}`);
        if (typeof data !== 'string') {
          logger.warn('[AppSearchPlugin] Data is not a string');
          return;
        }
        const apps = await this.loadApps();
        logger.info(`[AppSearchPlugin] Loaded ${apps.length} apps, looking for: ${data}`);
        const app = apps.find((a) => a.info.path === data);
        if (app) {
          logger.info(`[AppSearchPlugin] Found app: ${app.info.name}`);
          await this.launchApp(app.info);
        } else {
          logger.warn(`[AppSearchPlugin] App not found for path: ${data}`);
        }
      },
    };
  }

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
      logger.error('Failed to launch app:', error);
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
        pluginId: this.pluginId,
        actionId: ACTION_LAUNCH,
        actionData: app.info.path,
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
      pluginId: this.pluginId,
      actionId: ACTION_LAUNCH,
      actionData: app.info.path,
    }));
  }
}

export const appSearchPlugin = new AppSearchPlugin();
