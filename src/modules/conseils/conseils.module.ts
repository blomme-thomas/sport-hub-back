import { Module } from '@nestjs/common';
import { anthropicClientProvider } from '../../core/anthropic/anthropic-client.provider.js';
import { GarminSyncModule } from '../garmin-sync/index.js';
import { SeancesModule } from '../seances/index.js';
import { GenerateActivityCommentUseCase } from './application/use-cases/generate-activity-comment.use-case.js';
import { GetActivityCommentUseCase } from './application/use-cases/get-activity-comment.use-case.js';
import {
  ACTIVITY_COMMENT_GENERATOR,
  ACTIVITY_COMMENT_REPOSITORY,
  ACTIVITY_READER,
  CONSEILS_CLOCK,
  PLANNED_SESSION_READER,
} from './domain/ports/outbound/conseils.ports.js';
import { GarminActivityReaderAdapter } from './infrastructure/adapters/garmin-activity-reader.adapter.js';
import { ClaudeActivityCommentGeneratorAdapter } from './infrastructure/adapters/claude-activity-comment.generator.adapter.js';
import { SeancesPlannedSessionReaderAdapter } from './infrastructure/adapters/seances-planned-session-reader.adapter.js';
import { PrismaActivityCommentRepositoryAdapter } from './infrastructure/persistence/prisma/activity-comment.repository.adapter.js';
import { ActivityCommentsController } from './presentation/http/controllers/activity-comments.controller.js';

@Module({
  imports: [GarminSyncModule, SeancesModule],
  controllers: [ActivityCommentsController],
  providers: [
    GenerateActivityCommentUseCase,
    GetActivityCommentUseCase,
    anthropicClientProvider,
    { provide: ACTIVITY_READER, useClass: GarminActivityReaderAdapter },
    {
      provide: PLANNED_SESSION_READER,
      useClass: SeancesPlannedSessionReaderAdapter,
    },
    {
      provide: ACTIVITY_COMMENT_GENERATOR,
      useClass: ClaudeActivityCommentGeneratorAdapter,
    },
    {
      provide: ACTIVITY_COMMENT_REPOSITORY,
      useClass: PrismaActivityCommentRepositoryAdapter,
    },
    { provide: CONSEILS_CLOCK, useValue: () => new Date() },
  ],
})
export class ConseilsModule {}
