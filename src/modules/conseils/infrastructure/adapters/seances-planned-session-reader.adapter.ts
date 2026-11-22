import { Injectable } from '@nestjs/common';
import { GetSessionForActivityUseCase } from '../../../seances/index.js';
import type {
  IPlannedSessionReader,
  PlannedSessionReference,
} from '../../domain/ports/outbound/conseils.ports.js';

@Injectable()
export class SeancesPlannedSessionReaderAdapter implements IPlannedSessionReader {
  constructor(private readonly sessions: GetSessionForActivityUseCase) {}

  findForActivity(activityId: string): Promise<PlannedSessionReference | null> {
    return this.sessions.execute(activityId);
  }
}
