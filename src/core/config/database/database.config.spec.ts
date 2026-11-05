import databaseConfig from './database.config.js';

describe('databaseConfig', () => {
  const originalEnv = process.env;

  const validEnv = {
    DB_NAME: 'sporthub',
    DB_HOST: 'localhost',
    DB_PORT: '5432',
    DB_USERNAME: 'sporthub',
    DB_PASSWORD: 'sporthub',
    DATABASE_URL: 'postgresql://sporthub:sporthub@localhost:5432/sporthub',
  };

  afterEach(() => {
    process.env = originalEnv;
  });

  it("construit la configuration de la base depuis l'environnement", () => {
    process.env = { ...originalEnv, ...validEnv };

    expect(databaseConfig()).toEqual({
      name: 'sporthub',
      host: 'localhost',
      port: 5432,
      username: 'sporthub',
      password: 'sporthub',
      url: 'postgresql://sporthub:sporthub@localhost:5432/sporthub',
    });
  });

  it('échoue si une variable manque', () => {
    process.env = { ...originalEnv, ...validEnv, DB_HOST: undefined };

    expect(() => databaseConfig()).toThrow('DB_HOST');
  });

  it("échoue si l'URL ne correspond pas aux variables DB_*", () => {
    process.env = { ...originalEnv, ...validEnv, DB_PORT: '5433' };

    expect(() => databaseConfig()).toThrow('ne correspond pas à DB_PORT');
  });
});
