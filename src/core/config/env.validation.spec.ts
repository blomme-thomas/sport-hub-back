import { validateEnv } from './env.validation.js';

const validDatabase = {
  DB_NAME: 'sporthub',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USERNAME: 'sporthub',
  DB_PASSWORD: 'sporthub',
  DATABASE_URL: 'postgresql://sporthub:sporthub@localhost:5432/sporthub',
};

describe('validateEnv', () => {
  describe('application', () => {
    it('applique les valeurs par défaut quand seule la base est fournie', () => {
      expect(validateEnv(validDatabase)).toMatchObject({
        NODE_ENV: 'development',
        APP_NAME: 'sport-hub-back',
        APP_HOST: 'localhost',
        APP_PORT: 3000,
        APP_GLOBAL_PREFIX: 'api',
        APP_LOG_LEVEL: 'log',
        APP_CORS_ORIGIN: 'http://localhost:4200',
      });
    });

    it('accepte des valeurs valides et convertit le port en nombre', () => {
      const env = validateEnv({
        ...validDatabase,
        NODE_ENV: 'production',
        APP_PORT: '8080',
        APP_LOG_LEVEL: 'warn',
        APP_GLOBAL_PREFIX: 'v1',
      });

      expect(env.NODE_ENV).toBe('production');
      expect(env.APP_PORT).toBe(8080);
      expect(env.APP_LOG_LEVEL).toBe('warn');
      expect(env.APP_GLOBAL_PREFIX).toBe('v1');
    });

    it('ignore les variables inconnues', () => {
      expect(
        validateEnv({ ...validDatabase, PATH: '/usr/bin' }),
      ).not.toHaveProperty('PATH');
    });

    it.each([['0'], ['70000'], ['abc'], ['3000.5']])(
      'rejette le port invalide %s',
      (port) => {
        expect(() => validateEnv({ ...validDatabase, APP_PORT: port })).toThrow(
          'APP_PORT',
        );
      },
    );

    it('rejette un NODE_ENV inconnu', () => {
      expect(() =>
        validateEnv({ ...validDatabase, NODE_ENV: 'staging' }),
      ).toThrow('NODE_ENV');
    });

    it('rejette un niveau de log inconnu', () => {
      expect(() =>
        validateEnv({ ...validDatabase, APP_LOG_LEVEL: 'trace' }),
      ).toThrow('APP_LOG_LEVEL');
    });

    it("rejette une origine CORS qui n'est pas une URL", () => {
      expect(() =>
        validateEnv({ ...validDatabase, APP_CORS_ORIGIN: 'localhost' }),
      ).toThrow('APP_CORS_ORIGIN');
    });

    it('rejette un nom ou un hôte vide', () => {
      expect(() => validateEnv({ ...validDatabase, APP_NAME: '' })).toThrow(
        'APP_NAME',
      );
      expect(() => validateEnv({ ...validDatabase, APP_HOST: '' })).toThrow(
        'APP_HOST',
      );
    });
  });

  describe('base de données', () => {
    it('accepte une configuration valide et convertit le port', () => {
      expect(validateEnv(validDatabase)).toMatchObject({
        DB_NAME: 'sporthub',
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_USERNAME: 'sporthub',
        DB_PASSWORD: 'sporthub',
        DATABASE_URL: validDatabase.DATABASE_URL,
      });
    });

    it('refuse un environnement sans variables de base et les signale toutes', () => {
      let message = '';
      try {
        validateEnv({});
      } catch (error) {
        message = (error as Error).message;
      }

      for (const name of Object.keys(validDatabase)) {
        expect(message).toContain(name);
      }
    });

    it.each(Object.keys(validDatabase))('rejette %s manquante', (name) => {
      const env: Record<string, string> = { ...validDatabase };
      delete env[name];

      expect(() => validateEnv(env)).toThrow(name);
    });

    it.each([['0'], ['70000'], ['abc']])(
      'rejette le port de base invalide %s',
      (port) => {
        expect(() => validateEnv({ ...validDatabase, DB_PORT: port })).toThrow(
          'DB_PORT',
        );
      },
    );

    it("rejette une URL qui n'est pas postgresql", () => {
      expect(() =>
        validateEnv({
          ...validDatabase,
          DATABASE_URL: 'mysql://sporthub:sporthub@localhost:5432/sporthub',
        }),
      ).toThrow('DATABASE_URL');
    });

    it.each([
      ['DB_HOST', 'autre-hote'],
      ['DB_PORT', '5433'],
      ['DB_USERNAME', 'autre'],
      ['DB_PASSWORD', 'autre'],
      ['DB_NAME', 'autre'],
    ])('rejette une URL incohérente avec %s', (name, value) => {
      expect(() => validateEnv({ ...validDatabase, [name]: value })).toThrow(
        `ne correspond pas à ${name}`,
      );
    });

    it("n'affiche jamais le mot de passe dans l'erreur", () => {
      expect(() =>
        validateEnv({
          ...validDatabase,
          DB_PASSWORD: 'secret-tres-long',
        }),
      ).toThrow(/^(?![\s\S]*secret-tres-long)/);
    });

    it("utilise le port 5432 quand l'URL n'en précise pas", () => {
      expect(
        validateEnv({
          ...validDatabase,
          DATABASE_URL: 'postgresql://sporthub:sporthub@localhost/sporthub',
        }).DB_PORT,
      ).toBe(5432);
    });

    it("accepte des caractères spéciaux encodés dans l'URL", () => {
      expect(() =>
        validateEnv({
          ...validDatabase,
          DB_PASSWORD: 'p@ss:w/rd',
          DATABASE_URL: `postgresql://sporthub:${encodeURIComponent('p@ss:w/rd')}@localhost:5432/sporthub`,
        }),
      ).not.toThrow();
    });
  });

  it('liste ensemble les erreurs de champs de plusieurs domaines', () => {
    expect(() =>
      validateEnv({ ...validDatabase, APP_PORT: 'abc', DB_PORT: 'abc' }),
    ).toThrow(/APP_PORT[\s\S]*DB_PORT|DB_PORT[\s\S]*APP_PORT/);
  });
});
