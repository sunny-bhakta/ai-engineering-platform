import { AnthropicChatModel } from './providers/anthropic.provider.js';

import { GeminiChatModel } from './providers/gemini.provider.js';

import { GroqChatModel } from './providers/groq.provider.js';

import { OpenAIChatModel } from './providers/openai.provider.js';

import type { AIConfig, AIProvider, ChatModel } from './types.js';

export interface AIClient {
  chatModel(provider?: AIProvider): ChatModel;
}

export function createAIClient(config: AIConfig): AIClient {
  const models = new Map<AIProvider, ChatModel>();

  if (config.openai.apiKey) {
    models.set('openai', new OpenAIChatModel(config));
  }

  if (config.anthropic.apiKey) {
    models.set('anthropic', new AnthropicChatModel(config));
  }

  if (config.gemini.apiKey) {
    models.set('gemini', new GeminiChatModel(config));
  }

  if (config.groq.apiKey) {
    models.set('groq', new GroqChatModel(config));
  }

  return {
    chatModel(provider = config.defaultProvider): ChatModel {
      const model = models.get(provider);

      if (!model) {
        throw new Error(`AI provider "${provider}" is not configured`);
      }

      return model;
    },
  };
}
