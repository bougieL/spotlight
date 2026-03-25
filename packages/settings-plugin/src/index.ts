import { defineAsyncComponent } from 'vue';
import type { Component } from 'vue';
import type { SearchResultItem, SearchParams, RenderParams, PluginActions } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { registerTranslations, translations, getLocale, type Locale } from '@spotlight/i18n';
import { createPluginStorage, tauriApi, type PluginStorage } from '@spotlight/api';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import { normalizeForSearch, toPinyinInitials, fuzzyMatch } from '@spotlight/utils/pinyin';

const DEFAULT_HOTKEY = 'Alt+Space';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeSetting {
  mode: ThemeMode;
}

const settingsIconUrl = new URL('./assets/settings.svg', import.meta.url).href;

const PLUGIN_NAME = 'settings';
const ACTION_OPEN = 'open';

export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  root.removeAttribute('data-theme');

  if (mode === 'system') {
    // System preference is handled by CSS media query
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
  pluginId = 'settings-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  private storage: PluginStorage = createPluginStorage(PLUGIN_NAME);

  registerAction(): PluginActions {
    return {
      [ACTION_OPEN]: async (_data, ctx) => {
        const component = await this.render({ query: '' });
        if (component) {
          ctx.setPanel(component, this.name);
        }
      },
    };
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim().toLowerCase();

    // Pre-compute search normalized versions for each keyword
    const keywordSearchData = [
      { keyword: 'settings', normalized: normalizeForSearch('settings') },
      { keyword: '设置', normalized: normalizeForSearch('设置'), pinyinInitials: toPinyinInitials('设置') },
      { keyword: 'theme', normalized: normalizeForSearch('theme') },
      { keyword: '主题', normalized: normalizeForSearch('主题'), pinyinInitials: toPinyinInitials('主题') },
      { keyword: 'language', normalized: normalizeForSearch('language') },
      { keyword: '语言', normalized: normalizeForSearch('语言'), pinyinInitials: toPinyinInitials('语言') },
      { keyword: 'appearance', normalized: normalizeForSearch('appearance') },
      { keyword: '外观', normalized: normalizeForSearch('外观'), pinyinInitials: toPinyinInitials('外观') },
    ];

    const matches = keywordSearchData.some(({ keyword, normalized, pinyinInitials }) => {
      // Direct substring match
      if (keyword.toLowerCase().includes(query) || query.includes(keyword.toLowerCase())) {
        return true;
      }
      // Pinyin normalized match (e.g., "sz" matches "设置")
      if (normalized.includes(query)) {
        return true;
      }
      // Pinyin initials match (e.g., "yt" matches "主题")
      if (pinyinInitials && pinyinInitials.toLowerCase().includes(query)) {
        return true;
      }
      // Fuzzy match on pinyin
      if (pinyinInitials && fuzzyMatch(query, pinyinInitials) > 0) {
        return true;
      }
      return false;
    });

    if (!matches && query.length > 0) {
      return [];
    }

    return [
      {
        iconUrl: settingsIconUrl,
        title: this.name,
        score: 1000,
        pluginId: this.pluginId,
        actionId: ACTION_OPEN,
        actionData: null,
      },
    ];
  }

  async render(_params: RenderParams): Promise<Component | null> {
    return defineAsyncComponent(() => import('./components/SettingsPanel.vue'));
  }

  async getThemeMode(): Promise<ThemeMode> {
    return await this.storage.get<ThemeMode>('theme.mode', 'system');
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
    // Let errors propagate to UI
    await this.registerHotkey(hotkey);
  }

  async registerHotkey(hotkey?: string): Promise<void> {
    const shortcut = hotkey ?? (await this.getHotkey());
    // Don't catch errors - let them propagate to UI
    await tauriApi.registerGlobalShortcut(shortcut);
  }
}

export const settingsPlugin = new SettingsPlugin();
