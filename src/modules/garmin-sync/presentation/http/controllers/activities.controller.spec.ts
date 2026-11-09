import { plainToInstance } from 'class-transformer';
import { Test } from '@nestjs/testing';
import { GetActivityDetailUseCase } from '../../../application/use-cases/get-activity-detail.use-case.js';
import { ListActivitiesUseCase } from '../../../application/use-cases/list-activities.use-case.js';
import { ListActivitiesRequestDto } from '../dtos/list-activities.request.dto.js';
import { ActivityListResponseDto } from '../dtos/activity-list.response.dto.js';
import { ActivitiesController } from './activities.controller.js';

const summary = {
  id: 'a',
  garminActivityId: 'garmin-a',
  type: 'running',
  startedAt: new Date('2026-05-10T06:30:00.000Z'),
  durationSeconds: 3600,
  distanceMeters: 10000,
};

function request(plain: Record<string, unknown>): ListActivitiesRequestDto {
  return plainToInstance(ListActivitiesRequestDto, plain);
}

describe('ActivitiesController', () => {
  let controller: ActivitiesController;
  const execute = vi.fn();

  beforeEach(async () => {
    execute.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [ActivitiesController],
      providers: [
        { provide: ListActivitiesUseCase, useValue: { execute } },
        { provide: GetActivityDetailUseCase, useValue: { execute: vi.fn() } },
      ],
    }).compile();
    controller = moduleRef.get(ActivitiesController);
  });

  describe('transmission de la requête', () => {
    it('transmet la pagination et le type convertis en nombres et en texte', async () => {
      execute.mockResolvedValue({ items: [], page: 2, pageSize: 10, total: 0 });

      await controller.list(
        request({ page: '2', pageSize: '10', type: 'running' }),
      );

      expect(execute).toHaveBeenCalledWith({
        page: 2,
        pageSize: 10,
        type: 'running',
      });
    });

    it('convertit from et to ISO 8601 en dates', async () => {
      execute.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 });

      await controller.list(
        request({
          page: 1,
          pageSize: 20,
          from: '2026-05-01T00:00:00.000Z',
          to: '2026-05-31T23:59:59.999Z',
        }),
      );

      expect(execute).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        from: new Date('2026-05-01T00:00:00.000Z'),
        to: new Date('2026-05-31T23:59:59.999Z'),
      });
    });

    it("applique la pagination par défaut quand la requête n'en précise pas", async () => {
      execute.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 });

      await controller.list(request({}));

      expect(execute).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
    });

    it('déclenche le use case une seule fois par requête', async () => {
      execute.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 });

      await controller.list(request({}));

      expect(execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('réponse', () => {
    it('renvoie la page du use case au format de réponse', async () => {
      execute.mockResolvedValue({
        items: [summary],
        page: 1,
        pageSize: 20,
        total: 1,
      });

      const response = await controller.list(request({}));

      expect(response).toBeInstanceOf(ActivityListResponseDto);
      expect({
        items: response.items,
        page: response.page,
        pageSize: response.pageSize,
        total: response.total,
      }).toEqual({
        items: [summary],
        page: 1,
        pageSize: 20,
        total: 1,
      });
    });

    it('renvoie une liste vide avec un total à zéro', async () => {
      execute.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 });

      const response = await controller.list(request({}));

      expect(response.items).toEqual([]);
      expect(response.total).toBe(0);
    });
  });
});
