import garminConfig from './garmin.config.js';

describe('garminConfig', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it("construit la configuration Garmin depuis l'environnement", () => {
    process.env = {
      ...originalEnv,
      GARMIN_PERSONAL_API_KEY: 'abc-123',
      GARMIN_PERSONAL_API_BASE_URL: 'http://127.0.0.1:9999',
    };

    expect(garminConfig()).toEqual({
      personalApiKey: 'abc-123',
      personalApiBaseUrl: 'http://127.0.0.1:9999',
    });
  });

  it("expose une clé absente et l'URL par défaut quand rien n'est défini", () => {
    process.env = {
      ...originalEnv,
      GARMIN_PERSONAL_API_KEY: undefined,
      GARMIN_PERSONAL_API_BASE_URL: undefined,
    };

    const config = garminConfig();

    expect(config.personalApiKey).toBeUndefined();
    expect(config.personalApiBaseUrl).toBe(
      'https://personal.connectapi.garmin.com',
    );
  });

  it('traite une clé vide comme absente', () => {
    process.env = { ...originalEnv, GARMIN_PERSONAL_API_KEY: '' };

    expect(garminConfig().personalApiKey).toBeUndefined();
  });

  it("échoue si l'URL de base est invalide", () => {
    process.env = { ...originalEnv, GARMIN_PERSONAL_API_BASE_URL: 'garmin' };

    expect(() => garminConfig()).toThrow('GARMIN_PERSONAL_API_BASE_URL');
  });
});
