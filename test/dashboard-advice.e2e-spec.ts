import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';
import { ANTHROPIC_CLIENT } from './../src/core/anthropic/anthropic-client.provider.js';
import { CONSEILS_CLOCK } from './../src/modules/conseils/domain/ports/outbound/conseils.ports.js';
import {
  DASHBOARD_ADVICE_DATA_READER,
  DASHBOARD_ADVICE_GENERATOR,
  type DashboardAdviceData,
  type IDashboardAdviceDataReader,
  type IDashboardAdviceGenerator,
} from './../src/modules/conseils/domain/ports/outbound/dashboard-advice.ports.js';

const PROBLEM_JSON = /application\/problem\+json/;
const NOW = new Date('2026-11-08T12:00:00.000Z');

function data(count: number): DashboardAdviceData {
  return {
    week: '2026-W45',
    stats: {
      count,
      durationSeconds: count * 3600,
      calories: null,
      elevationGainMeters: null,
      averageHeartRate: null,
      hrTimeInZoneSeconds: [null, null, null, null, null],
      bySport: [],
      variationDirection: 'unknown',
      variationPercent: null,
    },
    recovery: [],
    zones: {
      available: false,
      trainingMethod: null,
      maxHeartRateUsed: null,
      restingHeartRateUsed: null,
      zoneFloors: [null, null, null, null, null],
    },
  };
}

class FakeReader implements IDashboardAdviceDataReader {
  count = 0;
  readWeek() {
    return Promise.resolve(data(this.count));
  }
}

class FakeGenerator implements IDashboardAdviceGenerator {
  calls = 0;
  generate() {
    this.calls += 1;
    return Promise.resolve({
      text: 'Belle semaine de volume, garde la séance facile de jeudi.',
      model: 'claude-sonnet-5-5',
    });
  }
}

describe('Conseil du tableau de bord (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let reader: FakeReader;
  let generator: FakeGenerator;

  async function start(options: { unavailable?: boolean } = {}): Promise<void> {
    reader = new FakeReader();
    generator = new FakeGenerator();
    const builder = Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DASHBOARD_ADVICE_DATA_READER)
      .useValue(reader)
      .overrideProvider(CONSEILS_CLOCK)
      .useValue(() => NOW);
    if (options.unavailable) {
      builder.overrideProvider(ANTHROPIC_CLIENT).useValue(null);
    } else {
      builder.overrideProvider(DASHBOARD_ADVICE_GENERATOR).useValue(generator);
    }
    const moduleFixture = await builder.compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.dashboardAdvice.deleteMany();
  }

  afterEach(async () => {
    await prisma.dashboardAdvice.deleteMany();
    await app.close();
  });

  it('renvoie 404 tant qu’aucun conseil n’a été généré pour la semaine', async () => {
    await start();

    const res = await request(app.getHttpServer())
      .get('/api/advice/dashboard')
      .expect(404);

    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body).toMatchObject({ code: 'DASHBOARD_ADVICE_NOT_FOUND' });
  });

  it('stocke un conseil « données insuffisantes » sans appel au modèle quand la semaine est vide', async () => {
    await start();
    reader.count = 0;

    const res = await request(app.getHttpServer())
      .post('/api/advice/dashboard/regenerate')
      .expect(201);

    expect(res.body).toMatchObject({
      week: '2026-W45',
      source: 'insuffisant',
      model: null,
    });
    expect(generator.calls).toBe(0);
    const read = await request(app.getHttpServer())
      .get('/api/advice/dashboard')
      .expect(200);
    expect(read.body).toMatchObject({
      week: '2026-W45',
      source: 'insuffisant',
    });
  });

  it('génère un conseil avec le modèle, puis le remplace à la régénération', async () => {
    await start();
    reader.count = 3;

    const first = await request(app.getHttpServer())
      .post('/api/advice/dashboard/regenerate')
      .expect(201);
    expect(first.body).toMatchObject({
      source: 'ia',
      model: 'claude-sonnet-5-5',
    });

    await request(app.getHttpServer())
      .post('/api/advice/dashboard/regenerate')
      .expect(201);

    expect(generator.calls).toBe(2);
    expect(await prisma.dashboardAdvice.count()).toBe(1);
  });

  it('lecture sans appel au modèle : GET ne consomme jamais le générateur', async () => {
    await start();
    reader.count = 1;
    await request(app.getHttpServer())
      .post('/api/advice/dashboard/regenerate')
      .expect(201);

    await request(app.getHttpServer()).get('/api/advice/dashboard').expect(200);
    await request(app.getHttpServer()).get('/api/advice/dashboard').expect(200);

    expect(generator.calls).toBe(1);
  });

  it('renvoie 503 Problem Details quand le modèle n’est pas configuré', async () => {
    await start({ unavailable: true });
    reader.count = 2;

    const res = await request(app.getHttpServer())
      .post('/api/advice/dashboard/regenerate')
      .expect(503);

    expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(res.body).toMatchObject({ code: 'DASHBOARD_ADVICE_UNAVAILABLE' });
    expect(await prisma.dashboardAdvice.count()).toBe(0);
  });
});
