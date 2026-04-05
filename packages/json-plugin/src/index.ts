import type { SearchResultItem, SearchParams, PluginActions, ActionContext, Plugin } from '@spotlight/core';
import { registerTranslations, useI18n } from '@spotlight/i18n';
import { normalizeForSearch, toPinyinInitials, matchKeyword } from '@spotlight/utils/pinyin';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const jsonIconUrl = new URL('./assets/JSON.svg', import.meta.url).href;

const ACTION_OPEN = 'open-json-editor';

export class JsonPlugin implements Plugin {
  private readonly i18n = useI18n();

  get name(): string {
    return this.i18n.t('jsonPlugin.name');
  }
  get description(): string | undefined {
    return this.i18n.t('jsonPlugin.description');
  }
  iconUrl = jsonIconUrl;
  pluginId = 'json-plugin';
  version = '1.0.0';

  registerAction(ctx: ActionContext): PluginActions {
    return {
      [ACTION_OPEN]: async () => {
        ctx.navigateToPlugin(this.pluginId);
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
          score: 900,
          pluginId: this.pluginId,
          actionId: ACTION_OPEN,
          actionData: null,
        },
      ];
    }

    return [];
  }

  getPanelRoutes() {
    return [
      { name: 'main', componentLoader: () => import('./components/JsonPanel.vue') },
    ];
  }
}

const jsonPlugin = new JsonPlugin();
export default jsonPlugin;
