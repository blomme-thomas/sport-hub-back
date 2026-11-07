import { registerAs, type ConfigType } from '@nestjs/config';
import { anthropicEnvSchema, parseEnv } from '../env.validation.js';

export const ANTHROPIC_CONFIG_KEY = 'anthropic';

const anthropicConfig = registerAs(ANTHROPIC_CONFIG_KEY, () => {
  const env = parseEnv(anthropicEnvSchema, process.env);

  return {
    apiKey: env.ANTHROPIC_API_KEY,
    model: env.ANTHROPIC_MODEL,
    maxTokens: env.ANTHROPIC_MAX_TOKENS,
    timeoutMs: env.ANTHROPIC_TIMEOUT_MS,
    maxRetries: env.ANTHROPIC_MAX_RETRIES,
  };
});

export default anthropicConfig;
export type AnthropicConfig = ConfigType<typeof anthropicConfig>;
