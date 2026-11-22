import type { OpenAPIObject } from '@nestjs/swagger';
import { serializeOpenApi } from './openapi-serializer.js';

function buildDocument(): OpenAPIObject {
  return {
    openapi: '3.0.0',
    paths: {
      '/api/stats': {
        get: {
          parameters: [{ name: 'to' }, { name: 'from' }],
          responses: { '400': {}, '200': {} },
        },
      },
      '/api/health': { get: { tags: ['health'] } },
    },
    info: { version: '0.0.1', title: 'sport-hub-back' },
    tags: [{ name: 'training-stats' }, { name: 'garmin-sync' }],
    components: { schemas: { Zeta: { required: ['b', 'a'] }, Alpha: {} } },
  } as unknown as OpenAPIObject;
}

describe('serializeOpenApi', () => {
  it('trie récursivement les clés des objets', () => {
    const parsed = JSON.parse(serializeOpenApi(buildDocument())) as Record<
      string,
      unknown
    >;
    expect(Object.keys(parsed)).toEqual([
      'components',
      'info',
      'openapi',
      'paths',
      'tags',
    ]);
    expect(Object.keys(parsed['info'] as object)).toEqual(['title', 'version']);
  });

  it('trie les tags de premier niveau par nom', () => {
    const parsed = JSON.parse(serializeOpenApi(buildDocument())) as {
      tags: { name: string }[];
    };
    expect(parsed.tags.map((tag) => tag.name)).toEqual([
      'garmin-sync',
      'training-stats',
    ]);
  });

  it("préserve l'ordre des autres tableaux", () => {
    const parsed = JSON.parse(serializeOpenApi(buildDocument())) as {
      paths: Record<string, { get: { parameters: { name: string }[] } }>;
      components: { schemas: { Zeta: { required: string[] } } };
    };
    const statsParameters = parsed.paths['/api/stats']?.get.parameters ?? [];
    expect(statsParameters.map((p) => p.name)).toEqual(['to', 'from']);
    expect(parsed.components.schemas.Zeta.required).toEqual(['b', 'a']);
  });

  it('termine par un saut de ligne LF et indente à deux espaces', () => {
    const output = serializeOpenApi(buildDocument());
    expect(output.endsWith('}\n')).toBe(true);
    expect(output).not.toContain('\r');
    expect(output.split('\n')[1]).toBe('  "components": {');
  });

  it('produit la même sortie pour deux appels successifs', () => {
    expect(serializeOpenApi(buildDocument())).toBe(
      serializeOpenApi(buildDocument()),
    );
  });
});
