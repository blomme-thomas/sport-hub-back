import { describe, expect, it, vi } from 'vitest';
import { ActivityCommentNotFoundError } from '../../domain/errors/activity-comment-not-found.error.js';
import { ActivityComment } from '../../domain/value-objects/activity-comment.vo.js';
import { GetActivityCommentUseCase } from './get-activity-comment.use-case.js';

const ACTIVITY_ID = '6b1b3a7e-2f4d-4c8e-9a51-0d7c2e8f9a10';

describe('GetActivityCommentUseCase', () => {
  it('renvoie le commentaire stocké sans rien recalculer', async () => {
    const stored = ActivityComment.create({
      activityId: ACTIVITY_ID,
      text: 'Bonne sortie.',
      source: 'ia',
      model: 'claude-sonnet-5-5',
      generatedAt: new Date('2026-11-12T20:00:00.000Z'),
    });
    const save = vi.fn();
    const findByActivityId = vi.fn().mockResolvedValue(stored);

    const dto = await new GetActivityCommentUseCase({
      findByActivityId,
      save,
    }).execute(ACTIVITY_ID);

    expect(dto).toMatchObject({
      activityId: ACTIVITY_ID,
      text: 'Bonne sortie.',
      source: 'ia',
    });
    expect(save).not.toHaveBeenCalled();
  });

  it('refuse une activité sans commentaire généré', async () => {
    const findByActivityId = vi.fn().mockResolvedValue(null);

    await expect(
      new GetActivityCommentUseCase({
        findByActivityId,
        save: vi.fn(),
      }).execute(ACTIVITY_ID),
    ).rejects.toBeInstanceOf(ActivityCommentNotFoundError);
  });
});
