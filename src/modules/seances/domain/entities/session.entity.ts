import { InvalidSessionError } from '../errors/invalid-session.error.js';
import { SessionAlreadyCompletedError } from '../errors/session-already-completed.error.js';
import { SessionId } from '../value-objects/session-id.vo.js';
import { SessionModule } from '../value-objects/session-module.vo.js';
import {
  type SessionStatus,
  isSessionStatus,
} from '../value-objects/session-status.vo.js';

const DISCIPLINE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 2000;
const EQUIPMENT_MAX_LENGTH = 1000;
const ATTENTION_POINTS_MAX_LENGTH = 1000;
const DURATION_MAX_MINUTES = 1440;
const MODULES_MAX = 30;

export interface SessionChangeLogEntry {
  changedAt: Date;
  field: string;
  previousValue: string | null;
}

export type ActivityLinkOrigin = 'automatique' | 'manuel';

export interface SessionActivityLink {
  activityId: string;
  origin: ActivityLinkOrigin;
  linkedAt: Date;
}

export interface SessionProps {
  date: Date;
  disciplineTypeKey: string;
  durationMinutes: number;
  startTime?: string | null;
  description?: string | null;
  equipment?: string | null;
  attentionPoints?: string | null;
  modules?: SessionModule[];
}

export interface SessionReconstitutionProps {
  id: SessionId;
  date: Date;
  disciplineTypeKey: string;
  durationMinutes: number;
  startTime?: string | null;
  status: string;
  modifiedManually: boolean;
  description: string | null;
  equipment: string | null;
  attentionPoints: string | null;
  modules: SessionModule[];
  changeLog: SessionChangeLogEntry[];
  activityLink?: SessionActivityLink | null;
}

export interface SessionChanges {
  date?: Date;
  disciplineTypeKey?: string;
  durationMinutes?: number;
  startTime?: string | null;
  status?: string;
  description?: string | null;
  equipment?: string | null;
  attentionPoints?: string | null;
}

interface SessionFieldsInput {
  date: Date;
  disciplineTypeKey: string;
  durationMinutes: number;
  startTime: string | null;
  status: string;
  description: string | null;
  equipment: string | null;
  attentionPoints: string | null;
}

interface SessionFields {
  date: Date;
  disciplineTypeKey: string;
  durationMinutes: number;
  startTime: string | null;
  status: SessionStatus;
  description: string | null;
  equipment: string | null;
  attentionPoints: string | null;
}

interface SessionState extends SessionFields {
  id: SessionId;
  modifiedManually: boolean;
  modules: SessionModule[];
  changeLog: SessionChangeLogEntry[];
  activityLink: SessionActivityLink | null;
  pendingLogEntries: SessionChangeLogEntry[];
}

export class Session {
  private constructor(private readonly state: SessionState) {}

  /**
   * Crée une séance planifiée, non modifiée manuellement, sans journal ; les modules reçoivent des positions de 1 à n selon leur ordre.
   *
   * @throws InvalidSessionError si un champ est invalide ou si la séance dépasse 30 modules.
   */
  static create(props: SessionProps): Session {
    const fields = validateFields({
      date: props.date,
      disciplineTypeKey: props.disciplineTypeKey,
      durationMinutes: props.durationMinutes,
      startTime: props.startTime ?? null,
      status: 'planifiee',
      description: props.description ?? null,
      equipment: props.equipment ?? null,
      attentionPoints: props.attentionPoints ?? null,
    });
    return new Session({
      id: SessionId.generate(),
      ...fields,
      modifiedManually: false,
      activityLink: null,
      modules: renumber(assertModulesCount(props.modules ?? [])),
      changeLog: [],
      pendingLogEntries: [],
    });
  }

  /**
   * Reconstitue une séance persistée ; les invariants sont revérifiés et le journal n'est pas en attente.
   *
   * @throws InvalidSessionError si un invariant ne tient plus.
   */
  static reconstitute(props: SessionReconstitutionProps): Session {
    const fields = validateFields({
      date: props.date,
      disciplineTypeKey: props.disciplineTypeKey,
      durationMinutes: props.durationMinutes,
      startTime: props.startTime ?? null,
      status: props.status,
      description: props.description,
      equipment: props.equipment,
      attentionPoints: props.attentionPoints,
    });
    return new Session({
      id: props.id,
      ...fields,
      modifiedManually: props.modifiedManually,
      activityLink: props.activityLink ?? null,
      modules: [...props.modules],
      changeLog: [...props.changeLog],
      pendingLogEntries: [],
    });
  }

