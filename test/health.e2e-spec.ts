import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
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

  it('GET /api/health renvoie 200 et { status: "ok" }', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok' });
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
