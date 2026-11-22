import { Inject, Injectable } from '@nestjs/common';
import { DashboardAdviceNotFoundError } from '../../domain/errors/dashboard-advice-not-found.error.js';
import {
  CONSEILS_CLOCK,
  type ConseilsClock,
} from '../../domain/ports/outbound/conseils.ports.js';
import {
  DASHBOARD_ADVICE_REPOSITORY,
  type IDashboardAdviceRepository,
} from '../../domain/ports/outbound/dashboard-advice.ports.js';
import { IsoWeek } from '../../domain/value-objects/iso-week.vo.js';
import {
  DashboardAdviceDtoMapper,
  type DashboardAdviceDto,
} from '../dtos/dashboard-advice.dto.js';

@Injectable()
export class GetDashboardAdviceUseCase {
  constructor(
    @Inject(DASHBOARD_ADVICE_REPOSITORY)
    private readonly advices: IDashboardAdviceRepository,
    @Inject(CONSEILS_CLOCK)
    private readonly clock: ConseilsClock,
  ) {}

  /**
   * Renvoie le conseil stocké de la semaine ISO courante, sans appel au modèle.
   *
   * @throws DashboardAdviceNotFoundError si aucun conseil n'a été généré pour cette semaine.
   */
  async execute(): Promise<DashboardAdviceDto> {
    const week = IsoWeek.containing(this.clock());
    const advice = await this.advices.findByWeek(week.label);
    if (advice === null) {
      throw new DashboardAdviceNotFoundError();
    }
    return DashboardAdviceDtoMapper.fromDomain(advice);
  }
}
