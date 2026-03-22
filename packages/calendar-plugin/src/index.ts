import { Calendar } from 'lucide-vue-next';
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

const PLUGIN_NAME = 'calendar';
const ACTION_OPEN = 'open';

export class CalendarPlugin extends BasePlugin {
  name = PLUGIN_NAME;
  version = '1.0.0';
  description = 'Calendar with holidays';
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
          icon: Calendar,
          iconComponentName: 'Calendar',
          title: translations[getLocale()]['calendar'] ?? 'Calendar',
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
          icon: Calendar,
          iconComponentName: 'Calendar',
          title: `${params.query}`,
          desc: translations[getLocale()]['calendar'] ?? 'Calendar',
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
