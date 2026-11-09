import { z } from 'zod';
import { GarminUnavailableError } from '../../domain/errors/garmin-unavailable.error.js';
import type { DailyCaloriesDay } from '../../domain/ports/outbound/garmin-connect-client.port.js';
import { enumerateDays } from './garmin-recovery.external-mapper.js';

const dailySummarySchema = z.object({
  calendarDate: z.string(),
  calories: z.object({ burnedTotal: z.number().nullish() }).nullish(),
});

const dailySummariesEnvelopeSchema = z.object({
  data: z.array(z.unknown()),
});

/** Un corps vide (204 Garmin) signifie qu'il n'y a aucune donnée, pas une erreur. */
function isEmptyBody(payload: unknown): boolean {
  return payload === undefined || payload === null || payload === '';
}

export class GarminDailyCaloriesExternalMapper {
  /**
   * Renvoie une entrée par jour de la plage (dates incluses), dans l'ordre chronologique.
   * Un corps vide (204) ou un jour sans `burnedTotal` donne null. Une enveloppe `{ data }` ou un élément mal formé
   * lève une erreur : un changement de format de Garmin n'est pas masqué en absence de donnée.
   *
   * @throws GarminUnavailableError si la réponse n'a pas la forme attendue.
   */
  static combine(
    range: { from: string; to: string },
    payload: unknown,
  ): DailyCaloriesDay[] {
    const totals = GarminDailyCaloriesExternalMapper.burnedTotalByDate(payload);
    return enumerateDays(range.from, range.to).map((date) => ({
      date,
      calories: totals.get(date) ?? null,
    }));
  }

  private static burnedTotalByDate(
    payload: unknown,
  ): Map<string, number | null> {
    const byDate = new Map<string, number | null>();
    if (isEmptyBody(payload)) {
      return byDate;
    }
    const envelope = dailySummariesEnvelopeSchema.safeParse(payload);
    if (!envelope.success) {
      throw new GarminUnavailableError();
    }
    for (const item of envelope.data.data) {
      const parsed = dailySummarySchema.safeParse(item);
      if (!parsed.success) {
        throw new GarminUnavailableError();
      }
      byDate.set(
        parsed.data.calendarDate,
        parsed.data.calories?.burnedTotal ?? null,
      );
    }
    return byDate;
  }
}
