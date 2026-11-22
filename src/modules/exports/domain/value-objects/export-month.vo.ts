const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

/** Mois calendaire identifié par `AAAA-MM` ; `first` et `last` sont les premier et dernier jours, à minuit UTC. */
export interface ExportMonth {
  readonly label: string;
  readonly first: Date;
  readonly last: Date;
}

/** Renvoie le mois d'un libellé `AAAA-MM`, ou null si le format ou le numéro de mois est incorrect. */
export function parseExportMonth(value: string): ExportMonth | null {
  const match = MONTH_PATTERN.exec(value);
  if (match === null) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    return null;
  }
  return {
    label: value,
    first: new Date(Date.UTC(year, month - 1, 1)),
    last: new Date(Date.UTC(year, month, 0)),
  };
}
