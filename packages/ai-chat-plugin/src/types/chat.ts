export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  modelId: string;
  createdAt: number;
  updatedAt: number;
}

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'xai' | 'mistral';

export interface AIChatSettings {
  apiUrl: string;
  apiKey: string;
  provider: AIProvider;
  systemPrompt: string;
}

export const DEFAULT_SETTINGS: AIChatSettings = {
  apiUrl: '',
  apiKey: '',
  provider: 'openai',
  systemPrompt: '',
};
