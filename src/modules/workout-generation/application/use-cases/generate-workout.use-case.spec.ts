import { Test } from '@nestjs/testing';
import { GeneratedWorkout } from '../../domain/entities/generated-workout.entity.js';
import { InvalidGeneratedWorkoutError } from '../../domain/errors/invalid-generated-workout.error.js';
import { WorkoutGenerationAccessDeniedError } from '../../domain/errors/workout-generation-access-denied.error.js';
import { WorkoutGenerationUnavailableError } from '../../domain/errors/workout-generation-unavailable.error.js';
import {
  RECENT_TRAINING_CONTEXT_PROVIDER,
  type IRecentTrainingContextProvider,
  type RecentTrainingContext,
  type RecentTrainingWeek,
} from '../../domain/ports/outbound/recent-training-context.port.js';
import {
  WORKOUT_AI_GENERATOR,
  type GenerateWorkoutInput,
  type IWorkoutAiGenerator,
} from '../../domain/ports/outbound/workout-ai-generator.port.js';
import { WorkoutIntensity } from '../../domain/value-objects/workout-intensity.vo.js';
import { WorkoutStep } from '../../domain/value-objects/workout-step.vo.js';
import { GenerateWorkoutUseCase } from './generate-workout.use-case.js';

function week(start: string, end: string): RecentTrainingWeek {
  return {
    start: new Date(start),
    end: new Date(end),
    activityCount: 2,
    durationSeconds: 5400,
    distanceMeters: 12000,
    byType: [
      {
        type: 'running',
        activityCount: 2,
        durationSeconds: 5400,
        distanceMeters: 12000,
      },
    ],
  };
}

function validWorkout(): GeneratedWorkout {
  return GeneratedWorkout.create({
    title: 'Fractionné court',
    sport: 'running',
    summary: 'Échauffement, fractions, retour au calme.',
    totalDurationMinutes: 45,
    steps: [
      WorkoutStep.create({
        order: 1,
        label: 'Échauffement',
        durationMinutes: 10,
        intensity: WorkoutIntensity.create('easy'),
        notes: null,
      }),
      WorkoutStep.create({
        order: 2,
        label: 'Fractions',
        durationMinutes: 25,
        intensity: WorkoutIntensity.create('hard'),
        notes: null,
      }),
      WorkoutStep.create({
        order: 3,
        label: 'Retour au calme',
        durationMinutes: 10,
        intensity: WorkoutIntensity.create('easy'),
        notes: null,
      }),
    ],
  });
}

class FakeRecentTrainingContextProvider implements IRecentTrainingContextProvider {
  context: RecentTrainingContext = {
    weeks: [
      week('2026-10-19T00:00:00.000Z', '2026-10-25T23:59:59.999Z'),
      week('2026-10-26T00:00:00.000Z', '2026-11-01T23:59:59.999Z'),
    ],
  };
  requestedWeeks: number[] = [];
  failure?: Error;

  getRecent(weeks: number): Promise<RecentTrainingContext> {
    this.requestedWeeks.push(weeks);
    if (this.failure) {
      return Promise.reject(this.failure);
    }
    return Promise.resolve(this.context);
  }
}

class FakeWorkoutAiGenerator implements IWorkoutAiGenerator {
  inputs: GenerateWorkoutInput[] = [];
  workout: GeneratedWorkout = validWorkout();
  failure?: Error;

  generate(input: GenerateWorkoutInput): Promise<GeneratedWorkout> {
    this.inputs.push(input);
    if (this.failure) {
      return Promise.reject(this.failure);
    }
    return Promise.resolve(this.workout);
  }
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => undefined,
    (e: unknown) => e,
  );
}

