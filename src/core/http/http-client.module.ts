import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { HttpClientService } from './http-client.service.js';
import {
  DEFAULT_HTTP_CLIENT_OPTIONS,
  HTTP_CLIENT_DEFAULTS,
} from './http-client.types.js';

@Module({
  imports: [HttpModule],
  providers: [
    { provide: HTTP_CLIENT_DEFAULTS, useValue: DEFAULT_HTTP_CLIENT_OPTIONS },
    HttpClientService,
  ],
  exports: [HttpClientService],
})
export class HttpClientModule {}
