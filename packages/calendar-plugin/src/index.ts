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

const calendarIconUrl = new URL('./assets/calendar.svg', import.meta.url).href;

const PLUGIN_NAME = 'calendar';
const ACTION_OPEN = 'open';

export class CalendarPlugin extends BasePlugin {
  get name(): string {
    return translations[getLocale()]['calendar'] ?? 'Calendar';
  }
  get description(): string | undefined {
    return translations[getLocale()]['plugin.description.calendar'];
  }
  pluginId = 'calendar-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

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
    const query = params.query.trim().toLowerCase();

    const keywords = [
      'calendar', 'cal', 'rilian', 'rili',
      '日历', '日期', '时间', '今天', '明天', '昨天',
      '节日', '假期', 'holiday', 'date', 'time', 'today',
    ];

    const isKeywordMatch = keywords.some(
      (kw) => kw.toLowerCase().includes(query) || query.includes(kw.toLowerCase())
    );

    if (isKeywordMatch) {
      return [
        {
          iconUrl: calendarIconUrl,
          title: this.name,
          score: 900,
          sourcePlugin: PLUGIN_NAME,
          actionId: ACTION_OPEN,
          actionData: null,
          action: async (ctx: SearchResultItemContext) => {
            const component = await this.render({ query: params.query });
            if (component) {
              ctx.setPanel(component, this.name);
            }
          },
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
          sourcePlugin: PLUGIN_NAME,
          actionId: ACTION_OPEN,
          actionData: params.query,
          action: async (ctx: SearchResultItemContext) => {
            const component = await this.render({ query: params.query });
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
    return defineAsyncComponent(() => import('./components/CalendarPanel.vue'));
  }
}

export const calendarPlugin = new CalendarPlugin();
