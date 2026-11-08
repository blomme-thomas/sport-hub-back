import { Module } from '@nestjs/common';
import { anthropicClientProvider } from '../../core/anthropic/anthropic-client.provider.js';
import { GarminSyncModule } from '../garmin-sync/index.js';
import { SeancesModule } from '../seances/index.js';
import { TrainingStatsModule } from '../training-stats/index.js';
import { GenerateActivityCommentUseCase } from './application/use-cases/generate-activity-comment.use-case.js';
import { GetActivityCommentUseCase } from './application/use-cases/get-activity-comment.use-case.js';
import { GenerateWeeklyReviewUseCase } from './application/use-cases/generate-weekly-review.use-case.js';
import { GetWeeklyReviewUseCase } from './application/use-cases/get-weekly-review.use-case.js';
import {
  ACTIVITY_COMMENT_GENERATOR,
  ACTIVITY_COMMENT_REPOSITORY,
  ACTIVITY_READER,
  CONSEILS_CLOCK,
  PLANNED_SESSION_READER,
} from './domain/ports/outbound/conseils.ports.js';
import {
  WEEKLY_DATA_READER,
  WEEKLY_REVIEW_GENERATOR,
  WEEKLY_REVIEW_REPOSITORY,
} from './domain/ports/outbound/weekly-review.ports.js';
import { GarminActivityReaderAdapter } from './infrastructure/adapters/garmin-activity-reader.adapter.js';
import { ClaudeActivityCommentGeneratorAdapter } from './infrastructure/adapters/claude-activity-comment.generator.adapter.js';
import { ClaudeWeeklyReviewGeneratorAdapter } from './infrastructure/adapters/claude-weekly-review.generator.adapter.js';
import { SeancesPlannedSessionReaderAdapter } from './infrastructure/adapters/seances-planned-session-reader.adapter.js';
import { WeeklyDataReaderAdapter } from './infrastructure/adapters/weekly-data.reader.adapter.js';
import { PrismaActivityCommentRepositoryAdapter } from './infrastructure/persistence/prisma/activity-comment.repository.adapter.js';
import { PrismaWeeklyReviewRepositoryAdapter } from './infrastructure/persistence/prisma/weekly-review.repository.adapter.js';
import { ActivityCommentsController } from './presentation/http/controllers/activity-comments.controller.js';
import { WeeklyReviewsController } from './presentation/http/controllers/weekly-reviews.controller.js';

@Module({
  imports: [GarminSyncModule, SeancesModule, TrainingStatsModule],
  controllers: [ActivityCommentsController, WeeklyReviewsController],
  providers: [
    GenerateActivityCommentUseCase,
    GetActivityCommentUseCase,
    GenerateWeeklyReviewUseCase,
    GetWeeklyReviewUseCase,
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
    { provide: WEEKLY_DATA_READER, useClass: WeeklyDataReaderAdapter },
    {
      provide: WEEKLY_REVIEW_GENERATOR,
      useClass: ClaudeWeeklyReviewGeneratorAdapter,
    },
    {
      provide: WEEKLY_REVIEW_REPOSITORY,
      useClass: PrismaWeeklyReviewRepositoryAdapter,
    },
    { provide: CONSEILS_CLOCK, useValue: () => new Date() },
  ],
})
export class ConseilsModule {}
