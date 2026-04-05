import type { SearchResultItem, SearchParams, PluginActions, ActionContext } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { registerTranslations, useI18n } from '@spotlight/i18n';
import { createPluginStorage, type PluginStorage } from '@spotlight/api';
import { normalizeForSearch, toPinyinInitials, matchKeyword } from '@spotlight/utils/pinyin';
import type { ModelConfig, ChatMessage, Session, AIChatSettings } from '@spotlight/ai-core';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const aiChatIconUrl = new URL('./assets/chat.svg', import.meta.url).href;

const ACTION_OPEN = 'open';
const ACTION_OPEN_MODELS = 'open_models';

const STORAGE_KEYS = {
  models: 'models',
  sessions: 'sessions',
  settings: 'settings',
} as const;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

class AIChatPlugin extends BasePlugin {
  private readonly i18n = useI18n();

  get name(): string {
    return this.i18n.t('aiChat.name');
  }
  get description(): string | undefined {
    return this.i18n.t('aiChat.description');
  }
  iconUrl = aiChatIconUrl;
  pluginId = 'ai-chat-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  private storage: PluginStorage = createPluginStorage(this.pluginId);

  registerAction(ctx: ActionContext): PluginActions {
    return {
      [ACTION_OPEN]: async () => {
        ctx.navigateToPlugin(this.pluginId);
      },
      [ACTION_OPEN_MODELS]: async () => {
        ctx.navigateToPlugin(this.pluginId, { route: 'models' });
      },
    };
  }

  async getModels(): Promise<ModelConfig[]> {
    return this.storage.get<ModelConfig[]>(STORAGE_KEYS.models, []);
  }

  async saveModels(models: ModelConfig[]): Promise<void> {
    await this.storage.set(STORAGE_KEYS.models, models);
  }

  async getSessions(): Promise<Session[]> {
    return this.storage.get<Session[]>(STORAGE_KEYS.sessions, []);
  }

  async saveSessions(sessions: Session[]): Promise<void> {
    await this.storage.set(STORAGE_KEYS.sessions, sessions);
  }

  async getSettings(): Promise<AIChatSettings> {
    return this.storage.get<AIChatSettings>(STORAGE_KEYS.settings, {
      selectedSessionId: null,
      temperature: 0.7,
      maxTokens: 4096,
    });
  }

  async saveSettings(settings: AIChatSettings): Promise<void> {
    await this.storage.set(STORAGE_KEYS.settings, settings);
  }

  async createSession(modelId: string, systemPrompt: string = ''): Promise<Session> {
    const sessions = await this.getSessions();
    const session: Session = {
      id: generateId(),
      title: '',
      modelId,
      systemPrompt,
      messages: [],
      isPinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    sessions.push(session);
    await this.saveSessions(sessions);

    const settings = await this.getSettings();
    settings.selectedSessionId = session.id;
    await this.saveSettings(settings);

    return session;
  }

  async updateSession(sessionId: string, updates: Partial<Pick<Session, 'title' | 'modelId' | 'systemPrompt' | 'isPinned'>>): Promise<void> {
    const sessions = await this.getSessions();
    const index = sessions.findIndex(s => s.id === sessionId);
    if (index !== -1) {
      sessions[index] = {
        ...sessions[index],
        ...updates,
        updatedAt: Date.now(),
      };
      if (updates.title) {
        sessions[index].title = updates.title;
      }
      await this.saveSessions(sessions);
    }
  }

  async addMessage(sessionId: string, message: ChatMessage): Promise<void> {
    const sessions = await this.getSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      session.messages.push(message);
      session.updatedAt = Date.now();

      if (session.messages.filter(m => m.role === 'user').length === 1) {
        const firstUserMessage = session.messages.find(m => m.role === 'user');
        if (firstUserMessage) {
          session.title = firstUserMessage.content.substring(0, 50);
        }
      }

      await this.saveSessions(sessions);
    }
  }

  async clearSession(sessionId: string): Promise<void> {
    const sessions = await this.getSessions();
    const index = sessions.findIndex(s => s.id === sessionId);
    if (index !== -1) {
      sessions[index].messages = [];
      sessions[index].updatedAt = Date.now();
      await this.saveSessions(sessions);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const sessions = await this.getSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    await this.saveSessions(filtered);

    const settings = await this.getSettings();
    if (settings.selectedSessionId === sessionId) {
      settings.selectedSessionId = null;
      await this.saveSettings(settings);
    }
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim().toLowerCase();

    const keywords = [
      { keyword: 'chat', normalized: normalizeForSearch('chat') },
      { keyword: 'ai', normalized: normalizeForSearch('ai') },
      { keyword: 'ai chat', normalized: normalizeForSearch('ai chat') },
      { keyword: 'gpt', normalized: normalizeForSearch('gpt') },
      { keyword: 'claude', normalized: normalizeForSearch('claude') },
      { keyword: '聊天', normalized: normalizeForSearch('聊天'), pinyinInitials: toPinyinInitials('聊天') },
      { keyword: 'ai聊天', normalized: normalizeForSearch('ai聊天'), pinyinInitials: toPinyinInitials('ai聊天') },
      { keyword: 'models', normalized: normalizeForSearch('models') },
      { keyword: 'model', normalized: normalizeForSearch('model') },
      { keyword: '模型', normalized: normalizeForSearch('模型'), pinyinInitials: toPinyinInitials('模型') },
    ];

    if (query.length > 0 && !matchKeyword(query, keywords)) {
      return [];
    }

    return [
      {
        iconUrl: aiChatIconUrl,
        title: this.name,
        score: 900,
        pluginId: this.pluginId,
        actionId: ACTION_OPEN,
        actionData: null,
      },
    ];
  }

  getPanelRoutes() {
    return [
      { name: 'main', componentLoader: () => import('./components/MainPanel.vue') },
      { name: 'models', componentLoader: () => import('./components/ModelsPanel.vue') },
    ];
  }
}

export const aiChatPlugin = new AIChatPlugin();
