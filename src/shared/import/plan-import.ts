/** Erreur d'import avec son chemin JSON (`aliments[2].name`), son code stable et un message lisible. */
export interface PlanImportIssue {
  field: string;
  code: string;
  message: string;
}

export type PlanFields = Record<string, unknown>;

/** Collecte les erreurs d'un fichier d'import ; chaque code est préfixé (ex. `FOOD_IMPORT_FIELD_MISSING`). */
export class PlanImportIssues {
  private readonly items: PlanImportIssue[] = [];

  constructor(private readonly prefix: string) {}

  add(field: string, code: string, message: string): void {
    this.items.push({ field, code: `${this.prefix}_${code}`, message });
  }

  get count(): number {
    return this.items.length;
  }

  get all(): PlanImportIssue[] {
    return this.items;
  }
}

export function isPlanRecord(value: unknown): value is PlanFields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface PlanEnvelopeFormat {
  /** Valeur attendue du champ `kind`, ex. `plan-aliments`. */
  kind: string;
  /** Nom de la liste dans l'enveloppe, ex. `aliments`. */
  listKey: string;
  supportedVersions: readonly number[];
}

/**
 * Lit la liste d'un fichier d'import. Deux formes acceptées : l'enveloppe `{ kind, schemaVersion, <listKey>: [...] }`
 * ou un tableau brut. Renvoie `null` et enregistre les erreurs si la forme est invalide.
 */
export function readPlanList(
  body: unknown,
  format: PlanEnvelopeFormat,
  issues: PlanImportIssues,
): unknown[] | null {
  if (Array.isArray(body)) {
    return checkNonEmpty(body, format.listKey, issues);
  }
  if (!isPlanRecord(body)) {
    issues.add(
      'racine',
      'ENVELOPE_INVALID',
      'le fichier doit contenir un objet JSON ou un tableau',
    );
    return null;
  }
  if (body['kind'] !== format.kind) {
    issues.add('kind', 'KIND_UNKNOWN', `doit être ${format.kind}`);
  }
  if (
    typeof body['schemaVersion'] !== 'number' ||
    !format.supportedVersions.includes(body['schemaVersion'])
  ) {
    issues.add(
      'schemaVersion',
      'VERSION_UNKNOWN',
      `doit être ${format.supportedVersions.join(' ou ')}`,
    );
  }
  rejectUnknownPlanFields(
    body,
    ['kind', 'schemaVersion', format.listKey],
    'racine',
    issues,
  );
  const list = body[format.listKey];
  if (!Array.isArray(list)) {
    issues.add(
      format.listKey,
      'LIST_MISSING',
      `la liste ${format.listKey} est attendue`,
    );
    return null;
  }
  return checkNonEmpty(list, format.listKey, issues);
}

function checkNonEmpty(
  list: unknown[],
  listKey: string,
  issues: PlanImportIssues,
): unknown[] | null {
  if (list.length === 0) {
    issues.add(listKey, 'LIST_EMPTY', 'au moins un élément est attendu');
    return null;
  }
  return list;
}

export function rejectUnknownPlanFields(
  fields: PlanFields,
  allowed: readonly string[],
  path: string,
  issues: PlanImportIssues,
): void {
  for (const key of Object.keys(fields)) {
    if (!allowed.includes(key)) {
      issues.add(`${path}.${key}`, 'UNKNOWN_FIELD', 'champ absent du format');
    }
  }
}

export interface PlanTextRule {
  optional?: boolean;
  max: number;
}

/** Texte : obligatoire ou facultatif (absent ou `null`), sans espaces seuls, de `max` caractères au plus. */
export function readPlanText(
  fields: PlanFields,
  key: string,
  path: string,
  issues: PlanImportIssues,
  rule: PlanTextRule,
): string | null {
  const value = fields[key];
  const field = `${path}.${key}`;
  if (value === undefined || value === null) {
    if (!rule.optional) {
      issues.add(field, 'FIELD_MISSING', 'champ obligatoire');
    }
    return null;
  }
  if (typeof value !== 'string') {
    issues.add(field, 'FIELD_TYPE', 'doit être une chaîne de caractères');
    return null;
  }
  if (value.trim() === '') {
    issues.add(field, 'FIELD_EMPTY', 'ne doit pas être vide');
    return null;
  }
  if (value.trim().length > rule.max) {
    issues.add(
      field,
      'FIELD_TOO_LONG',
      `ne doit pas dépasser ${rule.max} caractères`,
    );
    return null;
  }
  return value;
}

export interface PlanNumberRule {
  optional?: boolean;
  min: number;
}

/** Nombre : obligatoire ou facultatif (absent ou `null`), supérieur ou égal à `min`. */
export function readPlanNumber(
  fields: PlanFields,
  key: string,
  path: string,
  issues: PlanImportIssues,
  rule: PlanNumberRule,
): number | null {
  const value = fields[key];
  const field = `${path}.${key}`;
  if (value === undefined || value === null) {
    if (!rule.optional) {
      issues.add(field, 'FIELD_MISSING', 'champ obligatoire');
    }
    return null;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.add(field, 'FIELD_TYPE', 'doit être un nombre');
    return null;
  }
  if (value < rule.min) {
    issues.add(
      field,
      'FIELD_VALUE',
      `doit être supérieur ou égal à ${rule.min}`,
    );
    return null;
  }
  return value;
}

/** Liste de textes (ex. catégories) : obligatoire ou facultative, chaque élément est un texte non vide. */
export function readPlanStringList(
  fields: PlanFields,
  key: string,
  path: string,
  issues: PlanImportIssues,
  optional: boolean,
): string[] | null {
  const value = fields[key];
  const field = `${path}.${key}`;
  if (value === undefined || value === null) {
    if (!optional) {
      issues.add(field, 'FIELD_MISSING', 'champ obligatoire');
    }
    return null;
  }
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === 'string')
  ) {
    issues.add(
      field,
      'FIELD_TYPE',
      'doit être une liste de chaînes de caractères',
    );
    return null;
  }
  return value as string[];
}
