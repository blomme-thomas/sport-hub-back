import type { IGarminConnectClient } from '../../domain/ports/outbound/garmin-connect-client.port.js';
import { GetGarminProfileUseCase } from './get-garmin-profile.use-case.js';

function clientReturning(displayName: string | null): IGarminConnectClient {
  return {
    fetchActivitiesSince: vi.fn(),
    fetchDisplayName: vi.fn().mockResolvedValue(displayName),
    fetchHeartRateZones: vi.fn(),
    fetchRecoveryDays: vi.fn(),
  };
}

describe('GetGarminProfileUseCase', () => {
  it('renvoie le nom affiché fourni par Garmin', async () => {
    const useCase = new GetGarminProfileUseCase(clientReturning('Thomas'));

    await expect(useCase.execute()).resolves.toEqual({ displayName: 'Thomas' });
  });

  it('renvoie null sans inventer de valeur quand Garmin ne fournit pas de nom', async () => {
    const useCase = new GetGarminProfileUseCase(clientReturning(null));

    await expect(useCase.execute()).resolves.toEqual({ displayName: null });
  });
});
