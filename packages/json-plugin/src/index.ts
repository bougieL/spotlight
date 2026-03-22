import { Component, defineAsyncComponent } from 'vue';
import { BasePlugin, pluginRegistry, SearchParams, SearchResultItem, RenderParams } from '@spotlight/core';
import { registerTranslations } from '@spotlight/i18n';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

const PLUGIN_NAME = 'json';

export class JsonPlugin extends BasePlugin {
  name = PLUGIN_NAME;
  version = '1.0.0';

  constructor() {
    super();
    registerTranslations(
      {
        'en-US': enUS,
        'zh-CN': zhCN
      },
      PLUGIN_NAME
    );

    pluginRegistry.registerAction({
      pluginName: PLUGIN_NAME,
      actionId: 'open-json-editor',
      handler: this.handleOpenJsonEditor.bind(this)
    });
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.toLowerCase().trim();
    if (query.includes('json') || query.includes('{') || query === '{}') {
      return [
        {
          id: `${PLUGIN_NAME}-search-result`,
          title: 'JSON Editor',
          description: 'View and edit JSON with syntax highlighting and collapsible objects',
          icon: null,
          action: {
            pluginName: PLUGIN_NAME,
            actionId: 'open-json-editor'
          }
        }
      ];
    }
    return [];
  }

  async render(params: RenderParams): Promise<Component | null> {
    return defineAsyncComponent(() => import('./components/JsonPanel.vue'));
  }

  private handleOpenJsonEditor(): void {
    // This action opens the JSON editor panel
  }
}

export default new JsonPlugin();
