import type { ScheduledSession } from '../../domain/ports/outbound/planning-scheduler.port.js';

export interface GeneratePlanningQuery {
  from: string;
  to?: string;
  goalId?: string;
}

export interface GeneratedPlanningDto {
  from: string;
  to: string;
  items: ScheduledSession[];
}
