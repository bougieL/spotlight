import { MessageSquare } from 'lucide-vue-next';
import { defineAsyncComponent } from 'vue';
import type { Component } from 'vue';
import type { SearchResultItem, SearchResultItemContext, SearchParams, RenderParams } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { createPluginStorage, type PluginStorage, tauriApi, type AIChatMessage } from '@spotlight/api';
import { pluginRegistry } from '@spotlight/plugin-registry';
import { registerTranslations, translations, getLocale } from '@spotlight/i18n';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const PLUGIN_NAME = 'ai-chat';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AIChatSettings {
  apiUrl: string;
  apiKey: string;
  endpointType: 'openai' | 'anthropic';
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

const DEFAULT_SETTINGS: AIChatSettings = {
  apiUrl: '',
  apiKey: '',
  endpointType: 'openai',
  model: '',
  temperature: 0.7,
  maxTokens: 1024,
  systemPrompt: '',
};

const STORAGE_KEY = 'ai_chat_messages';
const SETTINGS_KEY = 'ai_chat_settings';

export class AIChatPlugin extends BasePlugin {
  name = PLUGIN_NAME;
  version = '1.0.0';
  description = 'AI Chat with OpenAI and Anthropic endpoints';
  author = 'Spotlight Team';

  private storage: PluginStorage = createPluginStorage(this.name);
  private currentMessages: ChatMessage[] = [];

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

  async getSettings(): Promise<AIChatSettings> {
    const stored = await this.storage.get<AIChatSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...stored };
  }

  async saveSettings(settings: AIChatSettings): Promise<void> {
    await this.storage.set(SETTINGS_KEY, settings);
  }

  async getMessages(): Promise<ChatMessage[]> {
    const stored = await this.storage.get<ChatMessage[]>(STORAGE_KEY, []);
    return stored;
  }

  async saveMessages(messages: ChatMessage[]): Promise<void> {
    await this.storage.set(STORAGE_KEY, messages);
  }

  async clearMessages(): Promise<void> {
    this.currentMessages = [];
    await this.storage.set(STORAGE_KEY, []);
  }

  async sendMessage(content: string, settings: AIChatSettings): Promise<string> {
    const messages: AIChatMessage[] = [];

    if (settings.systemPrompt) {
      messages.push({
        role: 'system',
        content: settings.systemPrompt,
      });
    }

    for (const msg of this.currentMessages) {
      if (msg.role === 'system') continue;
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    messages.push({
      role: 'user',
      content,
    });

    const request = {
      endpoint_type: settings.endpointType,
      api_url: settings.apiUrl,
      api_key: settings.apiKey,
      messages,
      model: settings.model || undefined,
      max_tokens: settings.maxTokens,
      temperature: settings.temperature,
    };

    const response = await tauriApi.aiChat(request);
    return response.content;
  }

  addMessage(role: 'user' | 'assistant', content: string): ChatMessage {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: Date.now(),
    };
    this.currentMessages.push(message);
    return message;
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim().toLowerCase();
    const t = translations[getLocale()];

    const keywords = ['ai', 'chat', 'gpt', 'claude', 'openai', 'anthropic', 'aichat', '聊天', '人工智能'];

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
