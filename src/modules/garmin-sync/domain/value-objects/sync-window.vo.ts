const OVERLAP_MS = 7 * 24 * 60 * 60 * 1000;

export class SyncWindow {
  private constructor(readonly since: Date | null) {}

  /**
   * Détermine le début de la fenêtre de synchronisation : sept jours avant la dernière activité connue,
   * pour rattraper les modifications récentes côté Garmin. Sans activité connue, il n'y a pas de borne.
   */
  static resumingFrom(latestStartedAt: Date | null): SyncWindow {
    if (latestStartedAt === null) {
      return new SyncWindow(null);
    }
    return new SyncWindow(new Date(latestStartedAt.getTime() - OVERLAP_MS));
  }
}
