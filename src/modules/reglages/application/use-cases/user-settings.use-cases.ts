import { Inject, Injectable } from '@nestjs/common';
import {
  type IUserSettingsRepository,
  USER_SETTINGS_REPOSITORY,
} from '../../domain/ports/outbound/user-settings.repository.port.js';
import { WeeklyTarget } from '../../domain/value-objects/weekly-target.vo.js';

export interface UserSettingsDto {
  /** Cible hebdomadaire en secondes, null si aucune n'est définie. */
  weeklyTargetSeconds: number | null;
}

/** Lit les réglages. Sans réglage enregistré, la cible est absente. */
@Injectable()
export class GetUserSettingsUseCase {
  constructor(
    @Inject(USER_SETTINGS_REPOSITORY)
    private readonly settings: IUserSettingsRepository,
  ) {}

  async execute(): Promise<UserSettingsDto> {
    const target = await this.settings.findWeeklyTarget();
    return { weeklyTargetSeconds: target.seconds() };
  }
}

/**
 * Enregistre la cible hebdomadaire. Elle reste la même tant qu'elle n'est pas modifiée.
 *
 * @throws InvalidWeeklyTargetError si la valeur n'est pas un entier strictement positif (ou null pour la retirer).
 */
@Injectable()
export class UpdateUserSettingsUseCase {
  constructor(
    @Inject(USER_SETTINGS_REPOSITORY)
    private readonly settings: IUserSettingsRepository,
  ) {}

  async execute(weeklyTargetSeconds: number | null): Promise<UserSettingsDto> {
    const target = WeeklyTarget.create(weeklyTargetSeconds);
    await this.settings.saveWeeklyTarget(target);
    return { weeklyTargetSeconds: target.seconds() };
  }
}
