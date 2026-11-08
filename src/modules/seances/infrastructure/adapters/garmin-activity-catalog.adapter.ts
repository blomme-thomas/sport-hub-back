import { Injectable } from '@nestjs/common';
import { ListActivitiesUseCase } from '../../../garmin-sync/application/use-cases/list-activities.use-case.js';
import type {
  ActivityReference,
  IActivityCatalog,
} from '../../domain/ports/outbound/activity-catalog.port.js';
import { parisDay } from '../time/paris-day.js';

const PAGE_SIZE = 100;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

@Injectable()
export class GarminActivityCatalogAdapter implements IActivityCatalog {
  constructor(private readonly activities: ListActivitiesUseCase) {}

  /**
   * Lit les activités de la fenêtre élargie d'un jour avant et d'un jour après, puis ne garde que celles dont le jour de Paris est dans la période.
   */
  async activitiesOnDays(
    from: string,
    to: string,
  ): Promise<ActivityReference[]> {
    const windowFrom = new Date(
      new Date(`${from}T00:00:00.000Z`).getTime() - DAY_IN_MILLISECONDS,
    );
    const windowTo = new Date(
      new Date(`${to}T00:00:00.000Z`).getTime() + 2 * DAY_IN_MILLISECONDS,
    );
    const references: ActivityReference[] = [];
    let page = 1;
    let fetched = 0;
    let total = Number.POSITIVE_INFINITY;
    while (fetched < total) {
      const result = await this.activities.execute({
        page,
        pageSize: PAGE_SIZE,
        from: windowFrom,
        to: windowTo,
      });
      total = result.total;
      if (result.items.length === 0) {
        break;
      }
      fetched += result.items.length;
      for (const item of result.items) {
        const localDate = parisDay(item.startedAt);
        if (localDate >= from && localDate <= to) {
          references.push({ id: item.id, type: item.type, localDate });
        }
      }
      page += 1;
    }
    return references;
  }
}
