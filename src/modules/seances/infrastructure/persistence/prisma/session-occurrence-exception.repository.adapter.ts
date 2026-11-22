import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../core/prisma/prisma.service.js';
import type { SessionOccurrenceException } from '../../../domain/entities/session-occurrence-exception.js';
import type { ISessionOccurrenceExceptionRepository } from '../../../domain/ports/outbound/session-occurrence-exception.repository.port.js';

interface ExceptionRecord {
  sessionId: string;
  occurrenceDate: Date;
  movedDate: Date | null;
  movedStartTime: string | null;
  cancelled: boolean;
}

@Injectable()
export class PrismaSessionOccurrenceExceptionRepositoryAdapter implements ISessionOccurrenceExceptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBySessionAndDate(
    sessionId: string,
    occurrenceDate: Date,
  ): Promise<SessionOccurrenceException | null> {
    const record = await this.prisma.sessionOccurrenceException.findUnique({
      where: { sessionId_occurrenceDate: { sessionId, occurrenceDate } },
    });
    return record === null ? null : toDomain(record);
  }

  async findBySessionIds(
    sessionIds: string[],
  ): Promise<SessionOccurrenceException[]> {
    if (sessionIds.length === 0) {
      return [];
    }
    const records = await this.prisma.sessionOccurrenceException.findMany({
      where: { sessionId: { in: sessionIds } },
    });
    return records.map((record) => toDomain(record));
  }

  async save(exception: SessionOccurrenceException): Promise<void> {
    const data = {
      sessionId: exception.sessionId,
      occurrenceDate: exception.occurrenceDate,
      movedDate: exception.movedDate,
      movedStartTime: exception.movedStartTime,
      cancelled: exception.cancelled,
    };
    await this.prisma.sessionOccurrenceException.upsert({
      where: {
        sessionId_occurrenceDate: {
          sessionId: exception.sessionId,
          occurrenceDate: exception.occurrenceDate,
        },
      },
      create: data,
      update: data,
    });
  }

  async delete(sessionId: string, occurrenceDate: Date): Promise<void> {
    await this.prisma.sessionOccurrenceException.deleteMany({
      where: { sessionId, occurrenceDate },
    });
  }
}

function toDomain(record: ExceptionRecord): SessionOccurrenceException {
  return {
    sessionId: record.sessionId,
    occurrenceDate: record.occurrenceDate,
    movedDate: record.movedDate,
    movedStartTime: record.movedStartTime,
    cancelled: record.cancelled,
  };
}
