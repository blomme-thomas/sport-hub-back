import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../core/prisma/prisma.service.js';
import type { IUserSettingsRepository } from '../../../domain/ports/outbound/user-settings.repository.port.js';
import { WeeklyTarget } from '../../../domain/value-objects/weekly-target.vo.js';

/** Identifiant unique de la ligne réglages (application mono-utilisateur). */
const SETTINGS_ID = 1;

@Injectable()
export class PrismaUserSettingsRepositoryAdapter implements IUserSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findWeeklyTarget(): Promise<WeeklyTarget> {
    const record = await this.prisma.userSettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    return WeeklyTarget.create(record?.weeklyTargetSeconds ?? null);
  }

  async saveWeeklyTarget(target: WeeklyTarget): Promise<void> {
    await this.prisma.userSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, weeklyTargetSeconds: target.seconds() },
      update: { weeklyTargetSeconds: target.seconds() },
    });
  }
}