  get id(): SessionId {
    return this.state.id;
  }

  get date(): Date {
    return this.state.date;
  }

  get disciplineTypeKey(): string {
    return this.state.disciplineTypeKey;
  }

  get durationMinutes(): number {
    return this.state.durationMinutes;
  }

  get startTime(): string | null {
    return this.state.startTime;
  }

  get status(): SessionStatus {
    return this.state.status;
  }

  get modifiedManually(): boolean {
    return this.state.modifiedManually;
  }

  get description(): string | null {
    return this.state.description;
  }

  get equipment(): string | null {
    return this.state.equipment;
  }

  get attentionPoints(): string | null {
    return this.state.attentionPoints;
  }

  get activityLink(): SessionActivityLink | null {
    return this.state.activityLink;
  }

  get modules(): SessionModule[] {
    return [...this.state.modules];
  }

  get changeLog(): SessionChangeLogEntry[] {
    return [...this.state.changeLog];
  }

  get pendingLogEntries(): SessionChangeLogEntry[] {
    return [...this.state.pendingLogEntries];
  }

  /**
   * Renvoie une nouvelle séance avec les champs fournis, sans modifier l'original.
   * Une valeur identique ne journalise rien ; chaque champ réellement modifié ajoute une entrée et positionne `modifiedManually`.
   *
   * @throws SessionAlreadyCompletedError si la séance est réalisée.
   * @throws InvalidSessionError si une valeur fusionnée viole un invariant.
   */
  change(changes: SessionChanges, now: Date): Session {
    const current = this.state;
    assertNotCompleted(current.status);
    const next = validateFields({
      date: changes.date ?? current.date,
      disciplineTypeKey: changes.disciplineTypeKey ?? current.disciplineTypeKey,
      durationMinutes: changes.durationMinutes ?? current.durationMinutes,
      startTime:
        changes.startTime === undefined ? current.startTime : changes.startTime,
      status: changes.status ?? current.status,
      description:
        changes.description === undefined
          ? current.description
          : changes.description,
      equipment:
        changes.equipment === undefined ? current.equipment : changes.equipment,
      attentionPoints:
        changes.attentionPoints === undefined
          ? current.attentionPoints
          : changes.attentionPoints,
    });
    const entries = changedEntries(current, next, now);
    return new Session({
      ...current,
      ...next,
      modifiedManually: current.modifiedManually || entries.length > 0,
      modules: [...current.modules],
      changeLog: [...current.changeLog, ...entries],
      pendingLogEntries: [...current.pendingLogEntries, ...entries],
    });
  }

  /**
   * Renvoie une nouvelle séance dont la liste de modules est remplacée et renumérotée de 1 à n, sans modifier l'original.
   * Une liste identique à la liste courante ne journalise rien.
   *
   * @throws SessionAlreadyCompletedError si la séance est réalisée.
   * @throws InvalidSessionError si la liste dépasse 30 modules.
   */
  replaceModules(modules: SessionModule[], now: Date): Session {
    const current = this.state;
    assertNotCompleted(current.status);
    const next = renumber(assertModulesCount(modules));
    const previous = serializeModules(current.modules);
    const entries: SessionChangeLogEntry[] =
      previous === serializeModules(next)
        ? []
        : [{ changedAt: now, field: 'modules', previousValue: previous }];
    return new Session({
      ...current,
      modules: next,
      modifiedManually: current.modifiedManually || entries.length > 0,
      changeLog: [...current.changeLog, ...entries],
      pendingLogEntries: [...current.pendingLogEntries, ...entries],
    });
  }

  /**
   * Renvoie une nouvelle séance liée à l'activité. Une séance planifiée ou manquée passe à réalisée ; lier l'activité déjà liée ne change rien.
   * Le journal des modifications n'est pas alimenté : le lien n'est pas une modification manuelle des champs.
   */
  linkActivity(
    activityId: string,
    origin: ActivityLinkOrigin,
    now: Date,
  ): Session {
    const current = this.state;
    if (current.activityLink?.activityId === activityId) {
      return this;
    }
    return new Session({
      ...current,
      status: 'realisee',
      activityLink: { activityId, origin, linkedAt: now },
      modules: [...current.modules],
      changeLog: [...current.changeLog],
      pendingLogEntries: [...current.pendingLogEntries],
    });
  }

  /**
   * Renvoie une nouvelle séance sans activité liée ; le statut est conservé.
   */
  unlinkActivity(): Session {
    const current = this.state;
    if (current.activityLink === null) {
      return this;
    }
    return new Session({
      ...current,
      activityLink: null,
      modules: [...current.modules],
      changeLog: [...current.changeLog],
      pendingLogEntries: [...current.pendingLogEntries],
    });
  }
}

