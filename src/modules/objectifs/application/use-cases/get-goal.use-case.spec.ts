import { Test } from '@nestjs/testing';
import { Goal } from '../../domain/entities/goal.entity.js';
import { GoalNotFoundError } from '../../domain/errors/goal-not-found.error.js';
import {
  type IGoalRepository,
  GOAL_REPOSITORY,
} from '../../domain/ports/outbound/goal.repository.port.js';
import type { GoalId } from '../../domain/value-objects/goal-id.vo.js';
import { TargetTime } from '../../domain/value-objects/target-time.vo.js';
import { GetGoalUseCase } from './get-goal.use-case.js';

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

describe('GetGoalUseCase', () => {
  let useCase: GetGoalUseCase;
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
        GetGoalUseCase,
        { provide: GOAL_REPOSITORY, useValue: repository },
      ],
    }).compile();
    useCase = moduleRef.get(GetGoalUseCase);
  });

  it('renvoie l’objectif avec son format et son temps cible', async () => {
    const result = await useCase.execute(id);

    expect(result).toEqual({
      id,
      title: 'Triathlon de Nice',
      type: 'evenement',
      targetDate: '2027-06-20',
      eventFormat: 'olympique',
      targetTimeSeconds: 7200,
    });
  });

  it('renvoie un objectif de volume avec les champs optionnels à null', async () => {
    const volume = Goal.create({ title: 'Courir 500 km', type: 'volume' });
    await repository.save(volume);

    const result = await useCase.execute(volume.id.toString());

    expect(result).toEqual({
      id: volume.id.toString(),
      title: 'Courir 500 km',
      type: 'volume',
      targetDate: null,
      eventFormat: null,
      targetTimeSeconds: null,
    });
  });

  it('refuse un identifiant inconnu avec GOAL_NOT_FOUND', async () => {
    await expect(useCase.execute(UNKNOWN_ID)).rejects.toBeInstanceOf(
      GoalNotFoundError,
    );
    await expect(useCase.execute(UNKNOWN_ID)).rejects.toMatchObject({
      code: 'GOAL_NOT_FOUND',
    });
  });
});
