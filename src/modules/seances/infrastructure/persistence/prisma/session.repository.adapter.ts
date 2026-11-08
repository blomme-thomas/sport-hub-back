import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../../core/prisma/generated/client.js';
import { PrismaService } from '../../../../../core/prisma/prisma.service.js';
import type { Session } from '../../../domain/entities/session.entity.js';
import type {
  ISessionRepository,
  SessionPeriod,
} from '../../../domain/ports/outbound/session.repository.port.js';
import type { SessionId } from '../../../domain/value-objects/session-id.vo.js';
import { SessionMapper } from './session.mapper.js';

const SESSION_INCLUDE = {
  modules: { orderBy: { position: 'asc' } },
  changeLogs: { orderBy: [{ changedAt: 'asc' }, { id: 'asc' }] },
} satisfies Prisma.SessionInclude;

@Injectable()
export class PrismaSessionRepositoryAdapter implements ISessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: SessionId): Promise<Session | null> {
    const record = await this.prisma.session.findUnique({
      where: { id: id.toString() },
      include: SESSION_INCLUDE,
    });
    return record === null ? null : SessionMapper.toDomain(record);
  }

  async findByPeriod(period: SessionPeriod): Promise<Session[]> {
    const records = await this.prisma.session.findMany({
      where: { date: { gte: period.from, lte: period.to } },
      include: SESSION_INCLUDE,
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
    return records.map((record) => SessionMapper.toDomain(record));
  }

  async save(session: Session): Promise<void> {
    const { modules, ...scalars } = SessionMapper.toPersistence(session);
    const operations: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.session.upsert({
        where: { id: scalars.id },
        create: scalars,
        update: scalars,
      }),
      this.prisma.sessionModule.deleteMany({
        where: { sessionId: scalars.id },
      }),
    ];
    if (modules.length > 0) {
      operations.push(
        this.prisma.sessionModule.createMany({
          data: modules.map((module) => ({
            sessionId: scalars.id,
            position: module.position,
            type: module.type,
            durationMinutes: module.durationMinutes,
            instruction: module.instruction,
            targetZones:
              module.targetZones === null
                ? Prisma.DbNull
                : (module.targetZones as Prisma.InputJsonObject),
            perceivedEffort: module.perceivedEffort,
          })),
        }),
      );
    }
    const pending = session.pendingLogEntries;
    if (pending.length > 0) {
      operations.push(
        this.prisma.sessionChangeLog.createMany({
          data: pending.map((entry) => ({
            sessionId: scalars.id,
            changedAt: entry.changedAt,
            field: entry.field,
            previousValue: entry.previousValue,
          })),
        }),
      );
    }
    await this.prisma.$transaction(operations);
  }

  async delete(id: SessionId): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id: id.toString() } });
  }
}
