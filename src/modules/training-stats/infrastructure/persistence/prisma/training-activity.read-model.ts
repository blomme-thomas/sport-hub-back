import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../core/prisma/prisma.service.js';
import type { Prisma } from '../../../../../core/prisma/generated/client.js';
import type {
  ITrainingActivityReadModel,
  TrainingActivityFact,
  TrainingActivityWindow,
} from '../../../domain/ports/outbound/training-activity.read-model.port.js';

@Injectable()
export class PrismaTrainingActivityReadModel implements ITrainingActivityReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async findFacts(
    window: TrainingActivityWindow,
  ): Promise<TrainingActivityFact[]> {
    const records = await this.prisma.activity.findMany({
      where: PrismaTrainingActivityReadModel.toWhere(window),
      select: {
        type: true,
        startedAt: true,
        durationSeconds: true,
        distanceMeters: true,
      },
      orderBy: { startedAt: 'asc' },
    });
    return records.map((record) => ({
      type: record.type,
      startedAt: record.startedAt,
      durationSeconds: record.durationSeconds,
      distanceMeters: record.distanceMeters,
    }));
  }

  private static toWhere(
    window: TrainingActivityWindow,
  ): Prisma.ActivityWhereInput {
    const where: Prisma.ActivityWhereInput = {
      startedAt: { gte: window.from, lt: window.toExclusive },
    };
    if (window.type !== null) {
      where.type = window.type;
    }
    return where;
  }
}
