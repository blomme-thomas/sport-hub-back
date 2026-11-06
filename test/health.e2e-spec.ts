import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';
import { configureApp } from './../src/app.setup.js';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  it('GET /api/health renvoie 200 et { status: "ok", checks: { database: "up" } }', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok', checks: { database: 'up' } });
  });

  it('GET /api/health expose le header X-Correlation-Id', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(res.headers['x-correlation-id']).toEqual(expect.any(String));
  });

  it('GET /api/inexistant renvoie 404 en application/problem+json', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/inexistant')
      .expect(404);

    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('GET /health sans préfixe renvoie 404', () => {
    return request(app.getHttpServer()).get('/health').expect(404);
  });

  afterEach(async () => {
    await app.close();
  });
});

describe('Health avec base injoignable (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    // Faux client : l'init réussit, mais toute requête échoue avec une erreur
    // qui contient des secrets, pour vérifier qu'ils ne fuient pas.
    const unreachablePrisma = {
      onModuleInit: () => Promise.resolve(),
      onModuleDestroy: () => Promise.resolve(),
      $connect: () => Promise.resolve(),
      $disconnect: () => Promise.resolve(),
      $queryRaw: () =>
        Promise.reject(
          Object.assign(
            new Error(
              'connect ECONNREFUSED postgresql://user:secret@db:5432/sporthub',
            ),
            { code: 'ECONNREFUSED' },
          ),
        ),
    };

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(unreachablePrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/health renvoie 503 Problem Details avec checks.database = "down"', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .expect(503);

    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(res.headers['x-correlation-id']).toEqual(expect.any(String));
    expect(res.body.code).toBe('SERVICE_UNAVAILABLE');
    expect(res.body.status).toBe(503);
    expect(res.body.checks).toEqual({ database: 'down' });
  });

  it('GET /api/health 503 ne fuit ni URL de connexion ni erreur réseau', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .expect(503);

    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('postgresql://');
    expect(raw).not.toContain('ECONNREFUSED');
    expect(raw).not.toContain('secret');
  });
});
