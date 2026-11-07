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

  it('publie_les_codes_GARMIN_ACCESS_DENIED_et_GARMIN_UNAVAILABLE', () => {
    const schema = document.components?.schemas?.['ProblemDetailsDto'] as {
      properties: Record<string, { enum?: string[] }>;
    };
    const codes =
      schema.properties['code']?.enum ??
      (
        document.components?.schemas?.['ProblemCode'] as
          { enum: string[] } | undefined
      )?.enum;
    expect(codes).toEqual(
      expect.arrayContaining(['GARMIN_ACCESS_DENIED', 'GARMIN_UNAVAILABLE']),
    );
  });

  it('documente_la_route_POST_api_garmin_sync_run_avec_200_502_et_503', () => {
    const operation = document.paths['/api/garmin-sync/run']?.post;
    expect(operation).toBeDefined();
    expect(operation?.responses?.['200']).toBeDefined();
    for (const status of ['502', '503']) {
      const response = operation?.responses?.[status] as {
        content?: Record<string, { schema?: { $ref?: string } }>;
      };
      expect(response).toBeDefined();
      expect(
        response.content?.['application/problem+json']?.schema?.$ref,
      ).toContain('ProblemDetailsDto');
    }
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

  it('documente_la_route_GET_api_activities_avec_pagination_et_filtres', () => {
    const operation = document.paths['/api/activities']?.get;
    expect(operation).toBeDefined();
    expect(operation?.responses?.['200']).toBeDefined();

    const names = (operation?.parameters ?? []).map(
      (parameter) => (parameter as { name: string }).name,
    );
    expect(names).toEqual(
      expect.arrayContaining(['page', 'pageSize', 'from', 'to', 'type']),
    );

    const response = operation?.responses?.['400'] as {
      content?: Record<string, { schema?: { $ref?: string } }>;
    };
    expect(response).toBeDefined();
    expect(
      response.content?.['application/problem+json']?.schema?.$ref,
    ).toContain('ProblemDetailsDto');
  });

  it('publie_le_schema_ActivityListResponseDto_sans_charge_brute', () => {
    const schema = document.components?.schemas?.[
      'ActivityListResponseDto'
    ] as {
      properties: Record<string, unknown>;
    };
    expect(schema).toBeDefined();
    expect(Object.keys(schema.properties)).toEqual(
      expect.arrayContaining(['items', 'page', 'pageSize', 'total']),
    );

    const summary = document.components?.schemas?.[
      'ActivitySummaryResponseDto'
    ] as { properties: Record<string, unknown> };
    expect(Object.keys(summary.properties).sort()).toEqual([
      'distanceMeters',
      'durationSeconds',
      'garminActivityId',
      'id',
      'startedAt',
      'type',
    ]);
  });

  it('publie_les_codes_STATS_RANGE_INVALID_et_STATS_RANGE_TOO_LARGE', () => {
    const schema = document.components?.schemas?.['ProblemDetailsDto'] as {
      properties: Record<string, { enum?: string[] }>;
    };
    const codes =
      schema.properties['code']?.enum ??
      (
        document.components?.schemas?.['ProblemCode'] as
          { enum: string[] } | undefined
      )?.enum;
    expect(codes).toEqual(
      expect.arrayContaining(['STATS_RANGE_INVALID', 'STATS_RANGE_TOO_LARGE']),
    );
  });

  it('documente_la_route_GET_api_stats_avec_granularity_from_to_type_et_400', () => {
    const operation = document.paths['/api/stats']?.get;
    expect(operation).toBeDefined();
    expect(operation?.responses?.['200']).toBeDefined();

    const names = (operation?.parameters ?? []).map(
      (parameter) => (parameter as { name: string }).name,
    );
    expect(names).toEqual(
      expect.arrayContaining(['granularity', 'from', 'to', 'type']),
    );

    const response = operation?.responses?.['400'] as {
      content?: Record<string, { schema?: { $ref?: string } }>;
    };
    expect(response).toBeDefined();
    expect(
      response.content?.['application/problem+json']?.schema?.$ref,
    ).toContain('ProblemDetailsDto');
  });

  it('publie_le_schema_TrainingStatsResponseDto_avec_les_periodes', () => {
    const schema = document.components?.schemas?.[
      'TrainingStatsResponseDto'
    ] as {
      properties: Record<string, unknown>;
    };
    expect(schema).toBeDefined();
    expect(Object.keys(schema.properties)).toEqual(
      expect.arrayContaining(['granularity', 'from', 'to', 'type', 'periods']),
    );
  });
});
