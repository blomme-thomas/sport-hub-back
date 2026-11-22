import anthropicConfig, { ANTHROPIC_CONFIG_KEY } from './anthropic.config.js';

const UNSET_ANTHROPIC = {
  ANTHROPIC_API_KEY: undefined,
  ANTHROPIC_MODEL: undefined,
  ANTHROPIC_MAX_TOKENS: undefined,
  ANTHROPIC_TIMEOUT_MS: undefined,
  ANTHROPIC_MAX_RETRIES: undefined,
};

describe('anthropicConfig', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('utilise le namespace anthropic', () => {
    expect(ANTHROPIC_CONFIG_KEY).toBe('anthropic');
  });

  it("construit la configuration Anthropic depuis l'environnement", () => {
    process.env = {
      ...originalEnv,
      ANTHROPIC_API_KEY: 'sk-ant-abc-123',
      ANTHROPIC_MODEL: 'claude-test-model',
      ANTHROPIC_MAX_TOKENS: '1024',
      ANTHROPIC_TIMEOUT_MS: '5000',
      ANTHROPIC_MAX_RETRIES: '0',
    };

    expect(anthropicConfig()).toEqual({
      apiKey: 'sk-ant-abc-123',
      model: 'claude-test-model',
      maxTokens: 1024,
      timeoutMs: 5000,
      maxRetries: 0,
    });
  });

  it("applique les valeurs par défaut et laisse la clé absente quand rien n'est défini", () => {
    process.env = { ...originalEnv, ...UNSET_ANTHROPIC };

    const config = anthropicConfig();

    expect(config.apiKey).toBeUndefined();
    expect(config.model).toBe('claude-sonnet-5-5');
    expect(config.maxTokens).toBe(2048);
    expect(config.timeoutMs).toBe(30000);
    expect(config.maxRetries).toBe(2);
  });

  it('traite une clé vide comme absente', () => {
    process.env = {
      ...originalEnv,
      ...UNSET_ANTHROPIC,
      ANTHROPIC_API_KEY: '',
    };

    expect(anthropicConfig().apiKey).toBeUndefined();
  });

  it('échoue si le nombre de réessais dépasse 5', () => {
    process.env = {
      ...originalEnv,
      ...UNSET_ANTHROPIC,
      ANTHROPIC_MAX_RETRIES: '6',
    };

    expect(() => anthropicConfig()).toThrow('ANTHROPIC_MAX_RETRIES');
  });
});
