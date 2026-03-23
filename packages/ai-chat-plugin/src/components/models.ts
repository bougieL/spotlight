// Predefined models with context windows
export interface ModelConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'xai' | 'mistral';
  contextWindow: number; // tokens
  defaultMaxTokens: number;
  apiFormat?: 'openai' | 'anthropic' | 'gemini'; // API compatibility
}

export const OPENAI_MODELS: ModelConfig[] = [
  // GPT-5 Series (Latest 2026)
  { id: 'gpt-5', name: 'GPT-5', provider: 'openai', contextWindow: 200000, defaultMaxTokens: 16384, apiFormat: 'openai' },
  { id: 'gpt-5-turbo', name: 'GPT-5 Turbo', provider: 'openai', contextWindow: 200000, defaultMaxTokens: 16384, apiFormat: 'openai' },
  { id: 'gpt-5.4', name: 'GPT-5.4', provider: 'openai', contextWindow: 200000, defaultMaxTokens: 16384, apiFormat: 'openai' },
  { id: 'gpt-5.3-pro', name: 'GPT-5.3 Pro', provider: 'openai', contextWindow: 200000, defaultMaxTokens: 16384, apiFormat: 'openai' },
  { id: 'gpt-5.3-codex-spark', name: 'GPT-5.3 Codex Spark', provider: 'openai', contextWindow: 100000, defaultMaxTokens: 8192, apiFormat: 'openai' },
  { id: 'gpt-5.2', name: 'GPT-5.2', provider: 'openai', contextWindow: 200000, defaultMaxTokens: 16384, apiFormat: 'openai' },

  // GPT-4o Series
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', contextWindow: 128000, defaultMaxTokens: 4096, apiFormat: 'openai' },
  { id: 'gpt-4o-2024-05-13', name: 'GPT-4o (May 2024)', provider: 'openai', contextWindow: 128000, defaultMaxTokens: 4096, apiFormat: 'openai' },
  { id: 'gpt-4o-2024-08-06', name: 'GPT-4o (Aug 2024)', provider: 'openai', contextWindow: 128000, defaultMaxTokens: 4096, apiFormat: 'openai' },
  { id: 'gpt-4o-2024-11-20', name: 'GPT-4o (Nov 2024)', provider: 'openai', contextWindow: 128000, defaultMaxTokens: 4096, apiFormat: 'openai' },
  { id: 'gpt-4o-2025-03-26', name: 'GPT-4o (Mar 2025)', provider: 'openai', contextWindow: 128000, defaultMaxTokens: 4096, apiFormat: 'openai' },
  { id: 'chatgpt-4o-latest', name: 'ChatGPT-4o Latest', provider: 'openai', contextWindow: 128000, defaultMaxTokens: 4096, apiFormat: 'openai' },

  // GPT-4o Mini Series
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', contextWindow: 128000, defaultMaxTokens: 4096, apiFormat: 'openai' },
  { id: 'gpt-4o-mini-2024-07-18', name: 'GPT-4o Mini (Jul 2024)', provider: 'openai', contextWindow: 128000, defaultMaxTokens: 4096, apiFormat: 'openai' },

  // GPT-4.5 Series
  { id: 'gpt-4.5', name: 'GPT-4.5', provider: 'openai', contextWindow: 128000, defaultMaxTokens: 8192, apiFormat: 'openai' },

  // GPT-4 Turbo Series
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', contextWindow: 128000, defaultMaxTokens: 4096, apiFormat: 'openai' },
  { id: 'gpt-4-turbo-2024-04-09', name: 'GPT-4 Turbo (Apr 2024)', provider: 'openai', contextWindow: 128000, defaultMaxTokens: 4096, apiFormat: 'openai' },
  { id: 'gpt-4-turbo-2024-07-18', name: 'GPT-4 Turbo (Jul 2024)', provider: 'openai', contextWindow: 128000, defaultMaxTokens: 4096, apiFormat: 'openai' },

  // GPT-4 Series
  { id: 'gpt-4', name: 'GPT-4', provider: 'openai', contextWindow: 8192, defaultMaxTokens: 2048, apiFormat: 'openai' },
  { id: 'gpt-4-0613', name: 'GPT-4 (Jun 2023)', provider: 'openai', contextWindow: 8192, defaultMaxTokens: 2048, apiFormat: 'openai' },
  { id: 'gpt-4-32k', name: 'GPT-4 32K', provider: 'openai', contextWindow: 32768, defaultMaxTokens: 8192, apiFormat: 'openai' },
  { id: 'gpt-4-32k-0613', name: 'GPT-4 32K (Jun 2023)', provider: 'openai', contextWindow: 32768, defaultMaxTokens: 8192, apiFormat: 'openai' },

  // GPT-3.5 Turbo Series
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', contextWindow: 16385, defaultMaxTokens: 4096, apiFormat: 'openai' },
  { id: 'gpt-3.5-turbo-1106', name: 'GPT-3.5 Turbo (Nov 2024)', provider: 'openai', contextWindow: 16385, defaultMaxTokens: 4096, apiFormat: 'openai' },
  { id: 'gpt-3.5-turbo-0125', name: 'GPT-3.5 Turbo (Jan 2025)', provider: 'openai', contextWindow: 16385, defaultMaxTokens: 4096, apiFormat: 'openai' },
];

