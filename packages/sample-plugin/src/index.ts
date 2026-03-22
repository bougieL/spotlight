import { FileText, Calculator, Globe } from 'lucide-vue-next';
import type { Component } from 'vue';
import type { SearchResultItem, SearchResultItemContext, SearchParams, RenderParams } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { registerTranslations } from '@spotlight/i18n';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

interface SampleItem {
  icon: typeof FileText;
  title: string;
  desc: string;
  action: (ctx: SearchResultItemContext) => void | Promise<void>;
}

const sampleItems: SampleItem[] = [
  {
    icon: FileText,
    title: 'sample.document',
    desc: 'sample.document.desc',
    action: () => {
      // Placeholder action - implement based on app requirements
    },
  },
  {
    icon: Calculator,
    title: 'sample.calculator',
    desc: 'sample.calculator.desc',
    action: () => {
      // Placeholder action - implement based on app requirements
    },
  },
  {
    icon: Globe,
    title: 'sample.browser',
    desc: 'sample.browser.desc',
    action: () => {
      // Placeholder action - implement based on app requirements
    },
  },
];

export class SamplePlugin extends BasePlugin {
  name = 'sample';
  version = '1.0.0';
  description = 'Sample plugin with built-in search items';
  author = 'Spotlight Team';

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const lowerQuery = params.query.toLowerCase();
    return sampleItems
      .filter(
        (item) =>
          item.title.toLowerCase().includes(lowerQuery) ||
          item.desc.toLowerCase().includes(lowerQuery)
      )
      .map((item) => ({
        icon: item.icon,
        title: item.title,
        desc: item.desc,
        action: item.action,
      }));
  }

  async render(_params: RenderParams): Promise<Component | null> {
    return null;
  }
}

export const samplePlugin = new SamplePlugin();
