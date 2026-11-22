import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../core/prisma/prisma.service.js';
import type { IWeeklyReviewRepository } from '../../../domain/ports/outbound/weekly-review.ports.js';
import {
  WeeklyReview,
  type WeeklyReviewSource,
} from '../../../domain/value-objects/weekly-review.vo.js';

@Injectable()
export class PrismaWeeklyReviewRepositoryAdapter implements IWeeklyReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByWeek(week: string): Promise<WeeklyReview | null> {
    const record = await this.prisma.weeklyReview.findUnique({
      where: { week },
    });
    if (record === null) {
      return null;
    }
    return WeeklyReview.create({
      week: record.week,
      suivi: record.suivi,
      pointAttention: record.pointAttention,
      conseil: record.conseil,
      source: record.source as WeeklyReviewSource,
      model: record.model,
      generatedAt: record.generatedAt,
    });
  }

  async save(review: WeeklyReview): Promise<void> {
    const data = {
      suivi: review.suivi,
      pointAttention: review.pointAttention,
      conseil: review.conseil,
      source: review.source,
      model: review.model,
      generatedAt: review.generatedAt,
    };
    await this.prisma.weeklyReview.upsert({
      where: { week: review.week },
      create: { week: review.week, ...data },
      update: data,
    });
  }
}
