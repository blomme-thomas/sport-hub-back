import type { PrismaService } from '../../../../../core/prisma/prisma.service.js';
import { Goal } from '../../../domain/entities/goal.entity.js';
import { GoalId } from '../../../domain/value-objects/goal-id.vo.js';
import { PrismaGoalRepositoryAdapter } from './goal.repository.adapter.js';

const GOAL_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: GOAL_ID,
    title: 'Courir 500 km',
    type: 'volume',
    targetDate: null,
    eventFormat: null,
    targetTimeSeconds: null,
    createdAt: new Date('2026-11-01T00:00:00.000Z'),
    updatedAt: new Date('2026-11-01T00:00:00.000Z'),
    ...overrides,
  };
}

function prismaStub() {
  const goal = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  };
  return { goal };
}

describe('PrismaGoalRepositoryAdapter', () => {
  let prisma: ReturnType<typeof prismaStub>;
  let adapter: PrismaGoalRepositoryAdapter;

  beforeEach(() => {
    prisma = prismaStub();
    adapter = new PrismaGoalRepositoryAdapter(
      prisma as unknown as PrismaService,
    );
  });

  describe('findById', () => {
    it('renvoie null quand aucun enregistrement ne correspond', async () => {
      prisma.goal.findUnique.mockResolvedValue(null);

      await expect(
        adapter.findById(GoalId.create(GOAL_ID)),
      ).resolves.toBeNull();
      expect(prisma.goal.findUnique).toHaveBeenCalledWith({
        where: { id: GOAL_ID },
      });
    });

    it('reconstitue l’objectif trouvé', async () => {
      prisma.goal.findUnique.mockResolvedValue(record());

      const found = await adapter.findById(GoalId.create(GOAL_ID));

      expect(found?.id.toString()).toBe(GOAL_ID);
      expect(found?.type).toBe('volume');
    });
  });

  describe('findAll', () => {
    it('lit tous les objectifs, triés par date cible sans date en dernier', async () => {
      prisma.goal.findMany.mockResolvedValue([]);

      await adapter.findAll({});

      expect(prisma.goal.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: [
          { targetDate: { sort: 'asc', nulls: 'last' } },
          { createdAt: 'asc' },
          { id: 'asc' },
        ],
      });
    });

    it('filtre sur la date cible à partir de upcomingFrom', async () => {
      prisma.goal.findMany.mockResolvedValue([]);
      const upcomingFrom = new Date('2026-11-07T00:00:00.000Z');

      await adapter.findAll({ upcomingFrom });

      expect(prisma.goal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { targetDate: { gte: upcomingFrom } },
        }),
      );
    });
  });

  describe('save', () => {
    it('enregistre l’objectif par upsert sous son identifiant', async () => {
      const goal = Goal.create({ title: 'Courir 500 km', type: 'volume' });

      await adapter.save(goal);

      const data = {
        id: goal.id.toString(),
        title: 'Courir 500 km',
        type: 'volume',
        targetDate: null,
        eventFormat: null,
        targetTimeSeconds: null,
      };
      expect(prisma.goal.upsert).toHaveBeenCalledWith({
        where: { id: goal.id.toString() },
        create: data,
        update: data,
      });
    });
  });

  describe('delete', () => {
    it('supprime l’enregistrement ciblé', async () => {
      await adapter.delete(GoalId.create(GOAL_ID));

      expect(prisma.goal.deleteMany).toHaveBeenCalledWith({
        where: { id: GOAL_ID },
      });
    });
  });
});
