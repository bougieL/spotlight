import { MessageSquare } from 'lucide-vue-next';
import { defineAsyncComponent } from 'vue';
import type { Component } from 'vue';
import type { SearchResultItem, SearchResultItemContext, SearchParams, RenderParams } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { pluginRegistry } from '@spotlight/plugin-registry';
import { registerTranslations, translations, getLocale } from '@spotlight/i18n';
import { aiService } from './services/aiService';
import type { AIChatSettings, ChatMessage } from './types/chat';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const PLUGIN_NAME = 'ai-chat';

export type { ChatMessage, ChatSession, AIChatSettings } from './types/chat';
export { DEFAULT_SETTINGS } from './types/chat';
export type { AIProvider } from './types/chat';

export class AIChatPlugin extends BasePlugin {
  name = PLUGIN_NAME;
  version = '1.0.0';
  description = 'AI Chat with multiple providers';
  author = 'Spotlight Team';

  constructor() {
    super();
    pluginRegistry.registerAction({
      pluginName: PLUGIN_NAME,
      actionId: 'open',
      handler: async (_data, ctx) => {
        const component = await this.render({ query: '' });
        if (component) {
          ctx.setPanel(component, this.name);
        }
      },
    });
  }

  getSettings(): AIChatSettings {
    const defaultSettings = {
      apiUrl: '',
      apiKey: '',
      provider: 'openai' as const,
      systemPrompt: '',
    };

    try {
      const stored = localStorage.getItem(`plugin_settings_${PLUGIN_NAME}`);
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  }

  saveSettings(settings: AIChatSettings): void {
    localStorage.setItem(`plugin_settings_${PLUGIN_NAME}`, JSON.stringify(settings));
  }

  sendMessage(
    content: string,
    messages: ChatMessage[],
    settings: AIChatSettings,
    model: string,
    maxTokens: number
  ): Promise<ChatMessage> {
    return new Promise((resolve, reject) => {
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      aiService.sendMessage(
        content,
        messages,
        settings,
        model,
        maxTokens,
        {
          onChunk: (chunk) => {
            assistantMessage.content += chunk;
          },
          onComplete: () => {
            resolve(assistantMessage);
          },
          onError: (error) => {
            reject(error);
          },
        }
      );
    });
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim().toLowerCase();
    const t = translations[getLocale()];

    const keywords = ['ai', 'chat', 'gpt', 'claude', 'openai', 'anthropic', 'gemini', 'grok', 'mistral', 'aichat', '聊天', '人工智能'];

    const isKeywordMatch = keywords.some(kw => query.includes(kw) || kw.includes(query));

    if (isKeywordMatch) {
      return [
        {
          icon: MessageSquare,
          iconComponentName: 'MessageSquare',
          title: t['aiChat'] ?? 'AI Chat',
          score: 900,
          sourcePlugin: PLUGIN_NAME,
          actionId: 'open',
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

    return [];
  }

  async render(_params: RenderParams): Promise<Component | null> {
    return defineAsyncComponent(() => import('./components/AIChatPanel.vue'));
  }
}

export const aiChatPlugin = new AIChatPlugin();
