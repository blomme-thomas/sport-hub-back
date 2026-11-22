import { Anthropic } from '@anthropic-ai/sdk';
import type { Provider } from '@nestjs/common';
import anthropicConfig, {
  type AnthropicConfig,
} from '../config/anthropic/anthropic.config.js';

export const ANTHROPIC_CLIENT = Symbol('ANTHROPIC_CLIENT');

export const anthropicClientProvider: Provider = {
  provide: ANTHROPIC_CLIENT,
  inject: [anthropicConfig.KEY],
  useFactory: (config: AnthropicConfig): Anthropic | null => {
    if (!config.apiKey) {
      return null;
    }
    return new Anthropic({
      apiKey: config.apiKey,
      timeout: config.timeoutMs,
      maxRetries: config.maxRetries,
      logLevel: 'off',
    });
  },
};
