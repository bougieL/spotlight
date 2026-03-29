import type { Component } from 'vue';
import type { SearchResultItem, SearchParams, PluginActions, ActionContext } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { registerTranslations, translations, getLocale, type Locale } from '@spotlight/i18n';
import { createPluginStorage, tauriApi, type PluginStorage } from '@spotlight/api';
import { normalizeForSearch, toPinyinInitials, matchKeyword } from '@spotlight/utils/pinyin';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

const DEFAULT_HOTKEY = 'Alt+Space';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeSetting {
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

export class SettingsPlugin extends BasePlugin {
  get name(): string {
    return translations[getLocale()]['settings'] ?? 'Spotlight Settings';
  }
  get description(): string | undefined {
    return translations[getLocale()]['plugin.description.settings'];
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

    const keywords = [
      { keyword: 'settings', normalized: normalizeForSearch('settings') },
      { keyword: '设置', normalized: normalizeForSearch('设置'), pinyinInitials: toPinyinInitials('设置') },
      { keyword: 'theme', normalized: normalizeForSearch('theme') },
      { keyword: '主题', normalized: normalizeForSearch('主题'), pinyinInitials: toPinyinInitials('主题') },
      { keyword: 'language', normalized: normalizeForSearch('language') },
      { keyword: '语言', normalized: normalizeForSearch('语言'), pinyinInitials: toPinyinInitials('语言') },
      { keyword: 'appearance', normalized: normalizeForSearch('appearance') },
      { keyword: '外观', normalized: normalizeForSearch('外观'), pinyinInitials: toPinyinInitials('外观') },
    ];

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

  getPanelComponentLoader(): () => Promise<Component> {
    return () => import('./components/SettingsPanel.vue');
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
}

export const settingsPlugin = new SettingsPlugin();
