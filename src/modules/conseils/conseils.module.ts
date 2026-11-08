import { Module } from '@nestjs/common';
import { anthropicClientProvider } from '../../core/anthropic/anthropic-client.provider.js';
import { GarminSyncModule } from '../garmin-sync/index.js';
import { SeancesModule } from '../seances/index.js';
import { TrainingStatsModule } from '../training-stats/index.js';
import { GenerateActivityCommentUseCase } from './application/use-cases/generate-activity-comment.use-case.js';
import { GetActivityCommentUseCase } from './application/use-cases/get-activity-comment.use-case.js';
import { GenerateWeeklyReviewUseCase } from './application/use-cases/generate-weekly-review.use-case.js';
import { GetWeeklyReviewUseCase } from './application/use-cases/get-weekly-review.use-case.js';
import { GenerateDashboardAdviceUseCase } from './application/use-cases/generate-dashboard-advice.use-case.js';
import { GetDashboardAdviceUseCase } from './application/use-cases/get-dashboard-advice.use-case.js';
import {
  DASHBOARD_ADVICE_DATA_READER,
  DASHBOARD_ADVICE_GENERATOR,
  DASHBOARD_ADVICE_REPOSITORY,
} from './domain/ports/outbound/dashboard-advice.ports.js';
import { DashboardAdviceDataReaderAdapter } from './infrastructure/adapters/dashboard-advice.data-reader.adapter.js';
import { ClaudeDashboardAdviceGeneratorAdapter } from './infrastructure/adapters/claude-dashboard-advice.generator.adapter.js';
import { PrismaDashboardAdviceRepositoryAdapter } from './infrastructure/persistence/prisma/dashboard-advice.repository.adapter.js';
import { DashboardAdviceController } from './presentation/http/controllers/dashboard-advice.controller.js';
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
  controllers: [
    ActivityCommentsController,
    WeeklyReviewsController,
    DashboardAdviceController,
  ],
  providers: [
    GenerateActivityCommentUseCase,
    GetActivityCommentUseCase,
    GenerateWeeklyReviewUseCase,
    GetWeeklyReviewUseCase,
    GenerateDashboardAdviceUseCase,
    GetDashboardAdviceUseCase,
    anthropicClientProvider,
    {
      provide: DASHBOARD_ADVICE_DATA_READER,
      useClass: DashboardAdviceDataReaderAdapter,
    },
    {
      provide: DASHBOARD_ADVICE_GENERATOR,
      useClass: ClaudeDashboardAdviceGeneratorAdapter,
    },
    {
      provide: DASHBOARD_ADVICE_REPOSITORY,
      useClass: PrismaDashboardAdviceRepositoryAdapter,
    },
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