describe('GenerateWorkoutUseCase', () => {
  let useCase: GenerateWorkoutUseCase;
  let contextProvider: FakeRecentTrainingContextProvider;
  let generator: FakeWorkoutAiGenerator;

  beforeEach(async () => {
    contextProvider = new FakeRecentTrainingContextProvider();
    generator = new FakeWorkoutAiGenerator();
    const moduleRef = await Test.createTestingModule({
      providers: [
        GenerateWorkoutUseCase,
        {
          provide: RECENT_TRAINING_CONTEXT_PROVIDER,
          useValue: contextProvider,
        },
        { provide: WORKOUT_AI_GENERATOR, useValue: generator },
      ],
    }).compile();
    useCase = moduleRef.get(GenerateWorkoutUseCase);
  });

  describe('contexte transmis', () => {
    it('demande quatre semaines de statistiques quand le nombre de semaines est omis', async () => {
      await useCase.execute({ sport: null, goal: null, durationMinutes: null });

      expect(contextProvider.requestedWeeks).toEqual([4]);
    });

    it('demande le nombre de semaines fourni', async () => {
      await useCase.execute({
        sport: null,
        goal: null,
        durationMinutes: null,
        weeks: 8,
      });

      expect(contextProvider.requestedWeeks).toEqual([8]);
    });

    it('transmet au générateur le contexte récent tel que fourni', async () => {
      await useCase.execute({ sport: null, goal: null, durationMinutes: null });

      expect(generator.inputs[0]?.context).toEqual(contextProvider.context);
    });

    it('transmet le sport, l objectif et la durée demandés', async () => {
      await useCase.execute({
        sport: 'course à pied',
        goal: 'préparer un 10 km',
        durationMinutes: 45,
      });

      expect(generator.inputs[0]).toMatchObject({
        sport: 'course à pied',
        goal: 'préparer un 10 km',
        durationMinutes: 45,
      });
    });

    it('transmet null pour les champs facultatifs absents', async () => {
      await useCase.execute({ sport: null, goal: null, durationMinutes: null });

      expect(generator.inputs[0]).toMatchObject({
        sport: null,
        goal: null,
        durationMinutes: null,
      });
    });

    it('génère une fois par appel', async () => {
      await useCase.execute({ sport: null, goal: null, durationMinutes: null });

      expect(generator.inputs).toHaveLength(1);
    });

    it('génère quand le contexte récent est vide', async () => {
      contextProvider.context = { weeks: [] };

      const result = await useCase.execute({
        sport: 'course à pied',
        goal: null,
        durationMinutes: 45,
      });

      expect(generator.inputs[0]?.context).toEqual({ weeks: [] });
      expect(result.title).toBe('Fractionné court');
    });
  });

  describe('séance renvoyée', () => {
    it('renvoie la séance générée au format de réponse', async () => {
      const result = await useCase.execute({
        sport: null,
        goal: null,
        durationMinutes: null,
      });

      expect(result).toMatchObject({
        title: 'Fractionné court',
        sport: 'running',
        summary: 'Échauffement, fractions, retour au calme.',
        totalDurationMinutes: 45,
      });
      expect(result.steps.map((s) => s.label)).toEqual([
        'Échauffement',
        'Fractions',
        'Retour au calme',
      ]);
      expect(result.steps.map((s) => s.intensity)).toEqual([
        'easy',
        'hard',
        'easy',
      ]);
    });

    it('indique la fenêtre de statistiques sur laquelle la séance est basée', async () => {
      const result = await useCase.execute({
        sport: null,
        goal: null,
        durationMinutes: null,
      });

      expect(result.basedOn).toEqual({
        weeks: 2,
        from: new Date('2026-10-19T00:00:00.000Z'),
        to: new Date('2026-11-01T23:59:59.999Z'),
      });
    });
  });

  describe('erreurs', () => {
    it("propage l'erreur du contexte sans appeler le générateur", async () => {
      const failure = new Error('contexte indisponible');
      contextProvider.failure = failure;

      const error = await rejection(
        useCase.execute({ sport: null, goal: null, durationMinutes: null }),
      );

      expect(error).toBe(failure);
      expect(generator.inputs).toHaveLength(0);
    });

    it("propage l'indisponibilité de l'IA", async () => {
      generator.failure = new WorkoutGenerationUnavailableError();

      await expect(
        useCase.execute({ sport: null, goal: null, durationMinutes: null }),
      ).rejects.toBeInstanceOf(WorkoutGenerationUnavailableError);
    });

    it("propage le refus d'accès à l'IA", async () => {
      generator.failure = new WorkoutGenerationAccessDeniedError();

      await expect(
        useCase.execute({ sport: null, goal: null, durationMinutes: null }),
      ).rejects.toBeInstanceOf(WorkoutGenerationAccessDeniedError);
    });

    it('propage une sortie invalide sans renvoyer de séance partielle', async () => {
      generator.failure = new InvalidGeneratedWorkoutError(
        'la durée totale ne correspond pas aux étapes',
      );

      const error = await rejection(
        useCase.execute({ sport: null, goal: null, durationMinutes: null }),
      );

      expect(error).toBeInstanceOf(InvalidGeneratedWorkoutError);
    });
  });
});
