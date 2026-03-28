import type { Component } from 'vue';
import type { SearchResultItem, SearchParams, PluginActions, ActionContext } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { registerTranslations, translations, getLocale } from '@spotlight/i18n';
import { createPluginStorage, type PluginStorage } from '@spotlight/api';
import { normalizeForSearch, toPinyinInitials, matchKeyword } from '@spotlight/utils/pinyin';
import logger from '@spotlight/logger';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

import type { ModelConfig } from '@spotlight/ai-core';
import { openaiAdapter, anthropicAdapter } from '@spotlight/ai-core';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const translationIconUrl = new URL('../assets/translation.svg', import.meta.url).href;

const STORAGE_KEY = 'translation_settings';
const ACTION_OPEN = 'open';
const ACTION_TRANSLATE = 'translate';
const ACTION_COPY = 'copy';
const TRANS_PREFIX_REGEX = /^(trans:|翻译:)\s*/i;

interface Language {
  code: string;
  name: string;
}

interface TranslationSettings {
  lastFromLang: string;
  lastToLang: string;
  selectedModelId: string | null;
}

const LANGUAGES: Language[] = [
  { code: 'auto', name: 'translation.auto' },
  { code: 'zh', name: 'language.zh' },
  { code: 'en', name: 'language.en' },
  { code: 'ja', name: 'language.ja' },
  { code: 'ko', name: 'language.ko' },
  { code: 'fr', name: 'language.fr' },
  { code: 'de', name: 'language.de' },
  { code: 'es', name: 'language.es' },
  { code: 'ru', name: 'language.ru' },
  { code: 'ar', name: 'language.ar' },
  { code: 'pt', name: 'language.pt' },
  { code: 'it', name: 'language.it' },
  { code: 'th', name: 'language.th' },
  { code: 'vi', name: 'language.vi' },
];

const LANGUAGE_NAMES: Record<string, string> = {
  auto: 'Auto',
  zh: 'Chinese',
  en: 'English',
  ja: 'Japanese',
  ko: 'Korean',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  ru: 'Russian',
  ar: 'Arabic',
  pt: 'Portuguese',
  it: 'Italian',
  th: 'Thai',
  vi: 'Vietnamese',
};

export class TranslationPlugin extends BasePlugin {
  get name(): string {
    return translations[getLocale()]['translation'] ?? 'Translation';
  }

  get description(): string | undefined {
    return translations[getLocale()]['plugin.description.translation'];
  }

  iconUrl = translationIconUrl;
  pluginId = 'translation-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  private storage: PluginStorage = createPluginStorage(this.pluginId);

  registerAction(ctx: ActionContext): PluginActions {
    const router = ctx.router;
    return {
      [ACTION_OPEN]: async () => {
        router.push({ name: this.pluginId });
      },
      [ACTION_TRANSLATE]: async (data) => {
        if (typeof data === 'string' && data) {
          try {
            await navigator.clipboard.writeText(data);
            logger.info('Translation result copied to clipboard:', data);
          } catch (error) {
            logger.error('Failed to copy translation to clipboard:', error);
          }
        }
        router.push({ name: this.pluginId });
      },
      [ACTION_COPY]: async (data) => {
        if (typeof data === 'string' && data) {
          try {
            await navigator.clipboard.writeText(data);
          } catch (error) {
            logger.error('Failed to copy to clipboard:', error);
          }
        }
      },
    };
  }

  async getSettings(): Promise<TranslationSettings> {
    return this.storage.get<TranslationSettings>(STORAGE_KEY, {
      lastFromLang: 'auto',
      lastToLang: getLocale() === 'zh-CN' ? 'en' : 'zh',
      selectedModelId: null,
    });
  }

  async saveSettings(settings: TranslationSettings): Promise<void> {
    await this.storage.set(STORAGE_KEY, settings);
  }

  async getLastLanguages(): Promise<{ from: string; to: string }> {
    const settings = await this.getSettings();
    return { from: settings.lastFromLang, to: settings.lastToLang };
  }

  async saveLanguages(from: string, to: string): Promise<void> {
    const settings = await this.getSettings();
    settings.lastFromLang = from;
    settings.lastToLang = to;
    await this.saveSettings(settings);
  }

  async getSelectedModelId(): Promise<string | null> {
    const settings = await this.getSettings();
    return settings.selectedModelId;
  }

