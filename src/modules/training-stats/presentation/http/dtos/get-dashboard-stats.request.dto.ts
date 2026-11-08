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
    example: '30d',
    description:
      "Période glissante se terminant aujourd'hui (UTC) : 7 ou 30 jours, 3 mois ou 1 an. La période précédente a la même durée.",
  })
  @IsIn(DASHBOARD_PERIODS)
  period!: DashboardPeriod;
}
