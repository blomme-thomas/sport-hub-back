import { Injectable } from '@nestjs/common';
import { CreateSessionUseCase } from '../../../seances/application/use-cases/create-session.use-case.js';
import type {
  IPlanningScheduler,
  ScheduledSession,
} from '../../domain/ports/outbound/planning-scheduler.port.js';
import type { PlannedSession } from '../../domain/value-objects/planned-session.vo.js';

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
