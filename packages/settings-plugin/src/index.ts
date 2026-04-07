import type { SearchResultItem, SearchParams, PluginActions, ActionContext, Plugin } from '@spotlight/core';
import { registerTranslations, useI18n, type Locale } from '@spotlight/i18n';
import { openPath } from '@tauri-apps/plugin-opener';
import { createPluginStorage, tauriApi, openDirectoryDialog, copyDirectory, type PluginStorage } from '@spotlight/api';
import { normalizeForSearch, toPinyinInitials, matchKeyword } from '@spotlight/utils/pinyin';
import type { ThemeMode } from './types';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

const DEFAULT_HOTKEY = 'Alt+Space';

interface ThemeSetting {
  mode: ThemeMode;
}

const DISABLED_PLUGINS_KEY = 'disabledPlugins';

const settingsIconUrl = new URL('./assets/settings.svg', import.meta.url).href;

const ACTION_OPEN = 'open';

export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  root.removeAttribute('data-theme');

  if (mode === 'system') {
    return;
  }

  root.setAttribute('data-theme', mode);
}

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

class SettingsPlugin implements Plugin {
  private readonly i18n = useI18n();

  get name(): string {
    return this.i18n.t('settings.name');
  }
  get description(): string | undefined {
    return this.i18n.t('settings.description');
  }
  iconUrl = settingsIconUrl;
  pluginId = 'settings-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  private storage: PluginStorage = createPluginStorage(this.pluginId);

  registerAction(ctx: ActionContext): PluginActions {
    return {
      [ACTION_OPEN]: async () => {
        ctx.navigateToPlugin(this.pluginId);
      },
    };
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim().toLowerCase();

    const keywordStr = this.i18n.t('settings.keywords');
    const keywordList = keywordStr.split('|');
    const keywords = keywordList.map((keyword: string) => ({
      keyword,
      normalized: normalizeForSearch(keyword),
      pinyinInitials: toPinyinInitials(keyword),
    }));

    if (query.length > 0 && !matchKeyword(query, keywords)) {
      return [];
    }

    return [
      {
        iconUrl: settingsIconUrl,
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
      { name: 'main', componentLoader: () => import('./components/SettingsPanel.vue') },
    ];
  }

  async getThemeMode(): Promise<ThemeMode> {
    const setting = await this.storage.get<ThemeSetting>('theme', { mode: 'system' });
    return setting.mode;
  }

  async getLanguage(): Promise<Locale> {
    return await this.storage.get<Locale>('language', 'en-US');
  }

  async updateTheme(mode: ThemeMode): Promise<void> {
    await this.storage.set<ThemeSetting>('theme', { mode });
    applyTheme(mode);
  }

  async updateLanguage(language: Locale): Promise<void> {
    await this.storage.set<Locale>('language', language);
  }

  async getHotkey(): Promise<string> {
    return await this.storage.get<string>('hotkey', DEFAULT_HOTKEY);
  }

  async updateHotkey(hotkey: string): Promise<void> {
    await this.storage.set<string>('hotkey', hotkey);
    await this.registerHotkey(hotkey);
  }

  async registerHotkey(hotkey?: string): Promise<void> {
    const shortcut = hotkey ?? (await this.getHotkey());
    await tauriApi.registerGlobalShortcut(shortcut);
  }

  async getDisabledPlugins(): Promise<string[]> {
    return await this.storage.get<string[]>(DISABLED_PLUGINS_KEY, []);
  }

  async getAutostartEnabled(): Promise<boolean> {
    return await this.storage.get<boolean>('autostart', false);
  }

  async setAutostartEnabled(enabled: boolean): Promise<void> {
    await this.storage.set<boolean>('autostart', enabled);
    await tauriApi.setAutostartEnabled(enabled);
  }

  async getHideOnBlur(): Promise<boolean> {
    return await this.storage.get<boolean>('hideOnBlur', true);
  }

  async setHideOnBlur(enabled: boolean): Promise<void> {
    await this.storage.set<boolean>('hideOnBlur', enabled);
  }

  async getAlwaysOnTop(): Promise<boolean> {
    return await this.storage.get<boolean>('alwaysOnTop', false);
  }

  async setAlwaysOnTop(enabled: boolean): Promise<void> {
    await this.storage.set<boolean>('alwaysOnTop', enabled);
    await this.applyAlwaysOnTop(enabled);
  }

  async applyAlwaysOnTop(enabled?: boolean): Promise<void> {
    const onTop = enabled ?? (await this.getAlwaysOnTop());
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const mainWindow = await WebviewWindow.getByLabel('main');
    if (mainWindow) {
      await mainWindow.setAlwaysOnTop(onTop);
    }
  }

  async setPluginDisabled(pluginId: string, disabled: boolean): Promise<void> {
    const disabledPlugins = await this.getDisabledPlugins();
    if (disabled) {
      if (!disabledPlugins.includes(pluginId)) {
        disabledPlugins.push(pluginId);
      }
    } else {
      const index = disabledPlugins.indexOf(pluginId);
      if (index > -1) {
        disabledPlugins.splice(index, 1);
      }
    }
    await this.storage.set<string[]>(DISABLED_PLUGINS_KEY, disabledPlugins);
  }

  async getAppDataDir(): Promise<string> {
    return tauriApi.getAppDataDir();
  }

  async openDataFolder(): Promise<void> {
    const dir = await this.getAppDataDir();
    await openPath(dir);
  }

  async exportData(): Promise<void> {
    const srcDir = await this.getAppDataDir();
    const dstDir = await openDirectoryDialog();
    if (dstDir) {
      await copyDirectory(srcDir, dstDir);
    }
  }

  async importData(): Promise<void> {
    const srcDir = await openDirectoryDialog();
    if (srcDir) {
      const dstDir = await this.getAppDataDir();
      await copyDirectory(srcDir, dstDir);
    }
  }
}

const settingsPlugin = new SettingsPlugin();
export default settingsPlugin;