  async setSelectedModelId(modelId: string): Promise<void> {
    const settings = await this.getSettings();
    settings.selectedModelId = modelId;
    await this.saveSettings(settings);
  }

  async getAvailableModels(): Promise<ModelConfig[]> {
    const aiStorage = createPluginStorage('ai-chat-plugin');
    return aiStorage.get<ModelConfig[]>('models', []);
  }

  async getSelectedModel(): Promise<ModelConfig | null> {
    const [settings, models] = await Promise.all([
      this.getSettings(),
      this.getAvailableModels(),
    ]);
    if (models.length === 0) {
      return null;
    }
    if (settings.selectedModelId) {
      const model = models.find((m) => m.id === settings.selectedModelId);
      if (model) return model;
    }
    return models[0] || null;
  }

  getLanguages(): Language[] {
    return LANGUAGES;
  }

  private buildTranslationPrompt({ text, fromLang, toLang }: { text: string; fromLang: string; toLang: string }): string {
    const fromName = LANGUAGE_NAMES[fromLang] || fromLang;
    const toName = LANGUAGE_NAMES[toLang] || toLang;

    if (fromLang === 'auto') {
      return `Detect the language of the following text and translate it to ${toName}.\nOnly output the translation, nothing else.\n\nText: ${text}`;
    }

    return `Translate the following text from ${fromName} to ${toName}.\nOnly output the translation, nothing else.\n\nText: ${text}`;
  }

  async translate({ text, fromLang, toLang }: { text: string; fromLang: string; toLang: string }): Promise<string | null> {
    if (!text.trim()) {
      return null;
    }

    const model = await this.getSelectedModel();
    if (!model) {
      logger.error('[Translation] No AI model available');
      return null;
    }

    try {
      const prompt = this.buildTranslationPrompt({ text, fromLang, toLang });
      const messages = [{ id: '1', role: 'user' as const, content: prompt, timestamp: Date.now() }];

      const chunks: string[] = [];

      if (model.endpointType === 'anthropic') {
        const adapter = anthropicAdapter;
        for await (const chunk of adapter.streamChat({ messages, config: model, options: { temperature: 0.3, maxTokens: 4096 } })) {
          if (chunk.content) {
            chunks.push(chunk.content);
          }
        }
      } else {
        const adapter = openaiAdapter;
        for await (const chunk of adapter.streamChat({ messages, config: model, options: { temperature: 0.3, maxTokens: 4096 } })) {
          if (chunk.content) {
            chunks.push(chunk.content);
          }
        }
      }

      const cleaned = chunks.join('').trim();
      logger.info('[Translation] Translated successfully');
      return cleaned;
    } catch (error) {
      logger.error('[Translation] Translation failed:', error);
      return null;
    }
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim();

    const keywords = [
      { keyword: 'translation', normalized: normalizeForSearch('translation') },
      { keyword: 'translate', normalized: normalizeForSearch('translate') },
      { keyword: '翻译', normalized: normalizeForSearch('翻译'), pinyinInitials: toPinyinInitials('翻译') },
      { keyword: 'trans', normalized: normalizeForSearch('trans') },
    ];

    if (matchKeyword(query, keywords)) {
      return [
        {
          iconUrl: translationIconUrl,
          title: this.name,
          score: 900,
          pluginId: this.pluginId,
          actionId: ACTION_OPEN,
          actionData: null,
        },
      ];
    }

    // Check if query starts with common translation triggers
    const match = query.match(TRANS_PREFIX_REGEX);
    if (match) {
      const textToTranslate = query.slice(match[0].length).trim();
      if (textToTranslate) {
        const lastLangs = await this.getLastLanguages();
        const translated = await this.translate({ text: textToTranslate, fromLang: lastLangs.from, toLang: lastLangs.to });
        if (translated) {
          return [
            {
              iconUrl: translationIconUrl,
              title: translated,
              desc: `${LANGUAGE_NAMES[lastLangs.from] || lastLangs.from} → ${LANGUAGE_NAMES[lastLangs.to] || lastLangs.to}`,
              score: 1000,
              pluginId: this.pluginId,
              actionId: ACTION_TRANSLATE,
              actionData: translated,
            },
          ];
        }
      }
    }

    return [];
  }

  getPanelComponentLoader(): () => Promise<Component> {
    return () => import('./components/TranslationPanel.vue');
  }
}

export const translationPlugin = new TranslationPlugin();
