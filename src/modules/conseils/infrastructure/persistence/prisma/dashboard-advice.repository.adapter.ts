import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../core/prisma/prisma.service.js';
import type { Prisma } from '../../../../../core/prisma/generated/client.js';
import type { IDashboardAdviceRepository } from '../../../domain/ports/outbound/dashboard-advice.ports.js';
import {
  DashboardAdvice,
  type DashboardAdviceSource,
} from '../../../domain/value-objects/dashboard-advice.vo.js';

@Injectable()
export class PrismaDashboardAdviceRepositoryAdapter implements IDashboardAdviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByWeek(week: string): Promise<DashboardAdvice | null> {
    const record = await this.prisma.dashboardAdvice.findUnique({
      where: { week },
    });
    if (record === null) {
      return null;
    }
    return DashboardAdvice.create({
      week: record.week,
      text: record.text,
      source: record.source as DashboardAdviceSource,
      model: record.model,
      generatedAt: record.generatedAt,
      sourceSummary: record.sourceSummary,
    });
  }

  async save(advice: DashboardAdvice): Promise<void> {
    const data = {
      text: advice.text,
      source: advice.source,
      model: advice.model,
      generatedAt: advice.generatedAt,
      sourceSummary: advice.sourceSummary as Prisma.InputJsonValue,
    };
    await this.prisma.dashboardAdvice.upsert({
      where: { week: advice.week },
      create: { week: advice.week, ...data },
      update: data,
    });
  }
}
