import type {
  DashboardAdvice,
  DashboardAdviceSource,
} from '../../domain/value-objects/dashboard-advice.vo.js';

export interface DashboardAdviceDto {
  readonly week: string;
  readonly text: string;
  readonly source: DashboardAdviceSource;
  readonly model: string | null;
  readonly generatedAt: Date;
}

export class DashboardAdviceDtoMapper {
  static fromDomain(advice: DashboardAdvice): DashboardAdviceDto {
    return {
      week: advice.week,
      text: advice.text,
      source: advice.source,
      model: advice.model,
      generatedAt: advice.generatedAt,
    };
  }
}
