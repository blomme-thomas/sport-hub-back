import { Test } from '@nestjs/testing';
import { Goal } from '../../domain/entities/goal.entity.js';
import { GoalNotFoundError } from '../../domain/errors/goal-not-found.error.js';
import {
  type IGoalRepository,
  GOAL_REPOSITORY,
} from '../../domain/ports/outbound/goal.repository.port.js';
import type { GoalId } from '../../domain/value-objects/goal-id.vo.js';
import { DeleteGoalUseCase } from './delete-goal.use-case.js';

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

describe('DeleteGoalUseCase', () => {
  let useCase: DeleteGoalUseCase;
  let repository: FakeGoalRepository;
  let goal: Goal;
  let id: string;

  beforeEach(async () => {
    repository = new FakeGoalRepository();
    goal = Goal.create({
      title: 'Triathlon de Nice',
      type: 'evenement',
      targetDate: new Date('2027-06-20T00:00:00.000Z'),
      eventFormat: 'olympique',
    });
    id = goal.id.toString();
    await repository.save(goal);
    const moduleRef = await Test.createTestingModule({
      providers: [
        DeleteGoalUseCase,
        { provide: GOAL_REPOSITORY, useValue: repository },
      ],
    }).compile();
    useCase = moduleRef.get(DeleteGoalUseCase);
  });

  it('supprime l’objectif existant', async () => {
    await useCase.execute(id);

    expect(repository.goals.has(id)).toBe(false);
    expect(repository.goals.size).toBe(0);
  });

  it('ne supprime que l’objectif désigné', async () => {
    const other = Goal.create({ title: 'Courir 500 km', type: 'volume' });
    await repository.save(other);

    await useCase.execute(id);

    expect(repository.goals.size).toBe(1);
    expect(repository.goals.has(other.id.toString())).toBe(true);
  });

  it('refuse un identifiant inconnu avec GOAL_NOT_FOUND', async () => {
    await expect(useCase.execute(UNKNOWN_ID)).rejects.toBeInstanceOf(
      GoalNotFoundError,
    );
    await expect(useCase.execute(UNKNOWN_ID)).rejects.toMatchObject({
      code: 'GOAL_NOT_FOUND',
    });

    expect(repository.goals.has(id)).toBe(true);
  });

  it('refuse une seconde suppression du même objectif avec GOAL_NOT_FOUND', async () => {
    await useCase.execute(id);

    await expect(useCase.execute(id)).rejects.toMatchObject({
      code: 'GOAL_NOT_FOUND',
    });
  });
});
