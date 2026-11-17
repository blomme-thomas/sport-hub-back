import { describe, expect, it } from 'vitest';
import { ActivityCommentInvalidOutputError } from '../errors/activity-comment-invalid-output.error.js';
import { ActivityComment } from './activity-comment.vo.js';

function props(text: string) {
  return {
    activityId: 'a1',
    text,
    source: 'ia' as const,
    model: 'claude-sonnet-5-5',
    generatedAt: new Date('2026-11-12T20:00:00.000Z'),
  };
}

describe('ActivityComment', () => {
  it('retire les espaces autour du texte', () => {
    expect(ActivityComment.create(props('  Bien joué.  ')).text).toBe(
      'Bien joué.',
    );
  });

  it('refuse un texte vide', () => {
    expect(() => ActivityComment.create(props('   '))).toThrow(
      ActivityCommentInvalidOutputError,
    );
  });

  it('refuse un texte généré de plus de 1000 caractères', () => {
    expect(() => ActivityComment.create(props('a'.repeat(1001)))).toThrow(
      'plus de 1000',
    );
  });

  it('accepte un texte saisi à la main de plus de 1000 caractères', () => {
    const comment = ActivityComment.create({
      ...props('a'.repeat(1500)),
      source: 'saisie-manuelle',
      model: null,
    });

    expect(comment.text).toHaveLength(1500);
    expect(comment.source).toBe('saisie-manuelle');
  });

  it('refuse un texte saisi à la main vide', () => {
    expect(() =>
      ActivityComment.create({
        ...props('   '),
        source: 'saisie-manuelle',
        model: null,
      }),
    ).toThrow(ActivityCommentInvalidOutputError);
  });
});
