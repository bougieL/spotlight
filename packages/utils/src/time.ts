import { translations, getLocale, registerTranslations } from '@spotlight/i18n';
import enUSTime from './locales/en-US.json';
import zhCNTime from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUSTime,
  'zh-CN': zhCNTime,
});

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const locale = getLocale();

  if (diff < 60000) {
    return translations[locale]['time.justNow'] ?? 'Just now';
  }
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    const template = translations[locale]['time.minutesAgo'] ?? '{n}m ago';
    return template.replace('{n}', String(mins));
  }
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    const template = translations[locale]['time.hoursAgo'] ?? '{n}h ago';
    return template.replace('{n}', String(hours));
  }
  if (diff < 172800000) {
    return translations[locale]['time.yesterday'] ?? 'Yesterday';
  }
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    const template = translations[locale]['time.daysAgo'] ?? '{n}d ago';
    return template.replace('{n}', String(days));
  }
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}
