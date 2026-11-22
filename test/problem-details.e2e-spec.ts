import { Test } from '@nestjs/testing';
import { type INestApplication, Logger } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { ProblemTestController } from './support/problem-test.controller.js';

const PROBLEM_JSON = /application\/problem\+json/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('Problem Details (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProblemTestController],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
  });

  it('route_inexistante_repond_404_problem_json', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/nope?q=1')
      .expect(404);

    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body).toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      instance: '/api/nope',
    });
    expect(res.body.correlationId).toEqual(expect.any(String));
  });

  it('notfound_exception_repond_404_avec_son_message', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/test-problems/not-found')
      .expect(404);

    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body).toMatchObject({
      code: 'NOT_FOUND',
      detail: 'Ressource de test introuvable',
    });
  });

  it('validation_renvoie_toutes_les_erreurs_dont_imbriquees_et_propriete_en_trop', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/test-problems/validate')
      .send({ name: '', count: 0, address: { city: '' }, extra: 'x' })
      .expect(400);

    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.code).toBe('VALIDATION_FAILED');
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'name', code: 'IS_NOT_EMPTY' }),
        expect.objectContaining({ field: 'count', code: 'MIN' }),
        expect.objectContaining({
          field: 'address.city',
          code: 'IS_NOT_EMPTY',
        }),
        expect.objectContaining({
          field: 'extra',
          code: 'PROPERTY_NOT_ALLOWED',
        }),
      ]),
    );
    expect(res.body.detail).toContain(String(res.body.errors.length));
  });

  it('validation_tronque_les_erreurs_a_100_et_l_annonce_dans_detail', async () => {
    const extras = Object.fromEntries(
      Array.from({ length: 150 }, (_, i) => [`extra${i}`, 'x']),
    );

    const res = await request(app.getHttpServer())
      .post('/api/test-problems/validate')
      .send({ name: 'ok', count: 1, address: { city: 'Paris' }, ...extras })
      .expect(400);

    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body.code).toBe('VALIDATION_FAILED');
    expect(res.body.errors.length).toBeLessThanOrEqual(100);
    expect(res.body.errors.length).toBeGreaterThan(0);
    expect(res.body.detail).toMatch(/tronquée/);
    expect(res.body.detail).toContain('150');
  });

  it('erreur_inattendue_repond_500_sans_fuite_et_logue_la_stack', async () => {
    const errorSpy = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    const res = await request(app.getHttpServer())
      .get('/api/test-problems/unexpected')
      .expect(500);

    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body).toMatchObject({ status: 500, code: 'INTERNAL_ERROR' });
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('secret interne');
    expect(raw).not.toMatch(/\n\s+at /);
    expect(raw).not.toMatch(/\\n\s*at /);
    expect(res.body).not.toHaveProperty('stack');

    const call = errorSpy.mock.calls.find(([message]) =>
      String(message).includes(res.body.correlationId),
    );
    expect(call).toBeDefined();
    expect(String(call?.[0])).toContain('secret interne');
    expect(String(call?.[1])).toContain('Error: secret interne');
  });

  describe('correlation id', () => {
    it('header_entrant_valide_est_repris_dans_le_header_et_le_corps', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/nope')
        .set('X-Correlation-Id', 'abc-123_X.y:z')
        .expect(404);

      expect(res.headers['x-correlation-id']).toBe('abc-123_X.y:z');
      expect(res.body.correlationId).toBe('abc-123_X.y:z');
    });

    it('sans_header_un_uuid_est_genere', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/nope')
        .expect(404);

      expect(res.headers['x-correlation-id']).toMatch(UUID);
      expect(res.body.correlationId).toBe(res.headers['x-correlation-id']);
    });

    it('header_invalide_est_remplace_par_un_uuid', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/nope')
        .set('X-Correlation-Id', 'bad value;<script>')
        .expect(404);

      expect(res.headers['x-correlation-id']).toMatch(UUID);
      expect(res.body.correlationId).toBe(res.headers['x-correlation-id']);
    });
  });

  it('business_error_non_mappee_repond_422_avec_son_propre_code', async () => {
    const warnSpy = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    const res = await request(app.getHttpServer())
      .get('/api/test-problems/domain-error')
      .expect(422);

    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body).toMatchObject({
      status: 422,
      code: 'TEST_UNMAPPED_ERROR',
      type: 'urn:sport-hub:problem:test-unmapped-error',
      detail: 'Règle métier de test violée',
    });
    expect(warnSpy).toHaveBeenCalled();
  });

  it('json_malforme_repond_400_malformed_request_body_avec_correlation_id', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/test-problems/validate')
      .set('Content-Type', 'application/json')
      .set('X-Correlation-Id', 'malformed-1')
      .send('{"name": "abc"')
      .expect(400);

    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body).toMatchObject({
      status: 400,
      code: 'MALFORMED_REQUEST_BODY',
      correlationId: 'malformed-1',
    });
    expect(res.headers['x-correlation-id']).toBe('malformed-1');
    expect(JSON.stringify(res.body)).not.toContain('"abc"');
  });
});
