import { Inject, Injectable } from '@nestjs/common';
import {
  GARMIN_CONNECT_CLIENT,
  type DailyCaloriesDay,
  type IGarminConnectClient,
  type RecoveryRange,
} from '../../domain/ports/outbound/garmin-connect-client.port.js';

@Injectable()
export class GetDailyCaloriesUseCase {
  constructor(
    @Inject(GARMIN_CONNECT_CLIENT)
    private readonly garminClient: IGarminConnectClient,
  ) {}

  /**
   * Renvoie les calories journalières Garmin (total de la journée, repos inclus) de chaque jour de la plage, jours sans séance compris.
   * Un jour sans donnée a `calories` à null ; aucune valeur n'est reconstituée à partir des activités.
   *
   * @throws GarminAccessDeniedError si Garmin refuse la clé ou le jeton.
   * @throws GarminUnavailableError si Garmin est indisponible ou répond de façon inattendue.
   */
  async execute(range: RecoveryRange): Promise<DailyCaloriesDay[]> {
    return this.garminClient.fetchDailyCalories(range);
  }
}
