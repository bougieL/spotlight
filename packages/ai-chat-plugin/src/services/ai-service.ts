import type { ChatMessage, ModelConfig, StreamChunk } from '../types';

export interface ChatOptions {
  temperature: number;
  maxTokens: number;
}

export interface AIAdapter {
  streamChat(
    messages: ChatMessage[],
    config: ModelConfig,
    options: ChatOptions
  ): AsyncGenerator<StreamChunk>;
}

export type { ChatMessage, ModelConfig, StreamChunk };
