import { Injectable } from '@nestjs/common';
import { CreateSessionUseCase } from '../../../seances/index.js';
import type {
  IPlanningScheduler,
  ScheduledSession,
} from '../../domain/ports/outbound/planning-scheduler.port.js';
import type { PlannedSession } from '../../domain/value-objects/planned-session.vo.js';

/**
 * Heure des séances générées : la génération ne propose pas d'heure, or une séance en a toujours une.
 * À remplacer par une heure issue des créneaux libres si la génération la fournit un jour.
 */
const GENERATED_SESSION_START_TIME = '08:00';

@Injectable()
export class SeancesPlanningScheduler implements IPlanningScheduler {
  constructor(private readonly createSession: CreateSessionUseCase) {}

  async schedule(
    sessions: readonly PlannedSession[],
  ): Promise<ScheduledSession[]> {
    const created: ScheduledSession[] = [];
    for (const session of sessions) {
      const dto = await this.createSession.execute({
        date: session.date,
        disciplineTypeKey: session.disciplineTypeKey,
        durationMinutes: session.durationMinutes,
        startTime: GENERATED_SESSION_START_TIME,
        modules: session.modules.map((module) => ({
          type: module.type,
          durationMinutes: module.durationMinutes,
          instruction: module.instruction,
          targetZones: module.targetZones,
          perceivedEffort: module.perceivedEffort,
        })),
      });
      created.push({
        id: dto.id,
        date: dto.date,
        disciplineTypeKey: dto.disciplineTypeKey,
        durationMinutes: dto.durationMinutes,
      });
    }
    return created;
  }
}
