import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../core/prisma/prisma.service.js';
import type { Prisma } from '../../../../../core/prisma/generated/client.js';
import type {
  ActivityListCriteria,
  ActivityListItem,
  ActivityListPage,
  IActivityListReadModel,
} from '../../../domain/ports/outbound/activity-list.read-model.port.js';

@Injectable()
export class PrismaActivityListReadModel implements IActivityListReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async list(criteria: ActivityListCriteria): Promise<ActivityListPage> {
    const where = PrismaActivityListReadModel.toWhere(criteria);
    const [records, total] = await this.prisma.$transaction([
      this.prisma.activity.findMany({
        where,
        select: {
          id: true,
          garminActivityId: true,
          type: true,
          startedAt: true,
          durationSeconds: true,
          distanceMeters: true,
        },
        orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
        skip: (criteria.page - 1) * criteria.pageSize,
        take: criteria.pageSize,
      }),
      this.prisma.activity.count({ where }),
    ]);
    const items: ActivityListItem[] = records.map((record) => ({
      id: record.id,
      garminActivityId: record.garminActivityId,
      type: record.type,
      startedAt: record.startedAt,
      durationSeconds: record.durationSeconds,
      distanceMeters: record.distanceMeters,
    }));
    return { items, total };
  }

  private static toWhere(
    criteria: ActivityListCriteria,
  ): Prisma.ActivityWhereInput {
    const where: Prisma.ActivityWhereInput = {};
    if (criteria.type !== null) {
      where.type = criteria.type;
    }
    if (criteria.from !== null || criteria.to !== null) {
      where.startedAt = {
        ...(criteria.from !== null ? { gte: criteria.from } : {}),
        ...(criteria.to !== null ? { lte: criteria.to } : {}),
      };
    }
    return where;
  }
}