export const ANTHROPIC_MODELS: ModelConfig[] = [
  // Claude 4 Series (Latest 2025-2026)
  { id: 'claude-opus-4.5', name: 'Claude Opus 4.5', provider: 'anthropic', contextWindow: 200000, defaultMaxTokens: 8192, apiFormat: 'anthropic' },
  { id: 'claude-opus-4-5-20251114', name: 'Claude Opus 4.5 (Nov 2025)', provider: 'anthropic', contextWindow: 200000, defaultMaxTokens: 8192, apiFormat: 'anthropic' },
  { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', provider: 'anthropic', contextWindow: 200000, defaultMaxTokens: 8192, apiFormat: 'anthropic' },
  { id: 'claude-sonnet-4-5-20251114', name: 'Claude Sonnet 4.5 (Nov 2025)', provider: 'anthropic', contextWindow: 200000, defaultMaxTokens: 8192, apiFormat: 'anthropic' },
  { id: 'claude-opus-4', name: 'Claude Opus 4', provider: 'anthropic', contextWindow: 200000, defaultMaxTokens: 8192, apiFormat: 'anthropic' },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'anthropic', contextWindow: 200000, defaultMaxTokens: 8192, apiFormat: 'anthropic' },

  // Claude 3.7 Series (Hybrid Reasoning)
  { id: 'claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'anthropic', contextWindow: 200000, defaultMaxTokens: 8192, apiFormat: 'anthropic' },
  { id: 'claude-3.7-sonnet-20250220', name: 'Claude 3.7 Sonnet (Feb 2025)', provider: 'anthropic', contextWindow: 200000, defaultMaxTokens: 8192, apiFormat: 'anthropic' },

  // Claude 3.5 Series
  { id: 'claude-3.5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic', contextWindow: 200000, defaultMaxTokens: 8192, apiFormat: 'anthropic' },
  { id: 'claude-3.5-sonnet-20240620', name: 'Claude 3.5 Sonnet (Jun 2024)', provider: 'anthropic', contextWindow: 200000, defaultMaxTokens: 8192, apiFormat: 'anthropic' },
  { id: 'claude-3.5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic', contextWindow: 200000, defaultMaxTokens: 8192, apiFormat: 'anthropic' },
  { id: 'claude-3.5-haiku-20240620', name: 'Claude 3.5 Haiku (Jun 2024)', provider: 'anthropic', contextWindow: 200000, defaultMaxTokens: 8192, apiFormat: 'anthropic' },

  // Claude 3 Series
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic', contextWindow: 200000, defaultMaxTokens: 4096, apiFormat: 'anthropic' },
  { id: 'claude-3-opus-20231120', name: 'Claude 3 Opus (Nov 2023)', provider: 'anthropic', contextWindow: 200000, defaultMaxTokens: 4096, apiFormat: 'anthropic' },
  { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', provider: 'anthropic', contextWindow: 200000, defaultMaxTokens: 4096, apiFormat: 'anthropic' },
  { id: 'claude-3-sonnet-20231120', name: 'Claude 3 Sonnet (Nov 2023)', provider: 'anthropic', contextWindow: 200000, defaultMaxTokens: 4096, apiFormat: 'anthropic' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic', contextWindow: 200000, defaultMaxTokens: 4096, apiFormat: 'anthropic' },
];

export const GOOGLE_MODELS: ModelConfig[] = [
  // Gemini 2.5 Series (Latest)
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google', contextWindow: 2000000, defaultMaxTokens: 8192, apiFormat: 'gemini' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google', contextWindow: 1000000, defaultMaxTokens: 8192, apiFormat: 'gemini' },

  // Gemini 2.0 Series
  { id: 'gemini-2.0-pro', name: 'Gemini 2.0 Pro', provider: 'google', contextWindow: 2000000, defaultMaxTokens: 8192, apiFormat: 'gemini' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google', contextWindow: 1000000, defaultMaxTokens: 8192, apiFormat: 'gemini' },
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Exp', provider: 'google', contextWindow: 1000000, defaultMaxTokens: 8192, apiFormat: 'gemini' },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', provider: 'google', contextWindow: 1000000, defaultMaxTokens: 8192, apiFormat: 'gemini' },

  // Gemini 1.5 Series
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google', contextWindow: 2000000, defaultMaxTokens: 8192, apiFormat: 'gemini' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google', contextWindow: 1000000, defaultMaxTokens: 8192, apiFormat: 'gemini' },
  { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B', provider: 'google', contextWindow: 1000000, defaultMaxTokens: 8192, apiFormat: 'gemini' },

  // Gemini 1.0 Series
  { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', provider: 'google', contextWindow: 32768, defaultMaxTokens: 4096, apiFormat: 'gemini' },
  { id: 'gemini-1.0-ultra', name: 'Gemini 1.0 Ultra', provider: 'google', contextWindow: 32768, defaultMaxTokens: 4096, apiFormat: 'gemini' },
];

export const XAI_MODELS: ModelConfig[] = [
  // Grok 4 Series (Latest)
  { id: 'grok-4.2', name: 'Grok 4.2', provider: 'xai', contextWindow: 131072, defaultMaxTokens: 8192, apiFormat: 'openai' },
  { id: 'grok-4.1', name: 'Grok 4.1', provider: 'xai', contextWindow: 131072, defaultMaxTokens: 8192, apiFormat: 'openai' },
  { id: 'grok-4', name: 'Grok 4', provider: 'xai', contextWindow: 131072, defaultMaxTokens: 8192, apiFormat: 'openai' },

  // Grok 3 Series
  { id: 'grok-3', name: 'Grok 3', provider: 'xai', contextWindow: 131072, defaultMaxTokens: 8192, apiFormat: 'openai' },
  { id: 'grok-3-beta', name: 'Grok 3 Beta', provider: 'xai', contextWindow: 131072, defaultMaxTokens: 8192, apiFormat: 'openai' },

  // Grok 2 Series
  { id: 'grok-2', name: 'Grok 2', provider: 'xai', contextWindow: 131072, defaultMaxTokens: 4096, apiFormat: 'openai' },
  { id: 'grok-2-mini', name: 'Grok 2 Mini', provider: 'xai', contextWindow: 131072, defaultMaxTokens: 4096, apiFormat: 'openai' },

  // Grok 1 Series
  { id: 'grok-1.5', name: 'Grok 1.5', provider: 'xai', contextWindow: 131072, defaultMaxTokens: 4096, apiFormat: 'openai' },
  { id: 'grok-1', name: 'Grok 1', provider: 'xai', contextWindow: 131072, defaultMaxTokens: 4096, apiFormat: 'openai' },
  { id: 'grok-beta', name: 'Grok Beta', provider: 'xai', contextWindow: 131072, defaultMaxTokens: 4096, apiFormat: 'openai' },
];

export const MISTRAL_MODELS: ModelConfig[] = [
  // Mistral Small Series (Latest 2026)
  { id: 'mistral-small-4', name: 'Mistral Small 4', provider: 'mistral', contextWindow: 131072, defaultMaxTokens: 4096, apiFormat: 'openai' },

  // Mistral 3 Series
  { id: 'mistral-large-3', name: 'Mistral Large 3', provider: 'mistral', contextWindow: 131072, defaultMaxTokens: 4096, apiFormat: 'openai' },
  { id: 'mistral-3', name: 'Mistral 3', provider: 'mistral', contextWindow: 131072, defaultMaxTokens: 4096, apiFormat: 'openai' },

  // Mistral Large Series
  { id: 'mistral-large', name: 'Mistral Large', provider: 'mistral', contextWindow: 131072, defaultMaxTokens: 4096, apiFormat: 'openai' },
  { id: 'mistral-large-2407', name: 'Mistral Large (Jul 2024)', provider: 'mistral', contextWindow: 131072, defaultMaxTokens: 4096, apiFormat: 'openai' },
  { id: 'mistral-large-2411', name: 'Mistral Large (Nov 2024)', provider: 'mistral', contextWindow: 131072, defaultMaxTokens: 4096, apiFormat: 'openai' },

  // Mistral Medium/Small Series
  { id: 'mistral-medium', name: 'Mistral Medium', provider: 'mistral', contextWindow: 32768, defaultMaxTokens: 4096, apiFormat: 'openai' },
  { id: 'mistral-small', name: 'Mistral Small', provider: 'mistral', contextWindow: 32768, defaultMaxTokens: 4096, apiFormat: 'openai' },

  // Mistral 7B Series
  { id: 'mistral-7b-instruct', name: 'Mistral 7B Instruct', provider: 'mistral', contextWindow: 32768, defaultMaxTokens: 4096, apiFormat: 'openai' },
  { id: 'mistral-7b-sae', name: 'Mistral 7B', provider: 'mistral', contextWindow: 32768, defaultMaxTokens: 4096, apiFormat: 'openai' },

  // Mixtral Series
  { id: 'mixtral-8x7b-instruct', name: 'Mixtral 8x7B Instruct', provider: 'mistral', contextWindow: 32768, defaultMaxTokens: 4096, apiFormat: 'openai' },
  { id: 'mixtral-8x22b-instruct', name: 'Mixtral 8x22B Instruct', provider: 'mistral', contextWindow: 65536, defaultMaxTokens: 4096, apiFormat: 'openai' },

  // Codestral
  { id: 'codestral', name: 'Codestral', provider: 'mistral', contextWindow: 65536, defaultMaxTokens: 4096, apiFormat: 'openai' },

  // Mathstral
  { id: 'mathstral', name: 'Mathstral', provider: 'mistral', contextWindow: 32768, defaultMaxTokens: 4096, apiFormat: 'openai' },
];

export const ALL_MODELS: ModelConfig[] = [
  ...OPENAI_MODELS,
  ...ANTHROPIC_MODELS,
  ...GOOGLE_MODELS,
  ...XAI_MODELS,
  ...MISTRAL_MODELS,
];

export function getModelById(id: string): ModelConfig | undefined {
  return ALL_MODELS.find(m => m.id === id);
}

export function getModelsByProvider(provider: 'openai' | 'anthropic' | 'google' | 'xai' | 'mistral'): ModelConfig[] {
  return ALL_MODELS.filter(m => m.provider === provider);
}

export function getModelsByApiFormat(apiFormat: 'openai' | 'anthropic' | 'gemini'): ModelConfig[] {
  return ALL_MODELS.filter(m => m.apiFormat === apiFormat);
}

export function formatContextWindow(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(0)}K`;
  }
  return tokens.toString();
}
