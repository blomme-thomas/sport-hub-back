import { Test } from '@nestjs/testing';
import { InvalidWeeklyTargetError } from '../../domain/errors/invalid-weekly-target.error.js';
import {
  type IUserSettingsRepository,
  USER_SETTINGS_REPOSITORY,
} from '../../domain/ports/outbound/user-settings.repository.port.js';
import { WeeklyTarget } from '../../domain/value-objects/weekly-target.vo.js';
import {
  GetUserSettingsUseCase,
  UpdateUserSettingsUseCase,
} from './user-settings.use-cases.js';

class FakeUserSettingsRepository implements IUserSettingsRepository {
  target: WeeklyTarget = WeeklyTarget.create(null);
  saves = 0;

  findWeeklyTarget(): Promise<WeeklyTarget> {
    return Promise.resolve(this.target);
  }

  saveWeeklyTarget(target: WeeklyTarget): Promise<void> {
    this.target = target;
    this.saves += 1;
    return Promise.resolve();
  }
}

describe('Réglages : cible hebdomadaire', () => {
  let repository: FakeUserSettingsRepository;
  let getSettings: GetUserSettingsUseCase;
  let updateSettings: UpdateUserSettingsUseCase;

  beforeEach(async () => {
    repository = new FakeUserSettingsRepository();
    const moduleRef = await Test.createTestingModule({
      providers: [
        GetUserSettingsUseCase,
        UpdateUserSettingsUseCase,
        { provide: USER_SETTINGS_REPOSITORY, useValue: repository },
      ],
    }).compile();
    getSettings = moduleRef.get(GetUserSettingsUseCase);
    updateSettings = moduleRef.get(UpdateUserSettingsUseCase);
  });

  it('est absente tant qu’aucune cible n’a été enregistrée', async () => {
    await expect(getSettings.execute()).resolves.toEqual({
      weeklyTargetSeconds: null,
    });
  });

  it('garde la cible enregistrée jusqu’à ce qu’elle soit modifiée', async () => {
    await updateSettings.execute(28800);

    await expect(getSettings.execute()).resolves.toEqual({
      weeklyTargetSeconds: 28800,
    });
    await expect(getSettings.execute()).resolves.toEqual({
      weeklyTargetSeconds: 28800,
    });

    await updateSettings.execute(36000);
    await expect(getSettings.execute()).resolves.toEqual({
      weeklyTargetSeconds: 36000,
    });
  });

  it('retire la cible quand on envoie null', async () => {
    await updateSettings.execute(28800);
    await updateSettings.execute(null);

    await expect(getSettings.execute()).resolves.toEqual({
      weeklyTargetSeconds: null,
    });
  });

  it('refuse une valeur invalide sans rien enregistrer', async () => {
    await expect(updateSettings.execute(0)).rejects.toBeInstanceOf(
      InvalidWeeklyTargetError,
    );
    expect(repository.saves).toBe(0);
  });
});
