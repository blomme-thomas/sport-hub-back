import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../core/prisma/prisma.service.js';
import type { Pause } from '../../../domain/entities/pause.entity.js';
import type {
  IPauseRepository,
  PauseRange,
} from '../../../domain/ports/outbound/pause.repository.port.js';
import { PauseMapper } from './pause.mapper.js';

@Injectable()
export class PrismaPauseRepositoryAdapter implements IPauseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Pause | null> {
    const record = await this.prisma.pause.findUnique({ where: { id } });
    return record === null ? null : PauseMapper.toDomain(record);
  }

  async findAll(range: PauseRange): Promise<Pause[]> {
    const overlaps =
      range.from === undefined && range.to === undefined
        ? undefined
        : {
            startDate:
              range.to === undefined
                ? undefined
                : { lte: new Date(`${range.to}T00:00:00.000Z`) },
            endDate:
              range.from === undefined
                ? undefined
                : { gte: new Date(`${range.from}T00:00:00.000Z`) },
          };
    const records = await this.prisma.pause.findMany({
      where: overlaps,
      orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
    });
    return records.map((record) => PauseMapper.toDomain(record));
  }

  async save(pause: Pause): Promise<void> {
    const data = PauseMapper.toPersistence(pause);
    await this.prisma.pause.upsert({
      where: { id: pause.id },
      create: data,
      update: data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.pause.deleteMany({ where: { id } });
  }
}
