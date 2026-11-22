import { Inject, Injectable } from '@nestjs/common';
import {
  GARMIN_CONNECT_CLIENT,
  type IGarminConnectClient,
} from '../../domain/ports/outbound/garmin-connect-client.port.js';
import type { GarminProfileDto } from '../dtos/garmin-profile.dto.js';

@Injectable()
export class GetGarminProfileUseCase {
  constructor(
    @Inject(GARMIN_CONNECT_CLIENT)
    private readonly garminClient: IGarminConnectClient,
  ) {}

  /**
   * Renvoie le nom affiché du compte Garmin courant, sans valeur inventée : null si Garmin ne le fournit pas.
   *
   * @throws GarminAccessDeniedError si Garmin refuse la clé ou le jeton.
   * @throws GarminUnavailableError si Garmin est indisponible.
   */
  async execute(): Promise<GarminProfileDto> {
    return { displayName: await this.garminClient.fetchDisplayName() };
  }
}
