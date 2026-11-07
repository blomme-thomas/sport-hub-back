import { Test } from '@nestjs/testing';
import { Goal } from '../../domain/entities/goal.entity.js';
import { GoalNotFoundError } from '../../domain/errors/goal-not-found.error.js';
import { InvalidGoalError } from '../../domain/errors/invalid-goal.error.js';
import { InvalidTargetTimeError } from '../../domain/errors/invalid-target-time.error.js';
import {
  type IGoalRepository,
  GOAL_REPOSITORY,
} from '../../domain/ports/outbound/goal.repository.port.js';
import type { GoalId } from '../../domain/value-objects/goal-id.vo.js';
import { TargetTime } from '../../domain/value-objects/target-time.vo.js';
import { UpdateGoalUseCase } from './update-goal.use-case.js';

const UNKNOWN_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

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

function seededGoal(): Goal {
  return Goal.create({
    title: 'Triathlon de Nice',
    type: 'evenement',
    targetDate: new Date('2027-06-20T00:00:00.000Z'),
    eventFormat: 'olympique',
    targetTime: TargetTime.create(7200),
  });
}

describe('UpdateGoalUseCase', () => {
  let useCase: UpdateGoalUseCase;
  let repository: FakeGoalRepository;
  let goal: Goal;
  let id: string;

  beforeEach(async () => {
    repository = new FakeGoalRepository();
    goal = seededGoal();
    id = goal.id.toString();
    await repository.save(goal);
    const moduleRef = await Test.createTestingModule({
      providers: [
        UpdateGoalUseCase,
        { provide: GOAL_REPOSITORY, useValue: repository },
      ],
    }).compile();
    useCase = moduleRef.get(UpdateGoalUseCase);
  });

  describe('modification réussie', () => {
    it('modifie le format et le temps cible d’un événement et renvoie l’objectif', async () => {
      const result = await useCase.execute({
        id,
        eventFormat: 'half',
        targetTimeSeconds: 21600,
      });

      expect(result).toEqual({
        id,
        title: 'Triathlon de Nice',
        type: 'evenement',
        targetDate: '2027-06-20',
        eventFormat: 'half',
        targetTimeSeconds: 21600,
      });
    });

    it('persiste la modification sous le même identifiant', async () => {
      await useCase.execute({
        id,
        eventFormat: 'half',
        targetTimeSeconds: 21600,
      });

      expect(repository.goals.size).toBe(1);
      expect(repository.goals.get(id)?.eventFormat).toBe('half');
      expect(repository.goals.get(id)?.targetTime?.seconds()).toBe(21600);
    });

    it('conserve les champs absents de la modification', async () => {
      const result = await useCase.execute({ id, title: 'Triathlon de Lyon' });

      expect(result).toEqual({
        id,
        title: 'Triathlon de Lyon',
        type: 'evenement',
        targetDate: '2027-06-20',
        eventFormat: 'olympique',
        targetTimeSeconds: 7200,
      });
    });

    it('efface le temps cible quand il vaut null', async () => {
      const result = await useCase.execute({ id, targetTimeSeconds: null });

      expect(result.targetTimeSeconds).toBeNull();
      expect(result.eventFormat).toBe('olympique');
    });

    it('efface la date cible quand elle vaut null', async () => {
      const result = await useCase.execute({ id, targetDate: null });

      expect(result.targetDate).toBeNull();
    });

    it('accepte une date cible déjà passée', async () => {
      const result = await useCase.execute({ id, targetDate: '2020-01-01' });

      expect(result.targetDate).toBe('2020-01-01');
    });

    it('passe un événement en objectif de volume quand la même modification efface format et temps cible', async () => {
      const result = await useCase.execute({
        id,
        type: 'volume',
        eventFormat: null,
        targetTimeSeconds: null,
      });

      expect(result).toMatchObject({
        type: 'volume',
        eventFormat: null,
        targetTimeSeconds: null,
      });
    });
  });

  describe('refus sans modification', () => {
    it('refuse un passage à un type de volume tant que le format est posé et ne modifie pas l’objectif', async () => {
      await expect(
        useCase.execute({ id, type: 'volume' }),
      ).rejects.toBeInstanceOf(InvalidGoalError);

      expect(repository.goals.get(id)?.type).toBe('evenement');
      expect(repository.goals.get(id)?.eventFormat).toBe('olympique');
    });

    it.each([
      ['nul', 0],
      ['négatif', -1],
    ])(
      'refuse un temps cible %s avec GOAL_TARGET_TIME_INVALID et ne modifie pas l’objectif',
      async (_label, targetTimeSeconds) => {
        await expect(
          useCase.execute({ id, targetTimeSeconds }),
        ).rejects.toBeInstanceOf(InvalidTargetTimeError);

        expect(repository.goals.get(id)?.targetTime?.seconds()).toBe(7200);
      },
    );

    it('refuse un titre vide avec GOAL_INVALID', async () => {
      await expect(useCase.execute({ id, title: '   ' })).rejects.toMatchObject(
        {
          code: 'GOAL_INVALID',
        },
      );

      expect(repository.goals.get(id)?.title).toBe('Triathlon de Nice');
    });

    it('refuse un type inconnu avec GOAL_INVALID', async () => {
      await expect(
        useCase.execute({ id, type: 'course' }),
      ).rejects.toMatchObject({
        code: 'GOAL_INVALID',
      });
    });

    it('refuse un identifiant inconnu avec GOAL_NOT_FOUND sans rien créer', async () => {
      await expect(
        useCase.execute({ id: UNKNOWN_ID, eventFormat: 'half' }),
      ).rejects.toBeInstanceOf(GoalNotFoundError);
      await expect(
        useCase.execute({ id: UNKNOWN_ID, eventFormat: 'half' }),
      ).rejects.toMatchObject({ code: 'GOAL_NOT_FOUND' });

      expect(repository.goals.size).toBe(1);
      expect(repository.goals.has(UNKNOWN_ID)).toBe(false);
    });
  });
});
