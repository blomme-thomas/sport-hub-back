import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { Goal } from '../../domain/entities/goal.entity.js';
import {
  type IGoalRepository,
  GOAL_REPOSITORY,
} from '../../domain/ports/outbound/goal.repository.port.js';
import type { GoalId } from '../../domain/value-objects/goal-id.vo.js';
import type { GoalDto } from '../dtos/goal.dto.js';
import { ListGoalsUseCase } from './list-goals.use-case.js';

function day(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function titles(goals: GoalDto[]): string[] {
  return goals.map((goal) => goal.title).sort();
}

class FakeGoalRepository implements IGoalRepository {
  readonly goals = new Map<string, Goal>();

  findById(id: GoalId): Promise<Goal | null> {
    return Promise.resolve(this.goals.get(id.toString()) ?? null);
  }

  findAll(filter: { upcomingFrom?: Date }): Promise<Goal[]> {
    const all = [...this.goals.values()];
    const upcomingFrom = filter.upcomingFrom;
    if (upcomingFrom === undefined) {
      return Promise.resolve(all);
    }
    return Promise.resolve(
      all.filter(
        (goal) => goal.targetDate !== null && goal.targetDate >= upcomingFrom,
      ),
    );
  }

  save(goal: Goal): Promise<void> {
    this.goals.set(goal.id.toString(), goal);
    return Promise.resolve();
  }

  delete(id: GoalId): Promise<void> {
    this.goals.delete(id.toString());
    return Promise.resolve();
  }
}

describe('ListGoalsUseCase', () => {
  let useCase: ListGoalsUseCase;
  let repository: FakeGoalRepository;

  beforeEach(async () => {
    repository = new FakeGoalRepository();
    const seeds = [
      Goal.create({
        title: 'Semi-marathon passé',
        type: 'evenement',
        targetDate: day('2026-10-01'),
        eventFormat: 'half',
      }),
      Goal.create({
        title: 'Triathlon du jour',
        type: 'evenement',
        targetDate: day('2026-11-07'),
        eventFormat: 'sprint',
      }),
      Goal.create({
        title: 'Triathlon de Nice',
        type: 'evenement',
        targetDate: day('2027-06-20'),
        eventFormat: 'olympique',
      }),
      Goal.create({ title: 'Courir 500 km', type: 'volume' }),
      Goal.create({ title: 'Trois séances par semaine', type: 'regularite' }),
    ];
    for (const goal of seeds) {
      await repository.save(goal);
    }
    const moduleRef = await Test.createTestingModule({
      providers: [
        ListGoalsUseCase,
        { provide: GOAL_REPOSITORY, useValue: repository },
      ],
    }).compile();
    useCase = moduleRef.get(ListGoalsUseCase);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('liste complète', () => {
    it('renvoie tous les objectifs sans filtre', async () => {
      const result = await useCase.execute({});

      expect(titles(result)).toEqual([
        'Courir 500 km',
        'Semi-marathon passé',
        'Triathlon de Nice',
        'Triathlon du jour',
        'Trois séances par semaine',
      ]);
    });

    it('renvoie tous les objectifs quand upcoming vaut false', async () => {
      const result = await useCase.execute({ upcoming: false });

      expect(result).toHaveLength(5);
    });

    it('renvoie les objectifs avec leur date au format YYYY-MM-DD ou null', async () => {
      const result = await useCase.execute({});

      expect(
        result.find((goal) => goal.title === 'Triathlon de Nice'),
      ).toMatchObject({
        targetDate: '2027-06-20',
        eventFormat: 'olympique',
        targetTimeSeconds: null,
      });
      expect(
        result.find((goal) => goal.title === 'Courir 500 km')?.targetDate,
      ).toBeNull();
    });
  });

  describe('objectifs à venir', () => {
    it('exclut les objectifs passés et les objectifs sans date', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-11-06T10:00:00.000Z'));

      const result = await useCase.execute({ upcoming: true });

      expect(titles(result)).toEqual([
        'Triathlon de Nice',
        'Triathlon du jour',
      ]);
    });

    it('inclut l’objectif dont la date est le jour même quand il est tard dans la journée', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-11-07T23:30:00.000Z'));

      const result = await useCase.execute({ upcoming: true });

      expect(titles(result)).toEqual([
        'Triathlon de Nice',
        'Triathlon du jour',
      ]);
    });

    it('définit le jour courant selon le calendrier UTC', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-11-06T23:30:00.000Z'));

      const result = await useCase.execute({ upcoming: true });

      expect(result.map((goal) => goal.title)).toContain('Triathlon du jour');
    });

    it('n’inclut plus un objectif une fois sa date passée', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-11-08T00:00:00.000Z'));

      const result = await useCase.execute({ upcoming: true });

      expect(titles(result)).toEqual(['Triathlon de Nice']);
    });

    it('renvoie une liste vide quand aucun objectif n’est à venir', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2028-01-01T00:00:00.000Z'));

      await expect(useCase.execute({ upcoming: true })).resolves.toEqual([]);
    });
  });
});
