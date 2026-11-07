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
      GARMIN_SYNC_CRON_ENABLED: 'false',
      GARMIN_SYNC_CRON_EXPRESSION: '*/15 * * * *',
    };

    expect(garminConfig()).toEqual({
      personalApiKey: 'abc-123',
      personalApiBaseUrl: 'http://127.0.0.1:9999',
      syncCronEnabled: false,
      syncCronExpression: '*/15 * * * *',
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

  it('active la synchronisation planifiée toutes les trois heures par défaut', () => {
    process.env = {
      ...originalEnv,
      GARMIN_SYNC_CRON_ENABLED: undefined,
      GARMIN_SYNC_CRON_EXPRESSION: undefined,
    };

    const config = garminConfig();

    expect(config.syncCronEnabled).toBe(true);
    expect(config.syncCronExpression).toBe('0 */3 * * *');
  });

  it('désactive la synchronisation planifiée quand la variable vaut false', () => {
    process.env = { ...originalEnv, GARMIN_SYNC_CRON_ENABLED: 'false' };

    expect(garminConfig().syncCronEnabled).toBe(false);
  });

  it('refuse une valeur booléenne invalide pour la synchronisation planifiée', () => {
    process.env = { ...originalEnv, GARMIN_SYNC_CRON_ENABLED: 'oui' };

    expect(() => garminConfig()).toThrow('GARMIN_SYNC_CRON_ENABLED');
  });

  it('refuse une expression cron invalide et nomme la variable sans afficher sa valeur', () => {
    process.env = {
      ...originalEnv,
      GARMIN_SYNC_CRON_EXPRESSION: 'pas une expression cron',
    };

    expect(() => garminConfig()).toThrow('GARMIN_SYNC_CRON_EXPRESSION');
    let thrown = '';
    try {
      garminConfig();
    } catch (error) {
      thrown = String(error);
    }
    expect(thrown).not.toContain('pas une expression cron');
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
