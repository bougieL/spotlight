export type EndpointType = 'openai' | 'anthropic' | 'openai-compatible';

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  endpointType: EndpointType;
  apiUrl: string;
  apiKey: string;
  maxContext: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  title: string;
  modelId: string;
  systemPrompt: string;
  messages: ChatMessage[];
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AIChatSettings {
  selectedSessionId: string | null;
  temperature: number;
  maxTokens: number;
}

export interface StreamChunk {
  content: string;
  done: boolean;
}
