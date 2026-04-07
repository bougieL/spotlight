import type { SearchResultItem, SearchParams, PluginActions, ActionContext, Plugin } from '@spotlight/core';
import { registerTranslations, useI18n } from '@spotlight/i18n';
import { normalizeForSearch, toPinyinInitials, matchKeyword } from '@spotlight/utils/pinyin';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const calendarIconUrl = new URL('./assets/calendar.svg', import.meta.url).href;

const ACTION_OPEN = 'open';

export class CalendarPlugin implements Plugin {
  private readonly i18n = useI18n();

  get name(): string {
    return this.i18n.t('calendar.name');
  }
  get description(): string | undefined {
    return this.i18n.t('calendar.description');
  }
  iconUrl = calendarIconUrl;
  pluginId = 'calendar-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  registerAction(ctx: ActionContext): PluginActions {
    return {
      [ACTION_OPEN]: async () => {
        ctx.navigateToPlugin(this.pluginId);
      },
    };
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim().toLowerCase();

    const keywordStr = this.i18n.t('calendar.keywords');
    const keywordList = keywordStr.split('|');
    const keywords = keywordList.map((keyword: string) => ({
      keyword,
      normalized: normalizeForSearch(keyword),
      pinyinInitials: toPinyinInitials(keyword),
    }));

    if (matchKeyword(query, keywords)) {
      return [
        {
          iconUrl: calendarIconUrl,
          title: this.name,
          score: 900,
          pluginId: this.pluginId,
          actionId: ACTION_OPEN,
          actionData: null,
        },
      ];
    }

    // 检查是否是日期格式查询
    const datePattern = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
    if (datePattern.test(params.query.trim())) {
      return [
        {
          iconUrl: calendarIconUrl,
          title: `${params.query}`,
          desc: this.name,
          score: 800,
          pluginId: this.pluginId,
          actionId: ACTION_OPEN,
          actionData: params.query,
        },
      ];
    }

    return [];
  }

  getPanelRoutes() {
    return [
      { name: 'main', componentLoader: () => import('./components/CalendarPanel.vue') },
    ];
  }
}

const calendarPlugin = new CalendarPlugin();
export default calendarPlugin;
