import { Test } from '@nestjs/testing';
import { GarminAccessDeniedError } from '../../../domain/errors/garmin-access-denied.error.js';
import { SyncGarminActivitiesUseCase } from '../../../application/use-cases/sync-garmin-activities.use-case.js';
import { SyncGarminActivitiesResponseDto } from '../dtos/sync-garmin-activities.response.dto.js';
import { GarminSyncController } from './garmin-sync.controller.js';

describe('GarminSyncController', () => {
  let controller: GarminSyncController;
  const execute = vi.fn();

  beforeEach(async () => {
    execute.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [GarminSyncController],
      providers: [
        { provide: SyncGarminActivitiesUseCase, useValue: { execute } },
      ],
    }).compile();
    controller = moduleRef.get(GarminSyncController);
  });

  it('renvoie le résumé du use case', async () => {
    execute.mockResolvedValue({ created: 3, updated: 2, ignored: 5 });

    const response = await controller.run();

    expect(response).toBeInstanceOf(SyncGarminActivitiesResponseDto);
    expect({
      created: response.created,
      updated: response.updated,
      ignored: response.ignored,
    }).toEqual({ created: 3, updated: 2, ignored: 5 });
  });

  it('déclenche le use case une seule fois par appel', async () => {
    execute.mockResolvedValue({ created: 0, updated: 0, ignored: 0 });

    await controller.run();

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('laisse remonter les erreurs métier sans les capturer', async () => {
    execute.mockRejectedValue(new GarminAccessDeniedError());

    await expect(controller.run()).rejects.toBeInstanceOf(
      GarminAccessDeniedError,
    );
  });
});
