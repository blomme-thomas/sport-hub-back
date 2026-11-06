import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { buildOpenApiDocument } from './../src/swagger.setup.js';

describe('OpenAPI (e2e)', () => {
  let app: INestApplication<App>;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    document = buildOpenApiDocument(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('publie_le_schema_ProblemDetailsDto_avec_les_codes_generiques', () => {
    const schema = document.components?.schemas?.['ProblemDetailsDto'] as {
      properties: Record<string, { enum?: string[]; $ref?: string }>;
    };
    expect(schema).toBeDefined();

    // L'enum nommé (enumName) peut être extrait en schéma séparé : on le suit.
    const codes =
      schema.properties['code']?.enum ??
      (
        document.components?.schemas?.['ProblemCode'] as
          { enum: string[] } | undefined
      )?.enum;
    expect(codes).toEqual(
      expect.arrayContaining([
        'VALIDATION_FAILED',
        'BAD_REQUEST',
        'MALFORMED_REQUEST_BODY',
        'NOT_FOUND',
        'PAYLOAD_TOO_LARGE',
        'CLIENT_ERROR',
        'INTERNAL_ERROR',
        'SERVICE_UNAVAILABLE',
      ]),
    );
  });

  it('decrit_CLIENT_ERROR_comme_4xx_d_origine_et_non_400', () => {
    const schema = document.components?.schemas?.['ProblemDetailsDto'] as {
      properties: Record<string, { description?: string }>;
    };
    const description = schema.properties['code']?.description ?? '';
    const line = description
      .split('\n')
      .find((l) => l.includes('`CLIENT_ERROR`'));

    expect(line).toBeDefined();
    expect(line).toContain("4xx d'origine");
    expect(line).not.toMatch(/\b400\b/);
  });

  it('documente_un_500_problem_json_sur_api_health', () => {
    const response = document.paths['/api/health']?.get?.responses?.['500'] as {
      content?: Record<string, { schema?: { $ref?: string } }>;
    };
    expect(response).toBeDefined();
    expect(
      response.content?.['application/problem+json']?.schema?.$ref,
    ).toContain('ProblemDetailsDto');
  });

  it('documente_un_503_problem_json_sur_api_health', () => {
    const response = document.paths['/api/health']?.get?.responses?.['503'] as {
      content?: Record<string, { schema?: { $ref?: string } }>;
    };
    expect(response).toBeDefined();
    expect(
      response.content?.['application/problem+json']?.schema?.$ref,
    ).toContain('ProblemDetailsDto');
  });
});
