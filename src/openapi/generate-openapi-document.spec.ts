import { generateOpenApiDocument } from './generate-openapi-document.js';

const OPERATION_ID_FORMAT = /^[a-z][A-Za-z0-9]+$/;

interface GeneratedDocument {
  servers: { url: string }[];
  tags: { name: string }[];
  paths: Record<string, Record<string, { operationId?: string }>>;
  components: { schemas: Record<string, unknown> };
}

function restoreEnv(snapshot: NodeJS.ProcessEnv): void {
  for (const key of Object.keys(process.env)) {
    if (!(key in snapshot)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, snapshot);
}

describe('generateOpenApiDocument', () => {
  const envSnapshot: NodeJS.ProcessEnv = { ...process.env };
  let content: string;
  let document: GeneratedDocument;

  beforeAll(async () => {
    vi.stubEnv('APP_PORT', '4000');
    vi.stubEnv('DATABASE_URL', 'postgresql://other:other@remote:6543/other');
    content = await generateOpenApiDocument();
    document = JSON.parse(content) as GeneratedDocument;
  }, 60_000);

  afterAll(() => {
    vi.unstubAllEnvs();
    restoreEnv(envSnapshot);
  });

  it('produit le même contenu à deux générations successives', async () => {
    const second = await generateOpenApiDocument();
    expect(second).toBe(content);
  }, 60_000);

  it('déclare le serveur local avec le port de la configuration par défaut, sans /api', () => {
    expect(document.servers).toEqual([
      expect.objectContaining({ url: 'http://localhost:3000' }),
    ]);
  });

  it('déclare les tags par module', () => {
    expect(document.tags.map((tag) => tag.name)).toEqual(
      expect.arrayContaining([
        'health',
        'garmin-sync',
        'training-stats',
        'workout-generation',
        'creneaux',
      ]),
    );
  });

  it('publie les routes existantes avec le préfixe global', () => {
    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining([
        '/api/health',
        '/api/activities',
        '/api/stats',
        '/api/garmin-sync/run',
        '/api/workouts/generate',
        '/api/slots',
      ]),
    );
  });

  it('donne à chaque opération un operationId unique au format lisible', () => {
    const operationIds = Object.values(document.paths)
      .flatMap((item) => Object.values(item))
      .map((operation) => operation.operationId)
      .filter((id): id is string => typeof id === 'string');

    expect(operationIds).toContain('healthCheck');
    expect(new Set(operationIds).size).toBe(operationIds.length);
    for (const id of operationIds) {
      expect(id).toMatch(OPERATION_ID_FORMAT);
    }
  });

  it('publie le schéma ProblemDetailsDto utilisé par les erreurs', () => {
    expect(document.components.schemas['ProblemDetailsDto']).toBeDefined();
  });
});
