import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import {
  DASHBOARD_PERIODS,
  type DashboardPeriod,
} from '../../../domain/value-objects/dashboard-period.vo.js';

export class GetDashboardStatsRequestDto {
  @ApiProperty({
    type: String,
    enum: DASHBOARD_PERIODS,
    example: 'month',
    description:
      'Semaine ISO ou mois civil en cours (UTC) : week ou month. La période précédente est de même nature.',
  })
  @IsIn(DASHBOARD_PERIODS)
  period!: DashboardPeriod;
}
