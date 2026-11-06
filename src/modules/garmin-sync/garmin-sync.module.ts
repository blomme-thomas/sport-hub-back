import { Module } from '@nestjs/common';
import { HttpClientModule } from '../../core/http/http-client.module.js';
import { GarminPersonalApiTokenProvider } from './infrastructure/adapters/garmin-personal-api-token.provider.js';

@Module({
  imports: [HttpClientModule],
  providers: [GarminPersonalApiTokenProvider],
  exports: [GarminPersonalApiTokenProvider],
})
export class GarminSyncModule {}
