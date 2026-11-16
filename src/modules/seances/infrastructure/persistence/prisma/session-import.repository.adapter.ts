import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../../core/prisma/generated/client.js';
import { PrismaService } from '../../../../../core/prisma/prisma.service.js';
import type { Session } from '../../../domain/entities/session.entity.js';
import { SessionImportAlreadyDoneError } from '../../../domain/errors/session-import-already-done.error.js';
import type {
  ISessionImportRepository,
  SessionImportRecord,
} from '../../../domain/ports/outbound/session-import.repository.port.js';
import { buildSessionSaveOperations } from './session.save-operations.js';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class PrismaSessionImportRepositoryAdapter implements ISessionImportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async exists(importId: string): Promise<boolean> {
    const count = await this.prisma.sessionImport.count({
      where: { id: importId },
    });
    return count > 0;
  }

  async saveAll(
    record: SessionImportRecord,
    sessions: Session[],
  ): Promise<void> {
    const operations: Prisma.PrismaPromise<unknown>[] = sessions.flatMap(
      (session) => buildSessionSaveOperations(this.prisma, session),
    );
    operations.push(
      this.prisma.sessionImport.create({
        data: {
          id: record.importId,
          importedAt: record.importedAt,
          sessionCount: record.sessionCount,
        },
      }),
    );
    try {
      await this.prisma.$transaction(operations);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new SessionImportAlreadyDoneError();
      }
      throw error;
    }
  }
}
