import { fetch } from '@tauri-apps/plugin-http';
import type { AIAdapter, ChatOptions, ChatMessage, ModelConfig, StreamChunk } from '../service';

interface StreamChatOptions {
  messages: ChatMessage[];
  config: ModelConfig;
  options: ChatOptions;
}

export class AnthropicAdapter implements AIAdapter {
  async *streamChat(
    { messages, config, options }: StreamChatOptions
  ): AsyncGenerator<StreamChunk> {
    const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch(`${config.apiUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: config.name,
        messages: conversationMessages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        system: systemPrompt || undefined,
        stream: true,
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
            if (parsed.type === 'content_block_delta') {
              const content = parsed.delta?.text;
              if (content) {
                yield { content, done: false };
              }
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

export const anthropicAdapter = new AnthropicAdapter();
