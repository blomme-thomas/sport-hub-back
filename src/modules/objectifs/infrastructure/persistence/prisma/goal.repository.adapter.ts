import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../core/prisma/prisma.service.js';
import type { Goal } from '../../../domain/entities/goal.entity.js';
import type { IGoalRepository } from '../../../domain/ports/outbound/goal.repository.port.js';
import type { GoalId } from '../../../domain/value-objects/goal-id.vo.js';
import { GoalMapper } from './goal.mapper.js';

@Injectable()
export class PrismaGoalRepositoryAdapter implements IGoalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: GoalId): Promise<Goal | null> {
    const record = await this.prisma.goal.findUnique({
      where: { id: id.toString() },
    });
    return record === null ? null : GoalMapper.toDomain(record);
  }

  async findAll(filter: { upcomingFrom?: Date }): Promise<Goal[]> {
    const records = await this.prisma.goal.findMany({
      where:
        filter.upcomingFrom === undefined
          ? undefined
          : { targetDate: { gte: filter.upcomingFrom } },
      orderBy: [
        { targetDate: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
    });
    return records.map((record) => GoalMapper.toDomain(record));
  }

  async save(goal: Goal): Promise<void> {
    const data = GoalMapper.toPersistence(goal);
    await this.prisma.goal.upsert({
      where: { id: goal.id.toString() },
      create: data,
      update: data,
    });
  }

  async delete(id: GoalId): Promise<void> {
    await this.prisma.goal.deleteMany({ where: { id: id.toString() } });
  }
}
