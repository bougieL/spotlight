import { ref, reactive, computed, provide, inject, type InjectionKey, type ComputedRef } from 'vue';

export type Locale = 'en-US' | 'zh-CN';

type TranslationDict = Record<string, string>;
type LocaleTranslations = Partial<Record<Locale, TranslationDict>>;

interface I18nContext {
  locale: ComputedRef<Locale>;
  t: (key: string, params?: Record<string, string>) => string;
  setLocale: (locale: Locale) => void;
  registerTranslations: (translations: LocaleTranslations) => void;
}

const I18N_KEY: InjectionKey<I18nContext> = Symbol('i18n');

const translations: Record<Locale, TranslationDict> = reactive({
  'en-US': {},
  'zh-CN': {},
});

export { translations };

const currentLocale = ref<Locale>('en-US');

export { currentLocale };

export function registerTranslations(pluginTranslations: LocaleTranslations): void {
  for (const locale of Object.keys(translations) as Locale[]) {
    const pluginDict = pluginTranslations[locale];
    if (pluginDict) {
      Object.assign(translations[locale], pluginDict);
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
    let result = translations[locale.value][key] ?? key;
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

  const registerTranslations = (pluginTranslations: LocaleTranslations): void => {
    for (const loc of Object.keys(translations) as Locale[]) {
      const pluginDict = pluginTranslations[loc];
      if (pluginDict) {
        Object.assign(translations[loc], pluginDict);
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
