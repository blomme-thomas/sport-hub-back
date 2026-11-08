import { WeeklyReviewInvalidOutputError } from '../../domain/errors/weekly-review-invalid-output.error.js';
import type { GeneratedWeeklyReview } from '../../domain/ports/outbound/weekly-review.ports.js';

export class WeeklyReviewExternalMapper {
  /**
   * @throws WeeklyReviewInvalidOutputError si le texte n'est pas un objet JSON avec les trois chaînes attendues.
   */
  static toGenerated(text: string, model: string): GeneratedWeeklyReview {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new WeeklyReviewInvalidOutputError('réponse non JSON');
    }
    if (typeof parsed !== 'object' || parsed === null) {
      throw new WeeklyReviewInvalidOutputError('objet JSON attendu');
    }
    const { suivi, pointAttention, conseil } = parsed as Record<
      string,
      unknown
    >;
    if (
      typeof suivi !== 'string' ||
      typeof pointAttention !== 'string' ||
      typeof conseil !== 'string'
    ) {
      throw new WeeklyReviewInvalidOutputError(
        'clés suivi, pointAttention, conseil manquantes',
      );
    }
    return { suivi, pointAttention, conseil, model };
  }
}
