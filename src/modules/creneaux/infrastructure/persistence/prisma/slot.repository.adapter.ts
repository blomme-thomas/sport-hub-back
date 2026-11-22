import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../core/prisma/prisma.service.js';
import type { Slot } from '../../../domain/entities/slot.entity.js';
import type { ISlotRepository } from '../../../domain/ports/outbound/slot.repository.port.js';
import type { SlotId } from '../../../domain/value-objects/slot-id.vo.js';
import type { SlotPeriod } from '../../../domain/value-objects/slot-period.vo.js';
import { SlotMapper } from './slot.mapper.js';

@Injectable()
export class PrismaSlotRepositoryAdapter implements ISlotRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: SlotId): Promise<Slot | null> {
    const record = await this.prisma.slot.findUnique({
      where: { id: id.toString() },
    });
    return record === null ? null : SlotMapper.toDomain(record);
  }

  async findIntersecting(period: SlotPeriod): Promise<Slot[]> {
    const records = await this.prisma.slot.findMany({
      where: {
        OR: [
          {
            recurrence: 'aucune',
            date: { gte: period.from, lte: period.to },
          },
          {
            recurrence: 'hebdomadaire',
            date: { lte: period.to },
          },
        ],
      },
    });
    return records.map((record) => SlotMapper.toDomain(record));
  }

  async save(slot: Slot): Promise<void> {
    const data = SlotMapper.toPersistence(slot);
    await this.prisma.slot.upsert({
      where: { id: slot.id.toString() },
      create: data,
      update: data,
    });
  }

  async delete(id: SlotId): Promise<void> {
    await this.prisma.slot.deleteMany({ where: { id: id.toString() } });
  }
}
