import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../core/prisma/prisma.service.js';
import type { Discipline } from '../../../domain/entities/discipline.entity.js';
import type { IDisciplineRepository } from '../../../domain/ports/outbound/discipline.repository.port.js';
import type { DisciplineTypeKey } from '../../../domain/value-objects/discipline-type-key.vo.js';
import { DisciplineMapper } from './discipline.mapper.js';

@Injectable()
export class PrismaDisciplineRepositoryAdapter implements IDisciplineRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Discipline[]> {
    const records = await this.prisma.discipline.findMany({
      orderBy: [{ label: 'asc' }, { typeKey: 'asc' }],
    });
    return records.map((record) => DisciplineMapper.toDomain(record));
  }

  async findByTypeKey(typeKey: DisciplineTypeKey): Promise<Discipline | null> {
    const record = await this.prisma.discipline.findUnique({
      where: { typeKey: typeKey.toString() },
    });
    return record === null ? null : DisciplineMapper.toDomain(record);
  }

  async findByTypeKeys(typeKeys: DisciplineTypeKey[]): Promise<Discipline[]> {
    if (typeKeys.length === 0) {
      return [];
    }
    const records = await this.prisma.discipline.findMany({
      where: { typeKey: { in: typeKeys.map((key) => key.toString()) } },
    });
    return records.map((record) => DisciplineMapper.toDomain(record));
  }

  async saveAppearances(disciplines: Discipline[]): Promise<void> {
    if (disciplines.length === 0) {
      return;
    }
    const creations = this.prisma.discipline.createMany({
      data: disciplines.map((discipline) =>
        DisciplineMapper.toPersistence(discipline),
      ),
      skipDuplicates: true,
    });
    const advances = disciplines.map((discipline) =>
      this.prisma.discipline.updateMany({
        where: {
          typeKey: discipline.typeKey.toString(),
          lastSeenAt: { lt: discipline.lastSeenAt },
        },
        data: { lastSeenAt: discipline.lastSeenAt },
      }),
    );
    await this.prisma.$transaction([creations, ...advances]);
  }

  async saveLabel(discipline: Discipline): Promise<void> {
    await this.prisma.discipline.updateMany({
      where: { typeKey: discipline.typeKey.toString() },
      data: { label: discipline.label.toString() },
    });
  }
}
