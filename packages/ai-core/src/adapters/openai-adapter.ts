import { fetch } from '@tauri-apps/plugin-http';
import type { AIAdapter, ChatOptions, ChatMessage, ModelConfig, StreamChunk } from '../service';

interface StreamChatOptions {
  messages: ChatMessage[];
  config: ModelConfig;
  options: ChatOptions;
}

export class OpenAIAdapter implements AIAdapter {
  async *streamChat(
    { messages, config, options }: StreamChatOptions
  ): AsyncGenerator<StreamChunk> {
    const response = await fetch(`${config.apiUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.name,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: true,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            yield { content: '', done: true };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield { content, done: false };
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { content: '', done: true };
  }
}

export const openaiAdapter = new OpenAIAdapter();
