export const PROBLEM_JSON_CONTENT_TYPE = 'application/problem+json';

export type DependencyStatus = 'up' | 'down';

export interface ValidationErrorItem {
  field: string;
  code: string;
  message: string;
}

/** Corps d'erreur de l'API (RFC 9457) avec extensions `code`, `correlationId` et `errors`. */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
  correlationId: string;
  errors?: ValidationErrorItem[];
  checks?: Readonly<Record<string, DependencyStatus>>;
}
