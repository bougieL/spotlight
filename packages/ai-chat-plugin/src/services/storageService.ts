import type { ChatSession, AIChatSettings } from '../types/chat';
import { DEFAULT_SETTINGS } from '../types/chat';
import { createPluginStorage, type PluginStorage } from '@spotlight/api';

const PLUGIN_NAME = 'ai-chat';
const SESSIONS_KEY = 'sessions';
const CURRENT_SESSION_KEY = 'current_session';
const SETTINGS_KEY = 'settings';

export class StorageService {
  private storage: PluginStorage;

  constructor() {
    this.storage = createPluginStorage(PLUGIN_NAME);
  }

  async loadSessions(): Promise<ChatSession[]> {
    try {
      const stored = await this.storage.get<ChatSession[]>(SESSIONS_KEY, []);
      return stored;
    } catch {
      return [];
    }
  }

  async saveSessions(sessions: ChatSession[]): Promise<void> {
    await this.storage.set(SESSIONS_KEY, sessions);
  }

  async getCurrentSessionId(): Promise<string | null> {
    try {
      return await this.storage.get<string | null>(CURRENT_SESSION_KEY, null);
    } catch {
      return null;
    }
  }

  async setCurrentSessionId(id: string): Promise<void> {
    await this.storage.set(CURRENT_SESSION_KEY, id);
  }

  async loadSettings(): Promise<AIChatSettings> {
    try {
      const stored = await this.storage.get<AIChatSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
      return { ...DEFAULT_SETTINGS, ...stored };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: AIChatSettings): Promise<void> {
    await this.storage.set(SETTINGS_KEY, settings);
  }
}

export const storageService = new StorageService();
