import { STATUS_CODES } from 'node:http';
import {
  type ArgumentsHost,
  BadRequestException,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import { DomainError } from '../../shared/domain/domain-error.js';
import {
  CORRELATION_ID_HEADER,
  getCorrelationId,
  resolveCorrelationId,
} from '../middlewares/correlation-id.storage.js';
import {
  DEFAULT_DOMAIN_ERROR_STATUS,
  DOMAIN_ERROR_STATUS,
  GENERIC_PROBLEM_CODES,
} from './error-status.table.js';
import { DependencyUnavailableException } from './dependency-unavailable.exception.js';
import {
  type DependencyStatus,
  PROBLEM_JSON_CONTENT_TYPE,
  type ProblemDetails,
  type ValidationErrorItem,
} from './problem-details.js';
import { RequestValidationException } from './request-validation.exception.js';

const INTERNAL_ERROR_DETAIL = 'Une erreur interne est survenue.';
const SERVICE_UNAVAILABLE_DETAIL =
  'Une dépendance du service est indisponible.';
const MALFORMED_BODY_DETAIL = 'Le corps de la requête est invalide.';
const TOO_LARGE_DETAIL = 'Le corps de la requête est trop volumineux.';

interface Resolved {
  status: number;
  code: string;
  detail: string;
  errors?: ValidationErrorItem[];
  checks?: Readonly<Record<string, DependencyStatus>>;
}

interface BodyParserError {
  type: string;
  status: number;
}

function isBodyParserError(error: unknown): error is BodyParserError {
  if (typeof error !== 'object' || error === null) return false;
  const { type, status } = error as { type?: unknown; status?: unknown };
  return (
    (type === 'entity.parse.failed' || type === 'entity.too.large') &&
    typeof status === 'number' &&
    status >= 400 &&
    status < 500
  );
}

interface RequestLike {
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

function isUnparsableJsonBody(
  exception: HttpException,
  req: RequestLike,
): boolean {
  if (
    !(exception instanceof BadRequestException) ||
    exception.cause !== undefined ||
    req.body !== undefined
  ) {
    return false;
  }
  const contentType = String(req.headers?.['content-type'] ?? '');
  const contentLength = Number(req.headers?.['content-length'] ?? 0);
  const chunked = req.headers?.['transfer-encoding'] !== undefined;
  return /json/i.test(contentType) && (contentLength > 0 || chunked);
}

function toKebab(code: string): string {
  return code.toLowerCase().replace(/_/g, '-');
}

const MAX_LOGGED_MESSAGE_LENGTH = 500;

function messageOf(exception: unknown): string {
  const raw =
    exception instanceof Error ? exception.message : String(exception);
  return raw.replace(/[\r\n]+/g, ' ').slice(0, MAX_LOGGED_MESSAGE_LENGTH);
}

function generic(code: keyof typeof GENERIC_PROBLEM_CODES): {
  status: number;
  code: string;
} {
  return { status: GENERIC_PROBLEM_CODES[code], code };
}

function parserErrorProblem(type: string): Resolved {
  return type === 'entity.too.large'
    ? { ...generic('PAYLOAD_TOO_LARGE'), detail: TOO_LARGE_DETAIL }
    : { ...generic('MALFORMED_REQUEST_BODY'), detail: MALFORMED_BODY_DETAIL };
}

/**
 * Convertit toute exception HTTP en réponse Problem Details (RFC 9457) avec `code` et `correlationId`.
 *
 * Nest transforme l'erreur de body-parser avant ce filtre : un JSON invalide devient une
 * `BadRequestException` sans cause (le `type` est perdu), un corps trop gros une `HttpException`
 * dont `cause` garde le `type`. Un JSON invalide est donc reconnu à l'indice suivant :
 * `BadRequestException` sans cause, avec un corps JSON non vide que body-parser n'a pas pu
 * renseigner (`req.body` indéfini). Une erreur de pipe survient après un parsing réussi
 * (`req.body` défini) ; une `URIError` n'a pas de corps.
 */
@Catch()
export class ProblemDetailsExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsExceptionFilter.name);

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly domainErrorStatus: Readonly<
      Record<string, number>
    > = DOMAIN_ERROR_STATUS,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      throw exception;
    }

    const { httpAdapter } = this.adapterHost;
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<RequestLike>();
    const res = ctx.getResponse<object>();

    const correlationId =
      getCorrelationId() ??
      resolveCorrelationId(req.headers?.[CORRELATION_ID_HEADER]);
    const method = String(httpAdapter.getRequestMethod(req));
    const path = String(httpAdapter.getRequestUrl(req)).split('?')[0] ?? '';

    if (httpAdapter.isHeadersSent(res)) {
      this.logger.error(
        `[${correlationId}] ${method} ${path} : erreur après envoi des headers : ${messageOf(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
      return;
    }

    const resolved = this.resolve(exception, correlationId, req);
    this.log(exception, resolved.status, correlationId, method, path);

    const body: ProblemDetails = {
      type: `urn:sport-hub:problem:${toKebab(resolved.code)}`,
      title: STATUS_CODES[resolved.status] ?? 'Error',
      status: resolved.status,
      detail: resolved.detail,
      instance: path,
      code: resolved.code,
      correlationId,
      ...(resolved.errors ? { errors: resolved.errors } : {}),
      ...(resolved.checks ? { checks: resolved.checks } : {}),
    };

    httpAdapter.setHeader(res, 'X-Correlation-Id', correlationId);
    httpAdapter.setHeader(res, 'Content-Type', PROBLEM_JSON_CONTENT_TYPE);
    httpAdapter.reply(res, body, resolved.status);
  }

  private resolve(
    exception: unknown,
    correlationId: string,
    req: RequestLike,
  ): Resolved {
    if (exception instanceof RequestValidationException) {
      const truncated = exception.totalErrors > exception.errors.length;
      return {
        ...generic('VALIDATION_FAILED'),
        detail: `La requête contient ${exception.totalErrors} erreur(s) de validation.${truncated ? ` La liste est tronquée à ${exception.errors.length} erreurs.` : ''}`,
        errors: exception.errors,
      };
    }

    if (exception instanceof DomainError) {
      const mapped = Object.hasOwn(this.domainErrorStatus, exception.code)
        ? this.domainErrorStatus[exception.code]
        : undefined;
      if (mapped === undefined) {
        this.logger.warn(
          `[${correlationId}] Business Error ${exception.code} : code non mappé dans DOMAIN_ERROR_STATUS, statut ${DEFAULT_DOMAIN_ERROR_STATUS} par défaut`,
        );
      }
      return {
        status: mapped ?? DEFAULT_DOMAIN_ERROR_STATUS,
        code: exception.code,
        detail: exception.message,
      };
    }

    if (exception instanceof DependencyUnavailableException) {
      return {
        ...generic('SERVICE_UNAVAILABLE'),
        detail: SERVICE_UNAVAILABLE_DETAIL,
        checks: exception.checks,
      };
    }

    if (exception instanceof HttpException) {
      const parserError = isBodyParserError(exception.cause)
        ? exception.cause
        : undefined;
      if (parserError) {
        return parserErrorProblem(parserError.type);
      }
      if (isUnparsableJsonBody(exception, req)) {
        return parserErrorProblem('entity.parse.failed');
      }
      const status = exception.getStatus();
      if (status >= 500) {
        return {
          status,
          code: 'INTERNAL_ERROR',
          detail: INTERNAL_ERROR_DETAIL,
        };
      }
      return {
        status,
        code: this.clientErrorCode(status),
        detail: exception.message,
      };
    }

    if (isBodyParserError(exception)) {
      return parserErrorProblem(exception.type);
    }

    return {
      ...generic('INTERNAL_ERROR'),
      detail: INTERNAL_ERROR_DETAIL,
    };
  }

  private clientErrorCode(status: number): string {
    const specific = ['BAD_REQUEST', 'NOT_FOUND', 'PAYLOAD_TOO_LARGE'] as const;
    return (
      specific.find((code) => GENERIC_PROBLEM_CODES[code] === status) ??
      'CLIENT_ERROR'
    );
  }

  private log(
    exception: unknown,
    status: number,
    correlationId: string,
    method: string,
    path: string,
  ): void {
    const line = `[${correlationId}] ${method} ${path} -> ${status} : ${messageOf(exception)}`;
    if (status >= 500) {
      this.logger.error(
        line,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.debug(line);
    }
  }
}
