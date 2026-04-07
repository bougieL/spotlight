import type { SearchResultItem, SearchParams, PluginActions, ActionContext, Plugin } from '@spotlight/core';
import { registerTranslations, useI18n } from '@spotlight/i18n';
import { normalizeForSearch, toPinyinInitials, matchKeyword } from '@spotlight/utils/pinyin';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const hostsIconUrl = new URL('./assets/hosts.svg', import.meta.url).href;

const ACTION_OPEN = 'open';

export class HostsPlugin implements Plugin {
  private readonly i18n = useI18n();

  get name(): string {
    return this.i18n.t('hosts.name');
  }

  get description(): string | undefined {
    return this.i18n.t('hosts.description');
  }

  iconUrl = hostsIconUrl;
  pluginId = 'hosts-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  registerAction(_ctx: ActionContext): PluginActions {
    return {
      [ACTION_OPEN]: async () => {
        // Navigation handled by the action context
      },
    };
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim().toLowerCase();

    const keywordStr = this.i18n.t('hosts.keywords');
    const keywordList = keywordStr.split('|');
    const keywords = keywordList.map((keyword: string) => ({
      keyword,
      normalized: normalizeForSearch(keyword),
      pinyinInitials: toPinyinInitials(keyword),
    }));

    if (matchKeyword(query, keywords)) {
      return [
        {
          iconUrl: hostsIconUrl,
          title: this.name,
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
      { name: 'main', componentLoader: () => import('./components/HostsPanel.vue') },
    ];
  }
}

const hostsPlugin = new HostsPlugin();
export default hostsPlugin;
