import { z } from 'zod';
import { PlanningInvalidOutputError } from '../../domain/errors/planning-invalid-output.error.js';
import { MODULE_TYPES } from '../../../seances/index.js';
import type { PlannedSession } from '../../domain/value-objects/planned-session.vo.js';

const ZONE_RANGE_SCHEMA = z.object({
  min: z.number().int().min(1),
  max: z.number().int().min(1),
});

export const PLANNING_OUTPUT_SCHEMA = z.object({
  sessions: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      disciplineTypeKey: z.string().min(1).max(100),
      durationMinutes: z.number().int().min(1).max(1440),
      modules: z.array(
        z.object({
          type: z.enum(MODULE_TYPES),
          durationMinutes: z.number().int().min(1).max(1440),
          instruction: z.string().min(1).max(2000),
          targetZones: z
            .object({
              heartRate: ZONE_RANGE_SCHEMA.optional(),
              pace: ZONE_RANGE_SCHEMA.optional(),
              power: ZONE_RANGE_SCHEMA.optional(),
            })
            .nullable()
            .optional(),
          perceivedEffort: z
            .number()
            .int()
            .min(1)
            .max(10)
            .nullable()
            .optional(),
        }),
      ),
    }),
  ),
});

export interface ClaudePlanningReplyBlock {
  type: string;
  text?: string;
}

export interface ClaudePlanningReply {
  stop_reason: string | null;
  content: readonly ClaudePlanningReplyBlock[];
}

export class ClaudePlanningExternalMapper {
  /**
   * Traduit la réponse du modèle en séances proposées. Toute anomalie lève `PlanningInvalidOutputError` ; aucune séance partielle n'est renvoyée.
   *
   * @throws PlanningInvalidOutputError si la réponse est tronquée, sans bloc texte unique, ou hors schéma.
   */
  static toPlanned(reply: ClaudePlanningReply): PlannedSession[] {
    if (reply.stop_reason !== 'end_turn') {
      throw new PlanningInvalidOutputError('réponse tronquée');
    }
    const [block, ...rest] = reply.content;
    if (
      rest.length > 0 ||
      block?.type !== 'text' ||
      typeof block.text !== 'string'
    ) {
      throw new PlanningInvalidOutputError('bloc de réponse inattendu');
    }
    let json: unknown;
    try {
      json = JSON.parse(block.text);
    } catch {
      throw new PlanningInvalidOutputError('JSON invalide');
    }
    const parsed = PLANNING_OUTPUT_SCHEMA.safeParse(json);
    if (!parsed.success) {
      throw new PlanningInvalidOutputError('schéma non respecté');
    }
    return parsed.data.sessions.map((session) => ({
      date: session.date,
      disciplineTypeKey: session.disciplineTypeKey,
      durationMinutes: session.durationMinutes,
      modules: session.modules.map((module) => ({
        type: module.type,
        durationMinutes: module.durationMinutes,
        instruction: module.instruction,
        targetZones: module.targetZones ?? null,
        perceivedEffort: module.perceivedEffort ?? null,
      })),
    }));
  }
}
