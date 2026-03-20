import { FileText, Calculator, Globe } from 'lucide-vue-next';
import type { SearchPlugin, SearchResultItem } from '../types';

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

export const samplePlugin: SearchPlugin = {
  name: 'sample',
  async search(query: string): Promise<SearchResultItem[]> {
    const lowerQuery = query.toLowerCase();
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
  },
};
