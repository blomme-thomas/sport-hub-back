const PLANNED_STATUS = 'planifiee';

export interface ReconciliationSession {
  id: string;
  date: string;
  disciplineTypeKey: string;
  status: string;
  activityId: string | null;
}

export interface ReconciliationActivity {
  id: string;
  type: string;
  localDate: string;
}

export interface ReconciliationPair {
  sessionId: string;
  activityId: string;
}

/**
 * Propose les rapprochements automatiques entre séances planifiées et activités réalisées.
 * Un couple (jour local, discipline) ne donne un rapprochement que s'il contient exactement une séance candidate et exactement une activité candidate ; sinon le cas reste en attente.
 * Une séance déjà liée, une séance qui n'est pas planifiée et une activité déjà liée (y compris à une autre séance, via `linkedActivityIds`) sont exclues.
 */
export function reconcileSessionsWithActivities(
  sessions: readonly ReconciliationSession[],
  activities: readonly ReconciliationActivity[],
  linkedActivityIds: ReadonlySet<string>,
): ReconciliationPair[] {
  const sessionsByKey = new Map<string, ReconciliationSession[]>();
  for (const session of sessions) {
    if (session.status !== PLANNED_STATUS || session.activityId !== null) {
      continue;
    }
    push(
      sessionsByKey,
      keyOf(session.date, session.disciplineTypeKey),
      session,
    );
  }
  const activitiesByKey = new Map<string, ReconciliationActivity[]>();
  for (const activity of activities) {
    if (linkedActivityIds.has(activity.id)) {
      continue;
    }
    push(activitiesByKey, keyOf(activity.localDate, activity.type), activity);
  }

  const pairs: ReconciliationPair[] = [];
  for (const [key, candidateSessions] of sessionsByKey) {
    const candidateActivities = activitiesByKey.get(key) ?? [];
    if (candidateSessions.length === 1 && candidateActivities.length === 1) {
      pairs.push({
        sessionId: candidateSessions[0].id,
        activityId: candidateActivities[0].id,
      });
    }
  }
  return pairs.sort((left, right) =>
    compareText(left.sessionId, right.sessionId),
  );
}

function keyOf(date: string, type: string): string {
  return `${date}|${type}`;
}

function push<T>(map: Map<string, T[]>, key: string, value: T): void {
  const list = map.get(key);
  if (list) {
    list.push(value);
  } else {
    map.set(key, [value]);
  }
}

function compareText(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}
