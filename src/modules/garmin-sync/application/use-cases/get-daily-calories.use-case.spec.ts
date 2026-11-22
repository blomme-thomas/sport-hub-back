import { Test } from '@nestjs/testing';
import { GarminAccessDeniedError } from '../../domain/errors/garmin-access-denied.error.js';
import { GarminUnavailableError } from '../../domain/errors/garmin-unavailable.error.js';
import {
  GARMIN_CONNECT_CLIENT,
  type DailyCaloriesDay,
  type IGarminConnectClient,
  type RecoveryRange,
} from '../../domain/ports/outbound/garmin-connect-client.port.js';
import { GetDailyCaloriesUseCase } from './get-daily-calories.use-case.js';

const RANGE: RecoveryRange = { from: '2026-11-01', to: '2026-11-03' };

class FakeGarminClient implements Pick<
  IGarminConnectClient,
  'fetchDailyCalories'
> {
  days: DailyCaloriesDay[] = [];
  calls: RecoveryRange[] = [];
  failure?: Error;

  fetchDailyCalories(range: RecoveryRange): Promise<DailyCaloriesDay[]> {
    this.calls.push(range);
    if (this.failure) {
      return Promise.reject(this.failure);
    }
    return Promise.resolve(this.days);
  }
}

describe('GetDailyCaloriesUseCase', () => {
  let useCase: GetDailyCaloriesUseCase;
  let garmin: FakeGarminClient;

  beforeEach(async () => {
    garmin = new FakeGarminClient();
    const moduleRef = await Test.createTestingModule({
      providers: [
        GetDailyCaloriesUseCase,
        { provide: GARMIN_CONNECT_CLIENT, useValue: garmin },
      ],
    }).compile();
    useCase = moduleRef.get(GetDailyCaloriesUseCase);
  });

  it('interroge le port une seule fois avec la plage demandée, telle quelle', async () => {
    await useCase.execute(RANGE);

    expect(garmin.calls).toEqual([RANGE]);
  });

  it('renvoie les calories journalières du port, jours sans valeur compris', async () => {
    garmin.days = [
      { date: '2026-11-01', calories: null },
      { date: '2026-11-02', calories: 2350 },
      { date: '2026-11-03', calories: null },
    ];

    await expect(useCase.execute(RANGE)).resolves.toEqual(garmin.days);
  });

  it('propage GarminAccessDeniedError sans la transformer', async () => {
    const failure = new GarminAccessDeniedError();
    garmin.failure = failure;

    await expect(useCase.execute(RANGE)).rejects.toBe(failure);
  });

  it('propage GarminUnavailableError sans repli sur une autre source', async () => {
    const failure = new GarminUnavailableError();
    garmin.failure = failure;

    await expect(useCase.execute(RANGE)).rejects.toBe(failure);
  });
});
