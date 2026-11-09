import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../core/prisma/prisma.service.js';
import type { Prisma } from '../../../../../core/prisma/generated/client.js';
import type {
  ActivityDetailItem,
  ActivityListCriteria,
  ActivityListItem,
  ActivityListPage,
  IActivityListReadModel,
} from '../../../domain/ports/outbound/activity-list.read-model.port.js';
import { maxHeartRateOf } from './activity-detail.mapper.js';

const LIST_SELECT = {
  id: true,
  garminActivityId: true,
  type: true,
  startedAt: true,
  durationSeconds: true,
  distanceMeters: true,
  averageHeartRate: true,
} satisfies Prisma.ActivitySelect;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  calories: true,
  elevationGainMeters: true,
  hrTimeInZone1: true,
  hrTimeInZone2: true,
  hrTimeInZone3: true,
  hrTimeInZone4: true,
  hrTimeInZone5: true,
  rawPayload: true,
} satisfies Prisma.ActivitySelect;

@Injectable()
export class PrismaActivityListReadModel implements IActivityListReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async list(criteria: ActivityListCriteria): Promise<ActivityListPage> {
    const where = PrismaActivityListReadModel.toWhere(criteria);
    const [records, total] = await this.prisma.$transaction([
      this.prisma.activity.findMany({
        where,
        select: LIST_SELECT,
        orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
        skip: (criteria.page - 1) * criteria.pageSize,
        take: criteria.pageSize,
      }),
      this.prisma.activity.count({ where }),
    ]);
    return { items: records.map((record) => ({ ...record })), total };
  }

  async findById(id: string): Promise<ActivityListItem | null> {
    const record = await this.prisma.activity.findUnique({
      where: { id },
      select: LIST_SELECT,
    });
    return record === null ? null : { ...record };
  }

  async findDetailById(id: string): Promise<ActivityDetailItem | null> {
    const record = await this.prisma.activity.findUnique({
      where: { id },
      select: DETAIL_SELECT,
    });
    if (record === null) {
      return null;
    }
    return {
      id: record.id,
      garminActivityId: record.garminActivityId,
      type: record.type,
      startedAt: record.startedAt,
      durationSeconds: record.durationSeconds,
      distanceMeters: record.distanceMeters,
      averageHeartRate: record.averageHeartRate,
      calories: record.calories,
      elevationGainMeters: record.elevationGainMeters,
      maxHeartRate: maxHeartRateOf(record.rawPayload),
      hrTimeInZone: [
        record.hrTimeInZone1,
        record.hrTimeInZone2,
        record.hrTimeInZone3,
        record.hrTimeInZone4,
        record.hrTimeInZone5,
      ],
    };
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
