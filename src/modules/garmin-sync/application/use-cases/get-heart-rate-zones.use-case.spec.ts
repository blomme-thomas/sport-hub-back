import type { IGarminConnectClient } from '../../domain/ports/outbound/garmin-connect-client.port.js';
import { GetHeartRateZonesUseCase } from './get-heart-rate-zones.use-case.js';

function clientReturning(
  config: Awaited<ReturnType<IGarminConnectClient['fetchHeartRateZones']>>,
): IGarminConnectClient {
  return {
    fetchActivitiesSince: vi.fn(),
    fetchDisplayName: vi.fn(),
    fetchHeartRateZones: vi.fn().mockResolvedValue(config),
    fetchRecoveryDays: vi.fn(),
  };
}

describe('GetHeartRateZonesUseCase', () => {
  it('renvoie les seuils configurés avec available à true', async () => {
    const useCase = new GetHeartRateZonesUseCase(
      clientReturning({
        trainingMethod: 'LACTATE_THRESHOLD',
        maxHeartRateUsed: 190,
        restingHeartRateUsed: 50,
        zoneFloors: [100, 120, 140, 160, 175],
      }),
    );

    await expect(useCase.execute()).resolves.toEqual({
      available: true,
      trainingMethod: 'LACTATE_THRESHOLD',
      maxHeartRateUsed: 190,
      restingHeartRateUsed: 50,
      zone1Floor: 100,
      zone2Floor: 120,
      zone3Floor: 140,
      zone4Floor: 160,
      zone5Floor: 175,
    });
  });

  it("renvoie available à false et des null quand aucune zone n'est configurée", async () => {
    const useCase = new GetHeartRateZonesUseCase(clientReturning(null));

    await expect(useCase.execute()).resolves.toEqual({
      available: false,
      trainingMethod: null,
      maxHeartRateUsed: null,
      restingHeartRateUsed: null,
      zone1Floor: null,
      zone2Floor: null,
      zone3Floor: null,
      zone4Floor: null,
      zone5Floor: null,
    });
  });

  it('conserve null pour une borne absente côté Garmin', async () => {
    const useCase = new GetHeartRateZonesUseCase(
      clientReturning({
        trainingMethod: 'HR_MAX',
        maxHeartRateUsed: 185,
        restingHeartRateUsed: null,
        zoneFloors: [90, 110, 130, 150, null],
      }),
    );

    const result = await useCase.execute();

    expect(result.restingHeartRateUsed).toBeNull();
    expect(result.zone5Floor).toBeNull();
    expect(result.available).toBe(true);
  });
});
