import { fetch } from '@tauri-apps/plugin-http';
import type { ChatMessage, AIChatSettings, AIProvider } from '../types/chat';
import { getModelsByProvider } from '../components/models';

export interface AIStreamCallbacks {
  onChunk: (chunk: string) => void;
  onComplete: (fullContent: string) => void;
  onError: (error: Error) => void;
}

export class AIService {
  async sendMessage(
    content: string,
    messages: ChatMessage[],
    settings: AIChatSettings,
    model: string,
    maxTokens: number,
    callbacks: AIStreamCallbacks
  ): Promise<void> {
    const provider = this.getProviderFromModel(model);

    switch (provider) {
      case 'openai':
      case 'xai':
      case 'mistral':
        await this.sendOpenAICompatibleStream(content, messages, settings, model, maxTokens, callbacks);
        break;
      case 'anthropic':
        await this.sendAnthropicStream(content, messages, settings, model, maxTokens, callbacks);
        break;
      case 'google':
        await this.sendGeminiStream(content, messages, settings, model, maxTokens, callbacks);
        break;
      default:
        callbacks.onError(new Error(`Unsupported provider: ${provider}`));
    }
  }

  private getProviderFromModel(modelId: string): AIProvider {
    const models = getModelsByProvider('openai');
    if (models.find(m => m.id === modelId)) return 'openai';

    const anthropicModels = getModelsByProvider('anthropic');
    if (anthropicModels.find(m => m.id === modelId)) return 'anthropic';

    const googleModels = getModelsByProvider('google');
    if (googleModels.find(m => m.id === modelId)) return 'google';

    const xaiModels = getModelsByProvider('xai');
    if (xaiModels.find(m => m.id === modelId)) return 'xai';

    const mistralModels = getModelsByProvider('mistral');
    if (mistralModels.find(m => m.id === modelId)) return 'mistral';

    return 'openai';
  }

  private getApiUrl(provider: AIProvider, customUrl: string): string {
    if (customUrl) return customUrl;

    switch (provider) {
      case 'openai':
        return 'https://api.openai.com/v1/chat/completions';
      case 'anthropic':
        return 'https://api.anthropic.com/v1/messages';
      case 'google':
        return 'https://generativelanguage.googleapis.com/v1beta/models';
      case 'xai':
        return 'https://api.x.ai/v1/chat/completions';
      case 'mistral':
        return 'https://api.mistral.ai/v1/chat/completions';
      default:
        return 'https://api.openai.com/v1/chat/completions';
    }
  }

  private getHeaders(provider: AIProvider, apiKey: string, _model: string): Record<string, string> {
    switch (provider) {
      case 'openai':
      case 'xai':
      case 'mistral':
        return {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        };
      case 'anthropic':
        return {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        };
      case 'google':
        return {
          'Content-Type': 'application/json',
        };
      default:
        return {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        };
    }
  }

  private async sendOpenAICompatibleStream(
    content: string,
    messages: ChatMessage[],
    settings: AIChatSettings,
    model: string,
    maxTokens: number,
    callbacks: AIStreamCallbacks
  ): Promise<void> {
    const provider = this.getProviderFromModel(model);
    const apiUrl = this.getApiUrl(provider, settings.apiUrl);
    const headers = this.getHeaders(provider, settings.apiKey, model);

    // Build messages
    const requestMessages = this.buildMessages(content, messages, settings);

    try {
      let url = apiUrl;
      if (provider === 'google') {
        url = `${apiUrl}/${model}:streamGenerateContent?key=${settings.apiKey}`;
      } else {
        url = `${apiUrl}`;
      }

      const body: Record<string, unknown> = {
        model,
        messages: requestMessages,
        max_tokens: maxTokens,
        stream: true,
      };

      if (provider === 'google') {
        body.contents = this.buildGeminiContents(requestMessages);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`${provider} API error: ${response.status}`);
      }

      await this.parseOpenAISSEStream(response, callbacks);

    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async sendAnthropicStream(
    content: string,
    messages: ChatMessage[],
    settings: AIChatSettings,
    model: string,
    maxTokens: number,
    callbacks: AIStreamCallbacks
  ): Promise<void> {
    const anthropicMessages = this.buildAnthropicMessages(content, messages);

    const body: Record<string, unknown> = {
      model,
      messages: anthropicMessages,
      max_tokens: maxTokens,
      stream: true,
    };

    if (settings.systemPrompt) {
      body.system = settings.systemPrompt;
    }

    try {
      const apiUrl = this.getApiUrl('anthropic', settings.apiUrl);
      const headers = this.getHeaders('anthropic', settings.apiKey, model);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      await this.parseAnthropicSSE(response, callbacks);

    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async sendGeminiStream(
    content: string,
    messages: ChatMessage[],
    settings: AIChatSettings,
    model: string,
    _maxTokens: number,
    callbacks: AIStreamCallbacks
  ): Promise<void> {
    const requestMessages = this.buildMessages(content, messages, settings);
    const geminiContents = this.buildGeminiContents(requestMessages);

    try {
      const apiUrl = `${this.getApiUrl('google', settings.apiUrl)}/${model}:streamGenerateContent?key=${settings.apiKey}`;
      const headers = this.getHeaders('google', settings.apiKey, model);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ contents: geminiContents }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      await this.parseGeminiStream(response, callbacks);

    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private buildMessages(content: string, messages: ChatMessage[], settings: AIChatSettings) {
    const requestMessages: { role: string; content: string }[] = [];

    if (settings.systemPrompt) {
      requestMessages.push({ role: 'system', content: settings.systemPrompt });
    }

    for (const msg of messages) {
      if (msg.role === 'system') continue;
      requestMessages.push({ role: msg.role, content: msg.content });
    }

    requestMessages.push({ role: 'user', content });
    return requestMessages;
  }

  private buildAnthropicMessages(content: string, messages: ChatMessage[]) {
    const anthropicMessages: { role: string; content: string }[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') continue;
      anthropicMessages.push({ role: msg.role, content: msg.content });
    }

    anthropicMessages.push({ role: 'user', content });
    return anthropicMessages;
  }

  private buildGeminiContents(messages: { role: string; content: string }[]) {
    const contents: { role: string; parts: { text: string }[] }[] = [];

    for (const msg of messages) {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      contents.push({
        role,
        parts: [{ text: msg.content }],
      });
    }

    return contents;
  }

  private async parseOpenAISSEStream(
    response: Response,
    callbacks: AIStreamCallbacks
  ): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              callbacks.onChunk(delta);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }

    callbacks.onComplete(fullContent);
  }

  private async parseAnthropicSSE(
    response: Response,
    callbacks: AIStreamCallbacks
  ): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          try {
            const json = JSON.parse(data);

            if (json.type === 'content_block_delta') {
              const text = json.delta?.text;
              if (text) {
                fullContent += text;
                callbacks.onChunk(text);
              }
            }

            if (json.type === 'message_stop') {
              callbacks.onComplete(fullContent);
              return;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }

    callbacks.onComplete(fullContent);
  }

  private async parseGeminiStream(
    response: Response,
    callbacks: AIStreamCallbacks
  ): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          try {
            const json = JSON.parse(data);
            const candidates = json.candidates;
            if (candidates && candidates[0]?.content?.parts) {
              for (const part of candidates[0].content.parts) {
                if (part.text) {
                  fullContent += part.text;
                  callbacks.onChunk(part.text);
                }
              }
            }
            if (json.done) {
              callbacks.onComplete(fullContent);
              return;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }

    callbacks.onComplete(fullContent);
  }
}

export const aiService = new AIService();
