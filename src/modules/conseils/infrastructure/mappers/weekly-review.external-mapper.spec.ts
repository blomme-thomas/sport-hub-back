import { WeeklyReviewInvalidOutputError } from '../../domain/errors/weekly-review-invalid-output.error.js';
import { WeeklyReviewExternalMapper } from './weekly-review.external-mapper.js';

const VALID = JSON.stringify({
  suivi: 'Deux séances sur deux.',
  pointAttention: 'Allure rapide.',
  conseil: 'Séance facile mercredi.',
});

describe('WeeklyReviewExternalMapper', () => {
  it('traduit un objet JSON complet en bilan généré', () => {
    expect(
      WeeklyReviewExternalMapper.toGenerated(VALID, 'claude-sonnet-5-5'),
    ).toEqual({
      suivi: 'Deux séances sur deux.',
      pointAttention: 'Allure rapide.',
      conseil: 'Séance facile mercredi.',
      model: 'claude-sonnet-5-5',
    });
  });

  it.each([
    ['texte libre', 'Bonne semaine !'],
    ['tableau JSON', '[]'],
    ['valeur nulle', 'null'],
    ['clé manquante', JSON.stringify({ suivi: 'a', conseil: 'c' })],
    [
      'clé non textuelle',
      JSON.stringify({ suivi: 'a', pointAttention: 1, conseil: 'c' }),
    ],
  ])('rejette une sortie inexploitable : %s', (_label, text) => {
    expect(() =>
      WeeklyReviewExternalMapper.toGenerated(text, 'claude-sonnet-5-5'),
    ).toThrow(WeeklyReviewInvalidOutputError);
  });
});
