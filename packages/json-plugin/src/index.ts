import { defineAsyncComponent } from 'vue';
import type { Component } from 'vue';
import type { SearchResultItem, SearchResultItemContext, SearchParams, RenderParams } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { pluginRegistry } from '@spotlight/plugin-registry';
import { registerTranslations, translations, getLocale } from '@spotlight/i18n';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const jsonIconUrl = new URL('./assets/JSON.svg', import.meta.url).href;

const PLUGIN_NAME = 'json';
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

  constructor() {
    super();
    pluginRegistry.registerAction({
      pluginName: PLUGIN_NAME,
      actionId: ACTION_OPEN,
      handler: async (_data, ctx) => {
        const component = await this.render({ query: '' });
        if (component) {
          ctx.setPanel(component, this.name);
        }
      },
    });
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.toLowerCase().trim();
    if (query.includes('json') || query.includes('{') || query === '{}') {
      return [
        {
          iconUrl: jsonIconUrl,
          title: this.name,
          desc: 'View and edit JSON with syntax highlighting and collapsible objects',
          score: 900,
          sourcePlugin: PLUGIN_NAME,
          actionId: ACTION_OPEN,
          actionData: null,
          action: async (ctx: SearchResultItemContext) => {
            const component = await this.render({ query: '' });
            if (component) {
              ctx.setPanel(component, this.name);
            }
          },
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
