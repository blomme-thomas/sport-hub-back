import { Inject, Injectable } from '@nestjs/common';
import {
  GARMIN_CONNECT_CLIENT,
  type IGarminConnectClient,
  type RecoveryDay,
  type RecoveryRange,
} from '../../domain/ports/outbound/garmin-connect-client.port.js';

@Injectable()
export class GetRecoveryUseCase {
  constructor(
    @Inject(GARMIN_CONNECT_CLIENT)
    private readonly garminClient: IGarminConnectClient,
  ) {}

  /**
   * Renvoie, jour par jour, les données de récupération de la plage (sommeil, HRV, Body Battery, fréquence cardiaque de repos).
   * La validation de la plage (format, ordre, 31 jours au plus) est faite à la frontière HTTP.
   *
   * @throws GarminAccessDeniedError si Garmin refuse la clé ou le jeton.
   * @throws GarminUnavailableError si Garmin est indisponible.
   */
  async execute(range: RecoveryRange): Promise<RecoveryDay[]> {
    return this.garminClient.fetchRecoveryDays(range);
  }
}
