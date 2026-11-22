import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/core/prisma/prisma.service.js';
import { configureApp } from './../src/app.setup.js';
import { Goal } from './../src/modules/objectifs/domain/entities/goal.entity.js';
import {
  GOAL_REPOSITORY,
  type IGoalRepository,
} from './../src/modules/objectifs/domain/ports/outbound/goal.repository.port.js';
import { GoalId } from './../src/modules/objectifs/domain/value-objects/goal-id.vo.js';
import { TargetTime } from './../src/modules/objectifs/domain/value-objects/target-time.vo.js';

const UNKNOWN_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

function day(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function evenement(overrides: Record<string, unknown> = {}): Goal {
  return Goal.create({
    title: 'Triathlon de Nice',
    type: 'evenement',
    targetDate: day('2099-06-20'),
    eventFormat: 'olympique',
    targetTime: TargetTime.create(7200),
    ...overrides,
  });
}

describe('GoalRepository (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let repository: IGoalRepository;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    repository = app.get<IGoalRepository>(GOAL_REPOSITORY, { strict: false });
    await prisma.goal.deleteMany();
  });

  afterEach(async () => {
    await prisma.goal.deleteMany();
    await app.close();
  });

  describe('save', () => {
    it('crée un nouvel objectif', async () => {
      await repository.save(evenement());

      expect(await prisma.goal.count()).toBe(1);
    });

    it('met à jour un objectif existant sous le même identifiant', async () => {
      const created = evenement();
      await repository.save(created);

      await repository.save(
        created.change({
          eventFormat: 'half',
          targetTime: TargetTime.create(21600),
        }),
      );

      expect(await prisma.goal.count()).toBe(1);
      const stored = await prisma.goal.findUniqueOrThrow({
        where: { id: created.id.toString() },
      });
      expect(stored.eventFormat).toBe('half');
      expect(stored.targetTimeSeconds).toBe(21600);
    });

    it('enregistre un objectif de volume sans date, format ni temps cible', async () => {
      const volume = Goal.create({ title: 'Courir 500 km', type: 'volume' });

      await repository.save(volume);

      const stored = await prisma.goal.findUniqueOrThrow({
        where: { id: volume.id.toString() },
      });
      expect(stored.targetDate).toBeNull();
      expect(stored.eventFormat).toBeNull();
      expect(stored.targetTimeSeconds).toBeNull();
    });
  });

  describe('findById', () => {
    it('renvoie null pour un identifiant inconnu', async () => {
      await expect(
        repository.findById(GoalId.create(UNKNOWN_ID)),
      ).resolves.toBeNull();
    });

    it('relit un objectif équivalent à celui enregistré', async () => {
      const original = evenement();
      await repository.save(original);

      const found = await repository.findById(original.id);

      expect(found?.id.toString()).toBe(original.id.toString());
      expect(found?.title).toBe('Triathlon de Nice');
      expect(found?.type).toBe('evenement');
      expect(found?.eventFormat).toBe('olympique');
      expect(found?.targetTime?.seconds()).toBe(7200);
      expect(found?.targetDate?.toISOString()).toBe('2099-06-20T00:00:00.000Z');
    });
  });

  describe('findAll', () => {
    it('renvoie les objectifs par date cible croissante, sans date en dernier', async () => {
      await repository.save(
        Goal.create({ title: 'Sans date', type: 'regularite' }),
      );
      await repository.save(
        evenement({ title: 'Lointain', targetDate: day('2100-01-01') }),
      );
      await repository.save(
        evenement({ title: 'Proche', targetDate: day('2099-01-01') }),
      );

      const found = await repository.findAll({});

      expect(found.map((goal) => goal.title)).toEqual([
        'Proche',
        'Lointain',
        'Sans date',
      ]);
    });

    it('ne renvoie que les objectifs dont la date est au moins upcomingFrom, sans date exclue', async () => {
      await repository.save(
        evenement({ title: 'Passé', targetDate: day('2000-01-01') }),
      );
      await repository.save(
        evenement({ title: 'Jour même', targetDate: day('2099-06-20') }),
      );
      await repository.save(
        Goal.create({ title: 'Sans date', type: 'volume' }),
      );

      const found = await repository.findAll({
        upcomingFrom: day('2099-06-20'),
      });

      expect(found.map((goal) => goal.title)).toEqual(['Jour même']);
    });
  });

  describe('delete', () => {
    it('supprime l’objectif ciblé', async () => {
      const target = evenement();
      const other = evenement();
      await repository.save(target);
      await repository.save(other);

      await repository.delete(target.id);

      expect(await prisma.goal.count()).toBe(1);
      await expect(repository.findById(target.id)).resolves.toBeNull();
      await expect(repository.findById(other.id)).resolves.not.toBeNull();
    });

    it('ne fait rien pour un identifiant inconnu', async () => {
      await repository.save(evenement());

      await expect(
        repository.delete(GoalId.create(UNKNOWN_ID)),
      ).resolves.toBeUndefined();
      expect(await prisma.goal.count()).toBe(1);
    });
  });
});
