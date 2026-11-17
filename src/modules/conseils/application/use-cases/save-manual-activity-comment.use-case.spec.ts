import { describe, expect, it, vi } from 'vitest';
import { ActivityNotFoundError } from '../../domain/errors/activity-not-found.error.js';
import { ActivityCommentInvalidOutputError } from '../../domain/errors/activity-comment-invalid-output.error.js';
import { SaveManualActivityCommentUseCase } from './save-manual-activity-comment.use-case.js';

const ACTIVITY_ID = '6b1b3a7e-2f4d-4c8e-9a51-0d7c2e8f9a10';
const NOW = new Date('2026-11-17T09:00:00.000Z');

function build(activityFound: boolean) {
  const activities = {
    findActivity: vi.fn().mockResolvedValue(
      activityFound
        ? {
            id: ACTIVITY_ID,
            type: 'running',
            startedAt: NOW,
            durationSeconds: 1800,
            distanceMeters: 5000,
          }
        : null,
    ),
  };
  const comments = { findByActivityId: vi.fn(), save: vi.fn() };
  const useCase = new SaveManualActivityCommentUseCase(
    activities,
    comments,
    () => NOW,
  );
  return { useCase, comments };
}

describe('SaveManualActivityCommentUseCase', () => {
  it('remplace le commentaire par le texte saisi, source manuelle et modèle vide, sans appel au modèle', async () => {
    const { useCase, comments } = build(true);

    const dto = await useCase.execute(ACTIVITY_ID, 'Séance dure, bien tenue.');

    expect(dto).toMatchObject({
      activityId: ACTIVITY_ID,
      text: 'Séance dure, bien tenue.',
      source: 'saisie-manuelle',
      model: null,
      generatedAt: NOW,
    });
    expect(comments.save).toHaveBeenCalledTimes(1);
  });

  it('accepte un texte de plus de 1000 caractères', async () => {
    const { useCase, comments } = build(true);
    const text = 'a'.repeat(1200);

    const dto = await useCase.execute(ACTIVITY_ID, text);

    expect(dto.text).toHaveLength(1200);
    expect(comments.save).toHaveBeenCalledTimes(1);
  });

  it('refuse une activité inconnue sans rien enregistrer', async () => {
    const { useCase, comments } = build(false);

    await expect(useCase.execute(ACTIVITY_ID, 'Texte')).rejects.toBeInstanceOf(
      ActivityNotFoundError,
    );
    expect(comments.save).not.toHaveBeenCalled();
  });

  it('refuse un texte vide sans rien enregistrer', async () => {
    const { useCase, comments } = build(true);

    await expect(useCase.execute(ACTIVITY_ID, '   ')).rejects.toBeInstanceOf(
      ActivityCommentInvalidOutputError,
    );
    expect(comments.save).not.toHaveBeenCalled();
  });
});
