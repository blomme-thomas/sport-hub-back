import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';
import { configureApp } from './../src/app.setup.js';
import { Activity } from './../src/modules/garmin-sync/domain/entities/activity.entity.js';
import {
  ACTIVITY_REPOSITORY,
  type IActivityRepository,
} from './../src/modules/garmin-sync/domain/ports/outbound/activity.repository.port.js';
import { GarminActivityId } from './../src/modules/garmin-sync/domain/value-objects/garmin-activity-id.vo.js';

function activity(id: string, overrides: Record<string, unknown> = {}) {
  return Activity.create({
    garminActivityId: GarminActivityId.create(id),
    type: 'running',
    startedAt: new Date('2026-05-01T06:30:00.000Z'),
    durationSeconds: 3600.5,
    distanceMeters: 10250.75 as number | null,
    sourcePayload: { activityId: id, nested: { name: 'Sortie', laps: [1, 2] } },
    ...overrides,
  });
}

describe('ActivityRepository (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let repository: IActivityRepository;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    repository = app.get<IActivityRepository>(ACTIVITY_REPOSITORY, {
      strict: false,
    });
    await prisma.activity.deleteMany();
  });

  afterEach(async () => {
    await prisma.activity.deleteMany();
    await app.close();
  });

  describe('save', () => {
    it('crée les nouvelles activités', async () => {
      await repository.save([activity('1'), activity('2')]);

      expect(await prisma.activity.count()).toBe(2);
    });

    it('ne crée aucun doublon en enregistrant deux fois la même activité', async () => {
      await repository.save([activity('1')]);
      await repository.save([activity('1')]);

      expect(await prisma.activity.count()).toBe(1);
    });

    it('met à jour une activité existante sans changer son identifiant interne', async () => {
      await repository.save([activity('1')]);
      const before = await prisma.activity.findUniqueOrThrow({
        where: { garminActivityId: '1' },
      });

      await repository.save([
        activity('1', {
          type: 'cycling',
          durationSeconds: 100,
          distanceMeters: null,
          sourcePayload: { activityId: '1', renamed: true },
        }),
      ]);

      const after = await prisma.activity.findUniqueOrThrow({
        where: { garminActivityId: '1' },
      });
      expect(after.id).toBe(before.id);
      expect(after.type).toBe('cycling');
      expect(after.durationSeconds).toBe(100);
      expect(after.distanceMeters).toBeNull();
      expect(after.rawPayload).toEqual({ activityId: '1', renamed: true });
      expect(await prisma.activity.count()).toBe(1);
    });

    it('mélange créations et mises à jour dans un même appel', async () => {
      await repository.save([activity('1')]);

      await repository.save([
        activity('1', { type: 'swimming' }),
        activity('2'),
      ]);

      expect(await prisma.activity.count()).toBe(2);
      const first = await prisma.activity.findUniqueOrThrow({
        where: { garminActivityId: '1' },
      });
      expect(first.type).toBe('swimming');
    });

    it('accepte une liste vide', async () => {
      await expect(repository.save([])).resolves.toBeUndefined();

      expect(await prisma.activity.count()).toBe(0);
    });

    it("n'enregistre rien quand une activité du lot échoue", async () => {
      const broken = activity('2');
      Object.defineProperty(broken, 'durationSeconds', {
        get: () => {
          throw new Error('échec simulé');
        },
      });

      await expect(
        repository.save([activity('1'), broken]),
      ).rejects.toBeDefined();

      expect(await prisma.activity.count()).toBe(0);
    });
  });

  describe('findLatestStartedAt', () => {
    it("renvoie null quand aucune activité n'est connue", async () => {
      await expect(repository.findLatestStartedAt()).resolves.toBeNull();
    });

    it('renvoie la date de début la plus récente', async () => {
      await repository.save([
        activity('1', { startedAt: new Date('2026-05-01T06:30:00.000Z') }),
        activity('2', { startedAt: new Date('2026-06-15T18:00:00.000Z') }),
        activity('3', { startedAt: new Date('2026-05-20T09:00:00.000Z') }),
      ]);

      const latest = await repository.findLatestStartedAt();

      expect(latest?.toISOString()).toBe('2026-06-15T18:00:00.000Z');
    });
  });

  describe('findByGarminActivityIds', () => {
    it('renvoie uniquement les activités connues', async () => {
      await repository.save([activity('1'), activity('2'), activity('3')]);

      const found = await repository.findByGarminActivityIds([
        GarminActivityId.create('1'),
        GarminActivityId.create('3'),
        GarminActivityId.create('inconnue'),
      ]);

      expect(found.map((a) => a.garminActivityId.toString()).sort()).toEqual([
        '1',
        '3',
      ]);
    });

    it('renvoie une liste vide pour une liste vide', async () => {
      await repository.save([activity('1')]);

      await expect(repository.findByGarminActivityIds([])).resolves.toEqual([]);
    });
  });

  describe('aller-retour du mapping', () => {
    it('relit une activité équivalente à celle enregistrée', async () => {
      const original = activity('42');
      await repository.save([original]);

      const [found] = await repository.findByGarminActivityIds([
        GarminActivityId.create('42'),
      ]);

      expect(found.garminActivityId.toString()).toBe('42');
      expect(found.type).toBe('running');
      expect(found.startedAt.toISOString()).toBe('2026-05-01T06:30:00.000Z');
      expect(found.durationSeconds).toBe(3600.5);
      expect(found.distanceMeters).toBe(10250.75);
      expect(found.hasSameContentAs(original)).toBe(true);
    });

    it('relit une distance nulle à null', async () => {
      await repository.save([activity('43', { distanceMeters: null })]);

      const [found] = await repository.findByGarminActivityIds([
        GarminActivityId.create('43'),
      ]);

      expect(found.distanceMeters).toBeNull();
    });
  });
});
