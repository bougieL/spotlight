import { ref, reactive, computed, provide, inject, type InjectionKey, type ComputedRef } from 'vue';
import logger from '@spotlight/logger';

export type Locale = 'en-US' | 'zh-CN';

type FlattenedTranslation = Record<string, string>;
type LocaleTranslations = Partial<Record<Locale, FlattenedTranslation>>;

interface NestedTranslation {
  [key: string]: string | NestedTranslation;
}

interface I18nContext {
  locale: ComputedRef<Locale>;
  t: (key: string, params?: Record<string, string>) => string;
  setLocale: (locale: Locale) => void;
  registerTranslations: (translations: LocaleTranslations) => void;
}

const I18N_KEY: InjectionKey<I18nContext> = Symbol('i18n');

const translations: Record<Locale, FlattenedTranslation> = reactive({
  'en-US': {},
  'zh-CN': {},
});

export { translations };

const currentLocale = ref<Locale>('en-US');

export { currentLocale };

function flattenObject(obj: NestedTranslation, prefix = ''): FlattenedTranslation {
  const result: FlattenedTranslation = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      Object.assign(result, flattenObject(value as NestedTranslation, newKey));
    } else {
      result[newKey] = value as string;
    }
  }
  return result;
}

export function registerTranslations(pluginTranslations: Partial<Record<Locale, NestedTranslation>>): void {
  for (const locale of Object.keys(translations) as Locale[]) {
    const nestedDict = pluginTranslations[locale];
    if (nestedDict) {
      const flattened = flattenObject(nestedDict);
      Object.assign(translations[locale], flattened);
    }
  }
}

export function setLocale(locale: Locale): void {
  currentLocale.value = locale;
}

export function getLocale(): Locale {
  return currentLocale.value;
}

export function createI18nContext(): I18nContext {
  const locale = computed(() => currentLocale.value);

  const t = (key: string, params?: Record<string, string>): string => {
    const translation = translations[locale.value][key];
    if (translation === undefined) {
      logger.error(`[i18n] Translation key not found: "${key}" (locale: ${locale.value})`);
      return key;
    }
    let result = translation;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        result = result.replace(`{{${k}}}`, v);
      }
    }
    return result;
  };

  const setLocale = (newLocale: Locale): void => {
    currentLocale.value = newLocale;
  };

  const registerTranslations = (pluginTranslations: Partial<Record<Locale, NestedTranslation>>): void => {
    for (const loc of Object.keys(translations) as Locale[]) {
      const nestedDict = pluginTranslations[loc];
      if (nestedDict) {
        const flattened = flattenObject(nestedDict);
        Object.assign(translations[loc], flattened);
      }
    }
  };

  return {
    locale,
    t,
    setLocale,
    registerTranslations,
  };
}

export function provideI18n(): I18nContext {
  const context = createI18nContext();
  provide(I18N_KEY, context);
  return context;
}

export function useI18n(): I18nContext {
  const context = inject(I18N_KEY);
  if (!context) {
    return createI18nContext();
  }
  return context;
}

export function useLocale(): ComputedRef<Locale> {
  const { locale } = useI18n();
  return locale;
}
