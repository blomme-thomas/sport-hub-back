import { Prisma } from '../../../../../core/prisma/generated/client.js';
import type { PrismaService } from '../../../../../core/prisma/prisma.service.js';
import type { Session } from '../../../domain/entities/session.entity.js';
import { SessionMapper } from './session.mapper.js';

export function buildSessionSaveOperations(
  prisma: PrismaService,
  session: Session,
): Prisma.PrismaPromise<unknown>[] {
  const { modules, activityLink, ...scalars } =
    SessionMapper.toPersistence(session);
  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.session.upsert({
      where: { id: scalars.id },
      create: scalars,
      update: scalars,
    }),
    prisma.sessionModule.deleteMany({
      where: { sessionId: scalars.id },
    }),
    prisma.sessionActivityLink.deleteMany({
      where: { sessionId: scalars.id },
    }),
  ];
  if (activityLink !== null) {
    operations.push(
      prisma.sessionActivityLink.create({
        data: {
          sessionId: scalars.id,
          activityId: activityLink.activityId,
          origin: activityLink.origin,
          linkedAt: activityLink.linkedAt,
        },
      }),
    );
  }
  if (modules.length > 0) {
    operations.push(
      prisma.sessionModule.createMany({
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
      prisma.sessionChangeLog.createMany({
        data: pending.map((entry) => ({
          sessionId: scalars.id,
          changedAt: entry.changedAt,
          field: entry.field,
          previousValue: entry.previousValue,
        })),
      }),
    );
  }
  return operations;
}
