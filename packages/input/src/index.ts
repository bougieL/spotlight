import { registerTranslations } from '@spotlight/i18n';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

export { default as SearchInput } from './SearchInput.vue';
export type { FileItem } from './SearchInput.vue';