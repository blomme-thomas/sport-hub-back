import { plainToInstance } from 'class-transformer';
import type { GeneratedWorkoutDto } from '../../../application/dtos/generate-workout.dto.js';
import { GenerateWorkoutRequestDto } from '../dtos/generate-workout.request.dto.js';
import { GeneratedWorkoutResponseDto } from '../dtos/generated-workout.response.dto.js';
import { WorkoutHttpMapper } from './workout.http-mapper.js';

function dto(): GeneratedWorkoutDto {
  return {
    title: 'Fractionné court',
    sport: 'running',
    summary: 'Échauffement, fractions, retour au calme.',
    totalDurationMinutes: 45,
    steps: [
      {
        order: 1,
        label: 'Échauffement',
        durationMinutes: 10,
        intensity: 'easy',
        notes: null,
      },
      {
        order: 2,
        label: 'Fractions',
        durationMinutes: 25,
        intensity: 'hard',
        notes: 'Récupération active entre les fractions',
      },
      {
        order: 3,
        label: 'Retour au calme',
        durationMinutes: 10,
        intensity: 'easy',
        notes: null,
      },
    ],
    basedOn: {
      weeks: 2,
      from: new Date('2026-10-19T00:00:00.000Z'),
      to: new Date('2026-11-01T23:59:59.999Z'),
    },
  };
}

function request(plain: Record<string, unknown>): GenerateWorkoutRequestDto {
  return plainToInstance(GenerateWorkoutRequestDto, plain);
}

describe('WorkoutHttpMapper', () => {
  describe('toCommand', () => {
    it('transmet les champs fournis tels quels', () => {
      expect(
        WorkoutHttpMapper.toCommand(
          request({
            sport: 'course à pied',
            goal: 'préparer un 10 km',
            durationMinutes: 45,
            weeks: 6,
          }),
        ),
      ).toEqual({
        sport: 'course à pied',
        goal: 'préparer un 10 km',
        durationMinutes: 45,
        weeks: 6,
      });
    });

    it('transmet null pour les champs facultatifs absents', () => {
      const command = WorkoutHttpMapper.toCommand(request({}));

      expect(command.sport).toBeNull();
      expect(command.goal).toBeNull();
      expect(command.durationMinutes).toBeNull();
    });

    it('laisse le nombre de semaines non défini quand il est omis, le Use Case applique son défaut', () => {
      expect(WorkoutHttpMapper.toCommand(request({})).weeks).toBeUndefined();
    });
  });

  describe('toResponse', () => {
    it('renvoie un DTO de réponse', () => {
      expect(WorkoutHttpMapper.toResponse(dto())).toBeInstanceOf(
        GeneratedWorkoutResponseDto,
      );
    });

    it('recopie le titre, le sport, le résumé et la durée totale', () => {
      const response = WorkoutHttpMapper.toResponse(dto());

      expect(response).toMatchObject({
        title: 'Fractionné court',
        sport: 'running',
        summary: 'Échauffement, fractions, retour au calme.',
        totalDurationMinutes: 45,
      });
    });

    it('recopie les étapes dans l ordre avec leur intensité', () => {
      const response = WorkoutHttpMapper.toResponse(dto());

      expect(
        response.steps.map((s) => ({
          order: s.order,
          label: s.label,
          durationMinutes: s.durationMinutes,
          intensity: s.intensity,
        })),
      ).toEqual([
        {
          order: 1,
          label: 'Échauffement',
          durationMinutes: 10,
          intensity: 'easy',
        },
        {
          order: 2,
          label: 'Fractions',
          durationMinutes: 25,
          intensity: 'hard',
        },
        {
          order: 3,
          label: 'Retour au calme',
          durationMinutes: 10,
          intensity: 'easy',
        },
      ]);
    });

    it('conserve les notes d une étape quand elles sont fournies', () => {
      const response = WorkoutHttpMapper.toResponse(dto());

      expect(response.steps[1]?.notes).toBe(
        'Récupération active entre les fractions',
      );
    });

    it('exprime la fenêtre de statistiques en dates de calendrier YYYY-MM-DD', () => {
      const response = WorkoutHttpMapper.toResponse(dto());

      expect(response.basedOn).toEqual({
        weeks: 2,
        from: '2026-10-19',
        to: '2026-11-01',
      });
    });
  });
});
