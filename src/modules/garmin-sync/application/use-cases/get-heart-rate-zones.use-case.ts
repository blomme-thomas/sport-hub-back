import { Inject, Injectable } from '@nestjs/common';
import {
  GARMIN_CONNECT_CLIENT,
  type IGarminConnectClient,
} from '../../domain/ports/outbound/garmin-connect-client.port.js';
import type { HeartRateZonesDto } from '../dtos/heart-rate-zones.dto.js';

@Injectable()
export class GetHeartRateZonesUseCase {
  constructor(
    @Inject(GARMIN_CONNECT_CLIENT)
    private readonly garminClient: IGarminConnectClient,
  ) {}

  /**
   * Renvoie les seuils des zones cardiaques de l'utilisateur. Sans configuration, renvoie `available: false` et des null, sans valeur inventée.
   *
   * @throws GarminAccessDeniedError si Garmin refuse la clé ou le jeton.
   * @throws GarminUnavailableError si Garmin est indisponible.
   */
  async execute(): Promise<HeartRateZonesDto> {
    const config = await this.garminClient.fetchHeartRateZones();
    if (config === null) {
      return {
        available: false,
        trainingMethod: null,
        maxHeartRateUsed: null,
        restingHeartRateUsed: null,
        zone1Floor: null,
        zone2Floor: null,
        zone3Floor: null,
        zone4Floor: null,
        zone5Floor: null,
      };
    }
    const [zone1Floor, zone2Floor, zone3Floor, zone4Floor, zone5Floor] =
      config.zoneFloors;
    return {
      available: true,
      trainingMethod: config.trainingMethod,
      maxHeartRateUsed: config.maxHeartRateUsed,
      restingHeartRateUsed: config.restingHeartRateUsed,
      zone1Floor: zone1Floor ?? null,
      zone2Floor: zone2Floor ?? null,
      zone3Floor: zone3Floor ?? null,
      zone4Floor: zone4Floor ?? null,
      zone5Floor: zone5Floor ?? null,
    };
  }
}
