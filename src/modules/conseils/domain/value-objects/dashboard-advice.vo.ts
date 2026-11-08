import { DashboardAdviceInvalidOutputError } from '../errors/dashboard-advice-invalid-output.error.js';

export const DASHBOARD_ADVICE_SOURCES = ['ia', 'insuffisant'] as const;
export type DashboardAdviceSource = (typeof DASHBOARD_ADVICE_SOURCES)[number];

const MAX_LENGTH = 1000;

export interface DashboardAdviceProps {
  week: string;
  text: string;
  source: DashboardAdviceSource;
  model: string | null;
  generatedAt: Date;
  sourceSummary: unknown;
}

/** Conseil du tableau de bord pour une semaine ISO, avec le résumé chiffré qui a servi à le rédiger. */
export class DashboardAdvice {
  private constructor(
    readonly week: string,
    readonly text: string,
    readonly source: DashboardAdviceSource,
    readonly model: string | null,
    readonly generatedAt: Date,
    readonly sourceSummary: unknown,
  ) {}

  /**
   * @throws DashboardAdviceInvalidOutputError si le texte est vide ou dépasse 1000 caractères.
   */
  static create(props: DashboardAdviceProps): DashboardAdvice {
    const text = props.text.trim();
    if (text.length === 0) {
      throw new DashboardAdviceInvalidOutputError('texte vide');
    }
    if (text.length > MAX_LENGTH) {
      throw new DashboardAdviceInvalidOutputError(
        `texte de plus de ${MAX_LENGTH} caractères`,
      );
    }
    return new DashboardAdvice(
      props.week,
      text,
      props.source,
      props.model,
      props.generatedAt,
      props.sourceSummary,
    );
  }
}
