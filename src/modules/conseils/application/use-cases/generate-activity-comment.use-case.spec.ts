import { describe, expect, it, vi } from 'vitest';
import { ActivityNotFoundError } from '../../domain/errors/activity-not-found.error.js';
import type {
  ActivityReference,
  CommentGenerationInput,
  IActivityCommentGenerator,
  IActivityCommentRepository,
  IActivityReader,
  IPlannedSessionReader,
  PlannedSessionReference,
} from '../../domain/ports/outbound/conseils.ports.js';
import type { ActivityComment } from '../../domain/value-objects/activity-comment.vo.js';
import {
  GENERIC_COMMENT_TEXT,
  GenerateActivityCommentUseCase,
} from './generate-activity-comment.use-case.js';

const ACTIVITY_ID = '6b1b3a7e-2f4d-4c8e-9a51-0d7c2e8f9a10';
const ACTIVITY: ActivityReference = {
  id: ACTIVITY_ID,
  type: 'running',
  startedAt: new Date('2026-11-12T08:00:00.000Z'),
  durationSeconds: 2700,
  distanceMeters: 8000,
};
const PLANNED: PlannedSessionReference = {
  date: '2026-11-12',
  disciplineTypeKey: 'running',
  durationMinutes: 45,
  status: 'realisee',
};

class FakeComments implements IActivityCommentRepository {
  stored: ActivityComment | null = null;
  findByActivityId = vi.fn(() => Promise.resolve(this.stored));
  save = vi.fn((comment: ActivityComment) => {
    this.stored = comment;
    return Promise.resolve();
  });
}

function build(options: {
  activity?: ActivityReference | null;
  planned?: PlannedSessionReference | null;
  now?: Date;
}) {
  const activities: IActivityReader = {
    findActivity: vi
      .fn()
      .mockResolvedValue(
        options.activity === undefined ? ACTIVITY : options.activity,
      ),
  };
  const planned: IPlannedSessionReader = {
    findForActivity: vi
      .fn()
      .mockResolvedValue(
        options.planned === undefined ? PLANNED : options.planned,
      ),
  };
  const generate = vi.fn((input: CommentGenerationInput) =>
    Promise.resolve({
      text: `Bonne sortie sur ${input.activity.type}.`,
      model: 'claude-sonnet-5-5',
    }),
  );
  const generator: IActivityCommentGenerator = { generate };
  const comments = new FakeComments();
  const useCase = new GenerateActivityCommentUseCase(
    activities,
    planned,
    generator,
    comments,
    () => options.now ?? new Date('2026-11-12T20:00:00.000Z'),
  );
  return { useCase, generate, comments };
}

describe('GenerateActivityCommentUseCase', () => {
  it('génère le commentaire d’une activité rapprochée, en un seul appel, et le stocke', async () => {
    const { useCase, generate, comments } = build({});

    const dto = await useCase.execute(ACTIVITY_ID);

    expect(generate).toHaveBeenCalledTimes(1);
    expect(dto).toMatchObject({
      source: 'ia',
      model: 'claude-sonnet-5-5',
      text: 'Bonne sortie sur running.',
    });
    expect(comments.stored?.source).toBe('ia');
  });

  it('stocke un commentaire générique sans appel au modèle quand aucune séance n’est rapprochée', async () => {
    const { useCase, generate, comments } = build({ planned: null });

    const dto = await useCase.execute(ACTIVITY_ID);

    expect(generate).not.toHaveBeenCalled();
    expect(dto).toMatchObject({
      source: 'generique',
      model: null,
      text: GENERIC_COMMENT_TEXT,
    });
    expect(comments.stored?.source).toBe('generique');
  });

  it('remplace le commentaire existant et enregistre la nouvelle date de génération', async () => {
    const comments = new FakeComments();
    const generate = vi.fn().mockResolvedValue({
      text: 'Première version.',
      model: 'claude-sonnet-5-5',
    });
    const first = new GenerateActivityCommentUseCase(
      { findActivity: vi.fn().mockResolvedValue(ACTIVITY) },
      { findForActivity: vi.fn().mockResolvedValue(PLANNED) },
      { generate },
      comments,
      () => new Date('2026-11-12T20:00:00.000Z'),
    );
    await first.execute(ACTIVITY_ID);
    generate.mockResolvedValue({
      text: 'Seconde version.',
      model: 'claude-sonnet-5-5',
    });
    const second = new GenerateActivityCommentUseCase(
      { findActivity: vi.fn().mockResolvedValue(ACTIVITY) },
      { findForActivity: vi.fn().mockResolvedValue(PLANNED) },
      { generate },
      comments,
      () => new Date('2026-11-13T09:00:00.000Z'),
    );

    const dto = await second.execute(ACTIVITY_ID);

    expect(generate).toHaveBeenCalledTimes(2);
    expect(dto.text).toBe('Seconde version.');
    expect(dto.generatedAt).toEqual(new Date('2026-11-13T09:00:00.000Z'));
  });

  it('refuse une activité inconnue sans appel au modèle', async () => {
    const { useCase, generate } = build({ activity: null });

    await expect(useCase.execute(ACTIVITY_ID)).rejects.toBeInstanceOf(
      ActivityNotFoundError,
    );
    expect(generate).not.toHaveBeenCalled();
  });
});
