import { plainToInstance } from 'class-transformer';
import { Test } from '@nestjs/testing';
import { WorkoutGenerationUnavailableError } from '../../../domain/errors/workout-generation-unavailable.error.js';
import { GenerateWorkoutUseCase } from '../../../application/use-cases/generate-workout.use-case.js';
import type { GeneratedWorkoutDto } from '../../../application/dtos/generate-workout.dto.js';
import { GenerateWorkoutRequestDto } from '../dtos/generate-workout.request.dto.js';
import { GeneratedWorkoutResponseDto } from '../dtos/generated-workout.response.dto.js';
import { WorkoutsController } from './workouts.controller.js';

function request(plain: Record<string, unknown>): GenerateWorkoutRequestDto {
  return plainToInstance(GenerateWorkoutRequestDto, plain);
}

function workoutDto(): GeneratedWorkoutDto {
  return {
    title: 'Fractionné court',
    sport: 'running',
    summary: 'Échauffement, fractions, retour au calme.',
    totalDurationMinutes: 45,
    steps: [
      {
        order: 1,
        label: 'Échauffement',
        durationMinutes: 45,
        intensity: 'easy',
        notes: null,
      },
    ],
    basedOn: {
      weeks: 4,
      from: new Date('2026-10-05T00:00:00.000Z'),
      to: new Date('2026-11-01T23:59:59.999Z'),
    },
  };
}

describe('WorkoutsController', () => {
  let controller: WorkoutsController;
  const execute = vi.fn();

  beforeEach(async () => {
    execute.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [WorkoutsController],
      providers: [{ provide: GenerateWorkoutUseCase, useValue: { execute } }],
    }).compile();
    controller = moduleRef.get(WorkoutsController);
  });

  describe('transmission de la requête', () => {
    it('transmet le sport, l objectif, la durée et le nombre de semaines', async () => {
      execute.mockResolvedValue(workoutDto());

      await controller.generate(
        request({
          sport: 'course à pied',
          goal: 'préparer un 10 km',
          durationMinutes: 45,
          weeks: 6,
        }),
      );

      expect(execute).toHaveBeenCalledWith({
        sport: 'course à pied',
        goal: 'préparer un 10 km',
        durationMinutes: 45,
        weeks: 6,
      });
    });

    it('transmet null pour un corps vide', async () => {
      execute.mockResolvedValue(workoutDto());

      await controller.generate(request({}));

      expect(execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sport: null,
          goal: null,
          durationMinutes: null,
        }),
      );
    });

    it('déclenche le use case une seule fois par requête', async () => {
      execute.mockResolvedValue(workoutDto());

      await controller.generate(request({}));

      expect(execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('réponse', () => {
    it('renvoie la séance du use case au format de réponse', async () => {
      execute.mockResolvedValue(workoutDto());

      const response = await controller.generate(request({}));

      expect(response).toBeInstanceOf(GeneratedWorkoutResponseDto);
      expect(response).toMatchObject({
        title: 'Fractionné court',
        totalDurationMinutes: 45,
        basedOn: { weeks: 4, from: '2026-10-05', to: '2026-11-01' },
      });
      expect(response.steps).toHaveLength(1);
    });
  });

  describe('erreurs', () => {
    it('laisse remonter les erreurs techniques sans les capturer', async () => {
      execute.mockRejectedValue(new WorkoutGenerationUnavailableError());

      await expect(controller.generate(request({}))).rejects.toBeInstanceOf(
        WorkoutGenerationUnavailableError,
      );
    });
  });
});
