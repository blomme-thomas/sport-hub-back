import { Inject, Injectable } from '@nestjs/common';
import {
  ACTIVITY_LIST_READ_MODEL,
  type IActivityListReadModel,
} from '../../domain/ports/outbound/activity-list.read-model.port.js';
import type { ActivitySummaryDto } from '../dtos/activity-list.dto.js';

@Injectable()
export class GetActivityUseCase {
  constructor(
    @Inject(ACTIVITY_LIST_READ_MODEL)
    private readonly readModel: IActivityListReadModel,
  ) {}

  /**
   * Renvoie le résumé de l'activité synchronisée portant cet identifiant, ou null si elle n'est pas enregistrée.
   */
  execute(id: string): Promise<ActivitySummaryDto | null> {
    return this.readModel.findById(id);
  }
}
