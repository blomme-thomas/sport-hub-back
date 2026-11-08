import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';
import { ANTHROPIC_CLIENT } from './../src/core/anthropic/anthropic-client.provider.js';
import {
  ACTIVITY_COMMENT_GENERATOR,
  type CommentGenerationInput,
  type IActivityCommentGenerator,
} from './../src/modules/conseils/domain/ports/outbound/conseils.ports.js';

const PROBLEM_JSON = /application\/problem\+json/;
const UNKNOWN_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const ACTIVITY_LINKED = '6b1b3a7e-2f4d-4c8e-9a51-0d7c2e8f9a21';
const ACTIVITY_FREE = '6b1b3a7e-2f4d-4c8e-9a51-0d7c2e8f9a22';

class FakeGenerator implements IActivityCommentGenerator {
  calls: CommentGenerationInput[] = [];
  text = 'Bonne sortie, allure maîtrisée.';

  generate(input: CommentGenerationInput) {
    this.calls.push(input);
    return Promise.resolve({ text: this.text, model: 'claude-sonnet-5-5' });
  }
}

describe('Commentaires d’activités (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let generator: FakeGenerator;

  async function start(options: { unavailable?: boolean } = {}): Promise<void> {
    generator = new FakeGenerator();
    const builder = Test.createTestingModule({ imports: [AppModule] });
    if (options.unavailable) {
      builder.overrideProvider(ANTHROPIC_CLIENT).useValue(null);
    } else {
      builder.overrideProvider(ACTIVITY_COMMENT_GENERATOR).useValue(generator);
    }
    const moduleFixture = await builder.compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup();
    await prisma.discipline.create({
      data: {
        typeKey: 'running',
        label: 'Course',
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      },
    });
    await createActivity(ACTIVITY_LINKED, '2099-05-04T08:00:00.000Z');
    await createActivity(ACTIVITY_FREE, '2099-06-10T08:00:00.000Z');
  }

  async function cleanup(): Promise<void> {
    await prisma.activityComment.deleteMany();
    await prisma.session.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.discipline.deleteMany();
  }

  async function createActivity(id: string, startedAt: string): Promise<void> {
    await prisma.activity.create({
      data: {
        id,
        garminActivityId: `garmin-${id}`,
        type: 'running',
        startedAt: new Date(startedAt),
        durationSeconds: 2700,
        distanceMeters: 8000,
        rawPayload: {},
      },
    });
  }

  beforeEach(async () => {
    await start();
  });

  afterEach(async () => {
    await cleanup();
    await app.close();
  });

  function http() {
    return request(app.getHttpServer());
  }

  async function linkActivityToSession(): Promise<void> {
    await http()
      .post('/api/sessions')
      .send({
        date: '2099-05-04',
        disciplineTypeKey: 'running',
        durationMinutes: 45,
      })
      .expect(201);
    await http()
      .post('/api/sessions/reconcile')
      .query({ from: '2099-05-01', to: '2099-05-10' })
      .expect(200);
  }

  describe('POST /api/activities/:id/comment', () => {
    it('génère le commentaire d’une activité rapprochée en un seul appel au modèle', async () => {
      await linkActivityToSession();

      const res = await http()
        .post(`/api/activities/${ACTIVITY_LINKED}/comment`)
        .expect(201);

      expect(res.body).toMatchObject({
        activityId: ACTIVITY_LINKED,
        text: 'Bonne sortie, allure maîtrisée.',
        source: 'ia',
        model: 'claude-sonnet-5-5',
      });
      expect(generator.calls).toHaveLength(1);
      expect(generator.calls[0].planned.disciplineTypeKey).toBe('running');
    });

    it('stocke un commentaire générique sans appel au modèle pour une activité sans séance', async () => {
      const res = await http()
        .post(`/api/activities/${ACTIVITY_FREE}/comment`)
        .expect(201);

      expect(res.body.source).toBe('generique');
      expect(res.body.model).toBeNull();
      expect(generator.calls).toHaveLength(0);
    });

    it('remplace le commentaire existant et enregistre la nouvelle date', async () => {
      await linkActivityToSession();
      const first = await http()
        .post(`/api/activities/${ACTIVITY_LINKED}/comment`)
        .expect(201);
      generator.text = 'Seconde version.';

      const second = await http()
        .post(`/api/activities/${ACTIVITY_LINKED}/comment`)
        .expect(201);

      expect(generator.calls).toHaveLength(2);
      expect(second.body.text).toBe('Seconde version.');
      expect(second.body.generatedAt >= first.body.generatedAt).toBe(true);
    });

    it('renvoie 404 ACTIVITY_NOT_FOUND pour une activité inconnue', async () => {
      const res = await http()
        .post(`/api/activities/${UNKNOWN_ID}/comment`)
        .expect(404);

      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body.code).toBe('ACTIVITY_NOT_FOUND');
    });

    it('renvoie 503 sans clé de modèle pour une activité rapprochée', async () => {
      await app.close();
      await start({ unavailable: true });
      await linkActivityToSession();

      const res = await http()
        .post(`/api/activities/${ACTIVITY_LINKED}/comment`)
        .expect(503);

      expect(res.body.code).toBe('ACTIVITY_COMMENT_UNAVAILABLE');
    });
  });

  describe('GET /api/activities/:id/comment', () => {
    it('renvoie le commentaire stocké sans appel au modèle', async () => {
      await linkActivityToSession();
      await http()
        .post(`/api/activities/${ACTIVITY_LINKED}/comment`)
        .expect(201);

      const res = await http()
        .get(`/api/activities/${ACTIVITY_LINKED}/comment`)
        .expect(200);

      expect(res.body.text).toBe('Bonne sortie, allure maîtrisée.');
      expect(generator.calls).toHaveLength(1);
    });

    it('renvoie 404 ACTIVITY_COMMENT_NOT_FOUND tant qu’aucun commentaire n’a été généré', async () => {
      const res = await http()
        .get(`/api/activities/${ACTIVITY_FREE}/comment`)
        .expect(404);

      expect(res.body.code).toBe('ACTIVITY_COMMENT_NOT_FOUND');
    });
  });
});
