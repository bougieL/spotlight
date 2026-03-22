import { Settings } from 'lucide-vue-next';
import { defineAsyncComponent } from 'vue';
import type { Component } from 'vue';
import type { SearchResultItem, SearchResultItemContext, SearchParams, RenderParams } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { registerTranslations, translations, getLocale, type Locale } from '@spotlight/i18n';
import { createPluginStorage, type PluginStorage } from '@spotlight/api';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeSetting {
  mode: ThemeMode;
}

const PLUGIN_NAME = 'settings';

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
  name = PLUGIN_NAME;
  version = '1.0.0';
  description = 'Configure application settings';
  author = 'Spotlight Team';

  private storage: PluginStorage = createPluginStorage(PLUGIN_NAME);

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim().toLowerCase();

    // Match "settings", "设置", "theme", "主题", "language", "语言"
    const settingsKeywords = ['settings', '设置', 'theme', '主题', 'language', '语言', 'appearance', '外观'];
    const matches = settingsKeywords.some(keyword => keyword.includes(query) || query.includes(keyword));

    if (!matches && query.length > 0) {
      return [];
    }

    return [
      {
        icon: Settings,
        title: translations[getLocale()]['settings'] ?? 'settings',
        score: 1000,
        action: async (ctx: SearchResultItemContext) => {
          const component = await this.render({ query: params.query });
          if (component) {
            ctx.setPanel(component, this.name);
          }
        },
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
}

export const settingsPlugin = new SettingsPlugin();
