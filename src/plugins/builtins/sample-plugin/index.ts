import { FileText, Calculator, Globe } from 'lucide-vue-next';
import type { Component } from 'vue';
import type { SearchResultItem, SearchParams, RenderParams } from '../../base';
import { BasePlugin } from '../../base';

interface SampleItem {
  icon: typeof FileText;
  title: string;
  desc: string;
  action: () => void;
}

const sampleItems: SampleItem[] = [
  {
    icon: FileText,
    title: 'Document',
    desc: 'Create a new document',
    action: () => {
      // Placeholder action - implement based on app requirements
    },
  },
  {
    icon: Calculator,
    title: 'Calculator',
    desc: 'Open calculator',
    action: () => {
      // Placeholder action - implement based on app requirements
    },
  },
  {
    icon: Globe,
    title: 'Browser',
    desc: 'Open web browser',
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