function validateFields(input: SessionFieldsInput): SessionFields {
  if (Number.isNaN(input.date.getTime())) {
    throw new InvalidSessionError('la date est invalide');
  }
  const disciplineTypeKey = input.disciplineTypeKey.trim();
  if (disciplineTypeKey.length === 0) {
    throw new InvalidSessionError('la discipline ne peut pas être vide');
  }
  if (disciplineTypeKey.length > DISCIPLINE_MAX_LENGTH) {
    throw new InvalidSessionError(
      `la discipline dépasse ${DISCIPLINE_MAX_LENGTH} caractères`,
    );
  }
  if (!isDuration(input.durationMinutes)) {
    throw new InvalidSessionError(
      `la durée doit être un nombre entier de minutes de 1 à ${DURATION_MAX_MINUTES}`,
    );
  }
  if (!isSessionStatus(input.status)) {
    throw new InvalidSessionError(
      'le statut doit être planifiee, realisee ou manquee',
    );
  }
  return {
    date: new Date(input.date.getTime()),
    disciplineTypeKey,
    durationMinutes: input.durationMinutes,
    startTime: normalizeStartTime(input.startTime),
    status: input.status,
    description: normalizeText(
      input.description,
      DESCRIPTION_MAX_LENGTH,
      'la description',
    ),
    equipment: normalizeText(
      input.equipment,
      EQUIPMENT_MAX_LENGTH,
      'le matériel',
    ),
    attentionPoints: normalizeText(
      input.attentionPoints,
      ATTENTION_POINTS_MAX_LENGTH,
      'les points d’attention',
    ),
  };
}

function normalizeText(
  value: string | null,
  maxLength: number,
  label: string,
): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > maxLength) {
    throw new InvalidSessionError(`${label} dépasse ${maxLength} caractères`);
  }
  return trimmed;
}

const START_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function normalizeStartTime(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  if (!START_TIME_PATTERN.test(value)) {
    throw new InvalidSessionError("l'heure de début doit être au format HH:MM");
  }
  return value;
}

function isDuration(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= DURATION_MAX_MINUTES;
}

function assertNotCompleted(status: SessionStatus): void {
  if (status === 'realisee') {
    throw new SessionAlreadyCompletedError();
  }
}

function assertModulesCount(modules: SessionModule[]): SessionModule[] {
  if (modules.length > MODULES_MAX) {
    throw new InvalidSessionError(
      `une séance compte au plus ${MODULES_MAX} modules`,
    );
  }
  return modules;
}

function renumber(modules: SessionModule[]): SessionModule[] {
  return modules.map((module, index) => module.withPosition(index + 1));
}

function serializeModules(modules: SessionModule[]): string {
  return JSON.stringify(modules.map((module) => module.toPrimitives()));
}

function changedEntries(
  current: SessionFields,
  next: SessionFields,
  now: Date,
): SessionChangeLogEntry[] {
  const entries: SessionChangeLogEntry[] = [];
  if (next.date.getTime() !== current.date.getTime()) {
    entries.push({
      changedAt: now,
      field: 'date',
      previousValue: formatCalendarDate(current.date),
    });
  }
  if (next.disciplineTypeKey !== current.disciplineTypeKey) {
    entries.push({
      changedAt: now,
      field: 'disciplineTypeKey',
      previousValue: current.disciplineTypeKey,
    });
  }
  if (next.startTime !== current.startTime) {
    entries.push({
      changedAt: now,
      field: 'startTime',
      previousValue: current.startTime,
    });
  }
  if (next.durationMinutes !== current.durationMinutes) {
    entries.push({
      changedAt: now,
      field: 'durationMinutes',
      previousValue: String(current.durationMinutes),
    });
  }
  if (next.status !== current.status) {
    entries.push({
      changedAt: now,
      field: 'status',
      previousValue: current.status,
    });
  }
  if (next.description !== current.description) {
    entries.push({
      changedAt: now,
      field: 'description',
      previousValue: current.description,
    });
  }
  if (next.equipment !== current.equipment) {
    entries.push({
      changedAt: now,
      field: 'equipment',
      previousValue: current.equipment,
    });
  }
  if (next.attentionPoints !== current.attentionPoints) {
    entries.push({
      changedAt: now,
      field: 'attentionPoints',
      previousValue: current.attentionPoints,
    });
  }
  return entries;
}

function formatCalendarDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
