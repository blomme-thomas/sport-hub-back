import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../core/prisma/prisma.service.js';
import type { Activity } from '../../../domain/entities/activity.entity.js';
import type { IActivityRepository } from '../../../domain/ports/outbound/activity.repository.port.js';
import type { ActivityFitExtraction } from '../../../domain/ports/outbound/activity-heart-rate.extractor.port.js';
import type { Prisma } from '../../../../../core/prisma/generated/client.js';
import type { GarminActivityId } from '../../../domain/value-objects/garmin-activity-id.vo.js';
import { ActivityMapper } from './activity.mapper.js';

@Injectable()
export class PrismaActivityRepositoryAdapter implements IActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findLatestStartedAt(): Promise<Date | null> {
    const latest = await this.prisma.activity.findFirst({
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true },
    });
    return latest?.startedAt ?? null;
  }

  async findByGarminActivityIds(ids: GarminActivityId[]): Promise<Activity[]> {
    if (ids.length === 0) {
      return [];
    }
    const records = await this.prisma.activity.findMany({
      where: { garminActivityId: { in: ids.map((id) => id.toString()) } },
    });
    return records.map((record) => ActivityMapper.toDomain(record));
  }

  async saveFitExtraction(
    garminActivityId: string,
    extraction: ActivityFitExtraction,
  ): Promise<void> {
    const activity = await this.prisma.activity.findUnique({
      where: { garminActivityId },
      select: { id: true },
    });
    if (activity === null) {
      return;
    }
    const document = extraction.document as unknown as Prisma.InputJsonObject;
    await this.prisma.$transaction([
      this.prisma.activityHeartRateSample.deleteMany({
        where: { activityId: activity.id },
      }),
      this.prisma.activityHeartRateSample.createMany({
        data: extraction.heartRateSamples.map((sample) => ({
          activityId: activity.id,
          occurredAt: sample.occurredAt,
          bpm: sample.bpm,
        })),
      }),
      this.prisma.activityFitDocument.upsert({
        where: { activityId: activity.id },
        create: {
          activityId: activity.id,
          formatVersion: extraction.document.formatVersion,
          document,
        },
        update: {
          formatVersion: extraction.document.formatVersion,
          document,
        },
      }),
    ]);
  }

  async save(activities: Activity[]): Promise<void> {
    if (activities.length === 0) {
      return;
    }
    const operations = activities.map((activity) => {
      const data = ActivityMapper.toPersistence(activity);
      return this.prisma.activity.upsert({
        where: { garminActivityId: data.garminActivityId },
        create: data,
        update: data,
      });
    });
    await this.prisma.$transaction(operations);
  }
}
