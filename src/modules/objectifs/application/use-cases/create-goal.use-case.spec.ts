import { Test } from '@nestjs/testing';
import type { Goal } from '../../domain/entities/goal.entity.js';
import { InvalidGoalError } from '../../domain/errors/invalid-goal.error.js';
import { InvalidTargetTimeError } from '../../domain/errors/invalid-target-time.error.js';
import {
  type IGoalRepository,
  GOAL_REPOSITORY,
} from '../../domain/ports/outbound/goal.repository.port.js';
import type { GoalId } from '../../domain/value-objects/goal-id.vo.js';
import type { CreateGoalCommand } from '../dtos/goal.dto.js';
import { CreateGoalUseCase } from './create-goal.use-case.js';

const TRIATHLON_OLYMPIQUE: CreateGoalCommand = {
  title: 'Triathlon de Nice',
  type: 'evenement',
  targetDate: '2027-06-20',
  eventFormat: 'olympique',
  targetTimeSeconds: 7200,
};

class FakeGoalRepository implements IGoalRepository {
  readonly goals = new Map<string, Goal>();

  findById(id: GoalId): Promise<Goal | null> {
    return Promise.resolve(this.goals.get(id.toString()) ?? null);
  }

  findAll(_filter: { upcomingFrom?: Date }): Promise<Goal[]> {
    return Promise.resolve([...this.goals.values()]);
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

describe('CreateGoalUseCase', () => {
  let useCase: CreateGoalUseCase;
  let repository: FakeGoalRepository;

  beforeEach(async () => {
    repository = new FakeGoalRepository();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateGoalUseCase,
        { provide: GOAL_REPOSITORY, useValue: repository },
      ],
    }).compile();
    useCase = moduleRef.get(CreateGoalUseCase);
  });

  describe('création réussie', () => {
    it('renvoie un événement avec sa date, son format et son temps cible', async () => {
      const result = await useCase.execute(TRIATHLON_OLYMPIQUE);

      expect(result).toEqual({
        id: expect.any(String),
        title: 'Triathlon de Nice',
        type: 'evenement',
        targetDate: '2027-06-20',
        eventFormat: 'olympique',
        targetTimeSeconds: 7200,
      });
    });

    it('persiste l’objectif sous l’identifiant renvoyé', async () => {
      const result = await useCase.execute(TRIATHLON_OLYMPIQUE);

      expect(repository.goals.size).toBe(1);
      expect(repository.goals.get(result.id)?.eventFormat).toBe('olympique');
    });

    it('renvoie un objectif de volume sans date, format ni temps cible', async () => {
      const result = await useCase.execute({
        title: 'Courir 500 km',
        type: 'volume',
      });

      expect(result).toEqual({
        id: expect.any(String),
        title: 'Courir 500 km',
        type: 'volume',
        targetDate: null,
        eventFormat: null,
        targetTimeSeconds: null,
      });
    });

    it('renvoie un objectif de régularité sans date cible', async () => {
      const result = await useCase.execute({
        title: 'Trois séances par semaine',
        type: 'regularite',
        targetDate: null,
      });

      expect(result.type).toBe('regularite');
      expect(result.targetDate).toBeNull();
    });

    it('attribue un identifiant distinct à chaque création', async () => {
      const first = await useCase.execute(TRIATHLON_OLYMPIQUE);
      const second = await useCase.execute(TRIATHLON_OLYMPIQUE);

      expect(first.id).not.toBe(second.id);
      expect(repository.goals.size).toBe(2);
    });
  });

  describe('refus sans persistance', () => {
    it('refuse un format posé sur un objectif de volume avec GOAL_INVALID', async () => {
      await expect(
        useCase.execute({
          title: 'Courir 500 km',
          type: 'volume',
          eventFormat: 'sprint',
        }),
      ).rejects.toBeInstanceOf(InvalidGoalError);

      expect(repository.goals.size).toBe(0);
    });

    it('refuse un temps cible posé sur un objectif de régularité avec GOAL_INVALID', async () => {
      await expect(
        useCase.execute({
          title: 'Trois séances par semaine',
          type: 'regularite',
          targetTimeSeconds: 3600,
        }),
      ).rejects.toMatchObject({ code: 'GOAL_INVALID' });

      expect(repository.goals.size).toBe(0);
    });

    it('refuse un titre vide avec GOAL_INVALID', async () => {
      await expect(
        useCase.execute({ ...TRIATHLON_OLYMPIQUE, title: '   ' }),
      ).rejects.toMatchObject({ code: 'GOAL_INVALID' });

      expect(repository.goals.size).toBe(0);
    });

    it('refuse un type inconnu avec GOAL_INVALID', async () => {
      await expect(
        useCase.execute({ ...TRIATHLON_OLYMPIQUE, type: 'course' }),
      ).rejects.toMatchObject({ code: 'GOAL_INVALID' });

      expect(repository.goals.size).toBe(0);
    });

    it('refuse un format inconnu avec GOAL_INVALID', async () => {
      await expect(
        useCase.execute({ ...TRIATHLON_OLYMPIQUE, eventFormat: 'marathon' }),
      ).rejects.toMatchObject({ code: 'GOAL_INVALID' });

      expect(repository.goals.size).toBe(0);
    });

    it.each([
      ['nul', 0],
      ['négatif', -60],
      ['non entier', 90.5],
    ])(
      'refuse un temps cible %s avec GOAL_TARGET_TIME_INVALID',
      async (_label, targetTimeSeconds) => {
        await expect(
          useCase.execute({ ...TRIATHLON_OLYMPIQUE, targetTimeSeconds }),
        ).rejects.toBeInstanceOf(InvalidTargetTimeError);

        expect(repository.goals.size).toBe(0);
      },
    );
  });
});
