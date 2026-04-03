import { useI18n, registerTranslations } from '@spotlight/i18n';
import enUSTime from './locales/en-US.json';
import zhCNTime from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUSTime,
  'zh-CN': zhCNTime,
});

export function formatTime(timestamp: number): string {
  const { t, locale } = useI18n();
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) {
    return t('time.justNow');
  }
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    const template = t('time.minutesAgo');
    return template.replace('{n}', String(mins));
  }
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    const template = t('time.hoursAgo');
    return template.replace('{n}', String(hours));
  }
  if (diff < 172800000) {
    return t('time.yesterday');
  }
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    const template = t('time.daysAgo');
    return template.replace('{n}', String(days));
  }
  return date.toLocaleDateString(locale.value, { year: 'numeric', month: 'short', day: 'numeric' });
}