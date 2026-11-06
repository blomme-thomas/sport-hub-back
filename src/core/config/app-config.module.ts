import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './app/app.config.js';
import databaseConfig from './database/database.config.js';
import { validateEnv } from './env.validation.js';
import garminConfig from './garmin/garmin.config.js';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate: validateEnv,
      load: [appConfig, databaseConfig, garminConfig],
    }),
  ],
  exports: [ConfigModule],
})
export class AppConfigModule {}
