import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../core/prisma/prisma.service.js';
import {
  ActivityComment,
  type CommentSource,
} from '../../../domain/value-objects/activity-comment.vo.js';
import type { IActivityCommentRepository } from '../../../domain/ports/outbound/conseils.ports.js';

@Injectable()
export class PrismaActivityCommentRepositoryAdapter implements IActivityCommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByActivityId(activityId: string): Promise<ActivityComment | null> {
    const record = await this.prisma.activityComment.findUnique({
      where: { activityId },
    });
    if (record === null) {
      return null;
    }
    return ActivityComment.create({
      activityId: record.activityId,
      text: record.text,
      source: record.source as CommentSource,
      model: record.model,
      generatedAt: record.generatedAt,
    });
  }

  async save(comment: ActivityComment): Promise<void> {
    const data = {
      text: comment.text,
      source: comment.source,
      model: comment.model,
      generatedAt: comment.generatedAt,
    };
    await this.prisma.activityComment.upsert({
      where: { activityId: comment.activityId },
      create: { activityId: comment.activityId, ...data },
      update: data,
    });
  }
}
