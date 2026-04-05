import type { SearchResultItem, SearchParams, PluginActions, ActionContext } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
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

export class CalendarPlugin extends BasePlugin {
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

    const keywords = [
      { keyword: 'calendar', normalized: normalizeForSearch('calendar') },
      { keyword: 'cal', normalized: normalizeForSearch('cal') },
      { keyword: '日历', normalized: normalizeForSearch('日历'), pinyinInitials: toPinyinInitials('日历') },
      { keyword: '日期', normalized: normalizeForSearch('日期'), pinyinInitials: toPinyinInitials('日期') },
      { keyword: '时间', normalized: normalizeForSearch('时间'), pinyinInitials: toPinyinInitials('时间') },
      { keyword: '今天', normalized: normalizeForSearch('今天'), pinyinInitials: toPinyinInitials('今天') },
      { keyword: '明天', normalized: normalizeForSearch('明天'), pinyinInitials: toPinyinInitials('明天') },
      { keyword: '昨天', normalized: normalizeForSearch('昨天'), pinyinInitials: toPinyinInitials('昨天') },
      { keyword: '节日', normalized: normalizeForSearch('节日'), pinyinInitials: toPinyinInitials('节日') },
      { keyword: '假期', normalized: normalizeForSearch('假期'), pinyinInitials: toPinyinInitials('假期') },
      { keyword: 'holiday', normalized: normalizeForSearch('holiday') },
      { keyword: 'date', normalized: normalizeForSearch('date') },
      { keyword: 'time', normalized: normalizeForSearch('time') },
      { keyword: 'today', normalized: normalizeForSearch('today') },
    ];

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
