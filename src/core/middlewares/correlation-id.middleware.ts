import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  CORRELATION_ID_HEADER,
  resolveCorrelationId,
  runWithCorrelationId,
} from './correlation-id.storage.js';

export function correlationIdMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: unknown) => void,
): void {
  const id = resolveCorrelationId(req.headers[CORRELATION_ID_HEADER]);
  res.setHeader('X-Correlation-Id', id);
  runWithCorrelationId(id, () => next());
}
