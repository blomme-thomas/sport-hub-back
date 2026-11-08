import { Inject, Injectable } from '@nestjs/common';
import {
  CONSEILS_CLOCK,
  type ConseilsClock,
} from '../../domain/ports/outbound/conseils.ports.js';
import {
  DASHBOARD_ADVICE_DATA_READER,
  DASHBOARD_ADVICE_GENERATOR,
  DASHBOARD_ADVICE_REPOSITORY,
  type IDashboardAdviceDataReader,
  type IDashboardAdviceGenerator,
  type IDashboardAdviceRepository,
} from '../../domain/ports/outbound/dashboard-advice.ports.js';
import { DashboardAdvice } from '../../domain/value-objects/dashboard-advice.vo.js';
import { IsoWeek } from '../../domain/value-objects/iso-week.vo.js';
import {
  DashboardAdviceDtoMapper,
  type DashboardAdviceDto,
} from '../dtos/dashboard-advice.dto.js';

export const INSUFFICIENT_DASHBOARD_ADVICE_TEXT =
  'Données insuffisantes pour un conseil cette semaine : aucune activité enregistrée.';

@Injectable()
export class GenerateDashboardAdviceUseCase {
  constructor(
    @Inject(DASHBOARD_ADVICE_DATA_READER)
    private readonly data: IDashboardAdviceDataReader,
    @Inject(DASHBOARD_ADVICE_GENERATOR)
    private readonly generator: IDashboardAdviceGenerator,
    @Inject(DASHBOARD_ADVICE_REPOSITORY)
    private readonly advices: IDashboardAdviceRepository,
    @Inject(CONSEILS_CLOCK)
    private readonly clock: ConseilsClock,
  ) {}

  /**
   * Génère le conseil de la semaine ISO courante et le remplace s'il existe.
   * Sans activité dans la semaine, un conseil « données insuffisantes » est stocké sans appel au modèle.
   *
   * @throws DashboardAdviceUnavailableError, DashboardAdviceAccessDeniedError, DashboardAdviceInvalidOutputError : voir le port de génération.
   */
  async execute(): Promise<DashboardAdviceDto> {
    const generatedAt = this.clock();
    const week = IsoWeek.containing(generatedAt);
    const data = await this.data.readWeek(week);
    const advice =
      data.stats.count === 0
        ? DashboardAdvice.create({
            week: week.label,
            text: INSUFFICIENT_DASHBOARD_ADVICE_TEXT,
            source: 'insuffisant',
            model: null,
            generatedAt,
            sourceSummary: data,
          })
        : DashboardAdvice.create({
            week: week.label,
            ...(await this.generator.generate(data)),
            source: 'ia',
            generatedAt,
            sourceSummary: data,
          });
    await this.advices.save(advice);
    return DashboardAdviceDtoMapper.fromDomain(advice);
  }
}
