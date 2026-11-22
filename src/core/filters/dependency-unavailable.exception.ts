import { HttpException, HttpStatus } from '@nestjs/common';
import type { DependencyStatus } from './problem-details.js';

/** Signale qu'une dépendance technique ne répond pas ; le filtre global répond 503 `SERVICE_UNAVAILABLE`. */
export class DependencyUnavailableException extends HttpException {
  constructor(readonly checks: Readonly<Record<string, DependencyStatus>>) {
    super('Dependency unavailable', HttpStatus.SERVICE_UNAVAILABLE);
  }
}
