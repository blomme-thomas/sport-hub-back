import { Inject, Injectable } from '@nestjs/common';
import { ActivityFitDataNotFoundError } from '../../domain/errors/activity-fit-data-not-found.error.js';
import { ActivityNotFoundError } from '../../domain/errors/activity-not-found.error.js';
import type { ActivityFitDocument } from '../../domain/ports/outbound/activity-heart-rate.extractor.port.js';
import {
  ACTIVITY_LIST_READ_MODEL,
  type IActivityListReadModel,
} from '../../domain/ports/outbound/activity-list.read-model.port.js';

@Injectable()
export class GetActivityFitDocumentUseCase {
  constructor(
    @Inject(ACTIVITY_LIST_READ_MODEL)
    private readonly readModel: IActivityListReadModel,
  ) {}

  /**
   * Renvoie le document FIT compact de l'activité, lu en base sans appel à Garmin.
   *
   * @throws ActivityNotFoundError si l'activité n'est pas enregistrée.
   * @throws ActivityFitDataNotFoundError si aucun document n'a été enregistré pour elle.
   */
  async execute(id: string): Promise<ActivityFitDocument> {
    const activity = await this.readModel.findById(id);
    if (activity === null) {
      throw new ActivityNotFoundError();
    }
    const document = await this.readModel.findFitDocument(id);
    if (document === null) {
      throw new ActivityFitDataNotFoundError();
    }
    return document;
  }
}
