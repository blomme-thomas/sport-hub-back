import appConfig from './app.config.js';

describe('appConfig', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it("construit la configuration applicative depuis l'environnement", () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      APP_NAME: 'sport-hub-test',
      APP_HOST: '0.0.0.0',
      APP_PORT: '4000',
      APP_GLOBAL_PREFIX: 'v1',
      APP_LOG_LEVEL: 'warn',
      APP_CORS_ORIGIN: 'http://localhost:5000',
    };

    expect(appConfig()).toEqual({
      name: 'sport-hub-test',
      host: '0.0.0.0',
      port: 4000,
      globalPrefix: 'v1',
      env: 'production',
      logLevel: 'warn',
      logLevels: ['warn', 'error', 'fatal'],
      corsOrigin: 'http://localhost:5000',
    });
  });

  it('active tous les niveaux à partir de verbose', () => {
    process.env = { ...originalEnv, APP_LOG_LEVEL: 'verbose' };

    expect(appConfig().logLevels).toEqual([
      'verbose',
      'debug',
      'log',
      'warn',
      'error',
      'fatal',
    ]);
  });

  it("échoue si l'environnement est invalide", () => {
    process.env = { ...originalEnv, APP_PORT: 'abc' };

    expect(() => appConfig()).toThrow('APP_PORT');
  });
});
