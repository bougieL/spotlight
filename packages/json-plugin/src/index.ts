import { defineAsyncComponent } from 'vue';
import type { Component } from 'vue';
import type { SearchResultItem, SearchParams, RenderParams, PluginActions } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { registerTranslations, translations, getLocale } from '@spotlight/i18n';
import { normalizeForSearch, toPinyinInitials, matchKeyword } from '@spotlight/utils/pinyin';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const jsonIconUrl = new URL('./assets/JSON.svg', import.meta.url).href;

const ACTION_OPEN = 'open-json-editor';

export class JsonPlugin extends BasePlugin {
  get name(): string {
    return translations[getLocale()]['json'] ?? 'JSON Editor';
  }
  get description(): string | undefined {
    return translations[getLocale()]['plugin.description.json'];
  }
  pluginId = 'json-plugin';
  version = '1.0.0';

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
    const query = params.query.toLowerCase().trim();

    const keywords = [
      { keyword: 'json', normalized: normalizeForSearch('json') },
      { keyword: 'JSON 编辑器', normalized: normalizeForSearch('JSON 编辑器'), pinyinInitials: toPinyinInitials('JSON 编辑器') },
    ];

    const isKeywordMatch = matchKeyword(query, keywords);

    // Also match JSON syntax patterns
    if (query.includes('json') || query.includes('{') || query === '{}') {
      return [
        {
          iconUrl: jsonIconUrl,
          title: this.name,
          desc: 'View and edit JSON with syntax highlighting and collapsible objects',
          score: 900,
          pluginId: this.pluginId,
          actionId: ACTION_OPEN,
          actionData: null,
        },
      ];
    }

    if (isKeywordMatch) {
      return [
        {
          iconUrl: jsonIconUrl,
          title: this.name,
          desc: 'View and edit JSON with syntax highlighting and collapsible objects',
          score: 850,
          pluginId: this.pluginId,
          actionId: ACTION_OPEN,
          actionData: null,
        },
      ];
    }

    return [];
  }

  async render(_params: RenderParams): Promise<Component | null> {
    return defineAsyncComponent(() => import('./components/JsonPanel.vue'));
  }
}

export const jsonPlugin = new JsonPlugin();
