import { Test } from '@nestjs/testing';
import {
  ACTIVITY_LIST_READ_MODEL,
  type ActivityListCriteria,
  type ActivityListItem,
  type ActivityListPage,
  type IActivityListReadModel,
} from '../../domain/ports/outbound/activity-list.read-model.port.js';
import type { ActivityListQuery } from '../dtos/activity-list.dto.js';
import { ListActivitiesUseCase } from './list-activities.use-case.js';

const FROM = new Date('2026-05-01T00:00:00.000Z');
const TO = new Date('2026-05-31T23:59:59.999Z');

function item(
  id: string,
  overrides: Partial<ActivityListItem> = {},
): ActivityListItem {
  return {
    id,
    garminActivityId: `garmin-${id}`,
    type: 'running',
    startedAt: new Date('2026-05-10T06:30:00.000Z'),
    durationSeconds: 3600,
    distanceMeters: 10000,
    ...overrides,
  };
}

class FakeActivityListReadModel implements IActivityListReadModel {
  page: ActivityListPage = { items: [], total: 0 };
  criteria: ActivityListCriteria[] = [];

  list(criteria: ActivityListCriteria): Promise<ActivityListPage> {
    this.criteria.push(criteria);
    return Promise.resolve(this.page);
  }
}

describe('ListActivitiesUseCase', () => {
  let useCase: ListActivitiesUseCase;
  let readModel: FakeActivityListReadModel;

  beforeEach(async () => {
    readModel = new FakeActivityListReadModel();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ListActivitiesUseCase,
        { provide: ACTIVITY_LIST_READ_MODEL, useValue: readModel },
      ],
    }).compile();
    useCase = moduleRef.get(ListActivitiesUseCase);
  });

  describe('critères transmis au port', () => {
    it('transmet la pagination et tous les filtres tels quels', async () => {
      const query: ActivityListQuery = {
        page: 2,
        pageSize: 10,
        from: FROM,
        to: TO,
        type: 'running',
      };

      await useCase.execute(query);

      expect(readModel.criteria).toEqual([
        { page: 2, pageSize: 10, from: FROM, to: TO, type: 'running' },
      ]);
    });

    it('interroge le port une seule fois par appel', async () => {
      await useCase.execute({ page: 1, pageSize: 20 });

      expect(readModel.criteria).toHaveLength(1);
    });
  });

  describe('valeurs par défaut des filtres', () => {
    it('remplace les filtres absents par null', async () => {
      await useCase.execute({ page: 1, pageSize: 20 });

      expect(readModel.criteria).toEqual([
        { page: 1, pageSize: 20, from: null, to: null, type: null },
      ]);
    });

    it('transmet un filtre de date seul sans inventer les autres', async () => {
      await useCase.execute({ page: 1, pageSize: 20, from: FROM });

      expect(readModel.criteria).toEqual([
        { page: 1, pageSize: 20, from: FROM, to: null, type: null },
      ]);
    });
  });

  describe('mapping en DTO', () => {
    it('renvoie les activités en résumé avec la pagination et le total du port', async () => {
      readModel.page = {
        items: [item('a'), item('b')],
        total: 45,
      };

      const result = await useCase.execute({ page: 2, pageSize: 2 });

      expect(result).toEqual({
        items: [
          {
            id: 'a',
            garminActivityId: 'garmin-a',
            type: 'running',
            startedAt: new Date('2026-05-10T06:30:00.000Z'),
            durationSeconds: 3600,
            distanceMeters: 10000,
          },
          {
            id: 'b',
            garminActivityId: 'garmin-b',
            type: 'running',
            startedAt: new Date('2026-05-10T06:30:00.000Z'),
            durationSeconds: 3600,
            distanceMeters: 10000,
          },
        ],
        page: 2,
        pageSize: 2,
        total: 45,
      });
    });

    it('conserve une distance absente à null', async () => {
      readModel.page = {
        items: [item('a', { type: 'strength', distanceMeters: null })],
        total: 1,
      };

      const result = await useCase.execute({ page: 1, pageSize: 20 });

      expect(result.items[0]?.distanceMeters).toBeNull();
    });

    it('ne renvoie que les champs du résumé, jamais la charge brute', async () => {
      readModel.page = {
        items: [
          { ...item('a'), rawPayload: { secret: true } } as ActivityListItem,
        ],
        total: 1,
      };

      const result = await useCase.execute({ page: 1, pageSize: 20 });

      expect(result.items[0]).not.toHaveProperty('rawPayload');
    });
  });

  describe('liste vide', () => {
    it('renvoie une liste vide et un total à zéro quand aucune activité ne correspond', async () => {
      const result = await useCase.execute({ page: 1, pageSize: 20 });

      expect(result).toEqual({ items: [], page: 1, pageSize: 20, total: 0 });
    });

    it('renvoie le total du port quand la page demandée dépasse la fin', async () => {
      readModel.page = { items: [], total: 5 };

      const result = await useCase.execute({ page: 9, pageSize: 20 });

      expect(result).toEqual({ items: [], page: 9, pageSize: 20, total: 5 });
    });
  });
});
