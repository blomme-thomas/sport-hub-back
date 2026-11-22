import { Module } from '@nestjs/common';
import { SeancesModule } from '../seances/index.js';
import { ExportPlannedCalendarUseCase } from './application/use-cases/export-planned-calendar.use-case.js';
import {
  CALENDAR_CLOCK,
  CALENDAR_SESSIONS_READER,
} from './domain/ports/outbound/calendar.ports.js';
import { SeancesCalendarSessionsReader } from './infrastructure/adapters/seances-calendar-sessions-reader.adapter.js';
import { CalendarController } from './presentation/http/controllers/calendar.controller.js';

@Module({
  imports: [SeancesModule],
  controllers: [CalendarController],
  providers: [
    ExportPlannedCalendarUseCase,
    {
      provide: CALENDAR_SESSIONS_READER,
      useClass: SeancesCalendarSessionsReader,
    },
    { provide: CALENDAR_CLOCK, useValue: () => new Date() },
  ],
})
export class CalendrierModule {}
