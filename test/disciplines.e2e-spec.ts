import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';
import { Discipline } from './../src/modules/disciplines/domain/entities/discipline.entity.js';
import {
  DISCIPLINE_REPOSITORY,
  type IDisciplineRepository,
} from './../src/modules/disciplines/domain/ports/outbound/discipline.repository.port.js';
import { DisciplineTypeKey } from './../src/modules/disciplines/domain/value-objects/discipline-type-key.vo.js';

const PROBLEM_JSON = /application\/problem\+json/;
const SEEN_AT = new Date('2026-05-01T08:00:00.000Z');

describe('Disciplines (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let repository: IDisciplineRepository;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    repository = app.get<IDisciplineRepository>(DISCIPLINE_REPOSITORY, {
      strict: false,
    });
    await prisma.discipline.deleteMany();
  });

  afterEach(async () => {
    await prisma.discipline.deleteMany();
    await app.close();
  });

  function list() {
    return request(app.getHttpServer()).get('/api/disciplines');
  }

  function patch(typeKey: string, body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .patch(`/api/disciplines/${typeKey}`)
      .send(body);
  }

  async function seed(...typeKeys: string[]): Promise<void> {
    await repository.saveAppearances(
      typeKeys.map((raw) =>
        Discipline.firstSeen(DisciplineTypeKey.create(raw), SEEN_AT),
      ),
    );
  }

  describe('liste', () => {
    it('renvoie une liste vide quand aucune discipline n’est connue', async () => {
      const res = await list().expect(200);

      expect(res.body).toEqual({ items: [] });
    });

    it('renvoie chaque discipline avec sa clé, son libellé et ses dates d’apparition', async () => {
      await seed('running');

      const res = await list().expect(200);

      expect(res.body).toEqual({
        items: [
          {
            typeKey: 'running',
            label: 'running',
            firstSeenAt: '2026-05-01T08:00:00.000Z',
            lastSeenAt: '2026-05-01T08:00:00.000Z',
          },
        ],
      });
    });

    it('trie par libellé après renommage, dans le désordre des clés', async () => {
      await seed('running', 'cycling');
      await patch('running', { label: 'Course à pied' }).expect(200);
      await patch('cycling', { label: 'Cyclisme' }).expect(200);

      const res = await list().expect(200);

      expect(
        res.body.items.map((item: { typeKey: string }) => item.typeKey),
      ).toEqual(['running', 'cycling']);
    });
  });

  describe('renommage', () => {
    it('renvoie la discipline renommée et la consultation reflète le nouveau libellé', async () => {
      await seed('running');

      const patched = await patch('running', {
        label: '  Course à pied  ',
      }).expect(200);
      const listed = await list().expect(200);

      expect(patched.body).toEqual({
        typeKey: 'running',
        label: 'Course à pied',
        firstSeenAt: '2026-05-01T08:00:00.000Z',
        lastSeenAt: '2026-05-01T08:00:00.000Z',
      });
      expect(listed.body.items).toEqual([patched.body]);
    });

    it('renvoie 404 DISCIPLINE_NOT_FOUND pour une clé inconnue', async () => {
      const res = await patch('swimming', { label: 'Natation' }).expect(404);

      expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(res.body.code).toBe('DISCIPLINE_NOT_FOUND');
    });

    it.each([
      ['vide', ''],
      ['composé d’espaces', '   '],
      ['de plus de 60 caractères', 'a'.repeat(61)],
    ])(
      'renvoie 400 VALIDATION_FAILED pour un libellé %s',
      async (_label, value) => {
        await seed('running');

        const res = await patch('running', { label: value }).expect(400);

        expect(res.headers['content-type']).toMatch(PROBLEM_JSON);
        expect(res.body.code).toBe('VALIDATION_FAILED');
        expect(res.body.errors).toEqual(
          expect.arrayContaining([expect.objectContaining({ field: 'label' })]),
        );
      },
    );

    it('refuse un champ inconnu', async () => {
      await seed('running');

      const res = await patch('running', {
        label: 'Course',
        foo: 'bar',
      }).expect(400);

      expect(res.body.code).toBe('VALIDATION_FAILED');
    });
  });
});
