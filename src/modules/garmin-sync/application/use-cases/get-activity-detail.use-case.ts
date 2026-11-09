import { Inject, Injectable } from '@nestjs/common';
import { ActivityNotFoundError } from '../../domain/errors/activity-not-found.error.js';
import {
  ACTIVITY_LIST_READ_MODEL,
  type ActivityDetailItem,
  type IActivityListReadModel,
} from '../../domain/ports/outbound/activity-list.read-model.port.js';

@Injectable()
export class GetActivityDetailUseCase {
  constructor(
    @Inject(ACTIVITY_LIST_READ_MODEL)
    private readonly readModel: IActivityListReadModel,
  ) {}

  /**
   * Renvoie le détail d'une activité synchronisée, lu en base sans appel à Garmin.
   * Les métriques absentes valent null ; la série de fréquence cardiaque n'est pas enregistrée.
   *
   * @throws ActivityNotFoundError si l'activité n'est pas enregistrée.
   */
  async execute(id: string): Promise<ActivityDetailItem> {
    const detail = await this.readModel.findDetailById(id);
    if (detail === null) {
      throw new ActivityNotFoundError();
    }
    return detail;
  }
}
