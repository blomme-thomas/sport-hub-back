# Glossaire

Langage commun du domaine. Les termes DDD/hexagonaux (Aggregate, Port, Adapter, etc.) sont définis dans `instructions/00-glossary-and-artifacts.instructions.md`. Les termes ci-dessous sont ceux du code livré ; le vocabulaire de la génération de séances reste à compléter.

| Terme | Définition | Dans le code |
|---|---|---|
| Activité | Séance d'activité physique enregistrée par Garmin et copiée dans la base locale. Porte un identifiant Garmin, un type, une date de début, une durée, une distance facultative et le contenu source Garmin. | Entity `Activity` (`garmin-sync`), table `activities` |
| Type d'activité | Libellé du sport tel que Garmin le renvoie (`typeKey`). Texte libre, sans liste fermée. | `Activity.type` |
| Identifiant Garmin | Identifiant de l'activité côté Garmin. Sert de clé d'idempotence : une même activité Garmin n'existe qu'une fois en base. Distinct de l'identifiant interne (UUID). | Value Object `GarminActivityId` |
| Synchronisation | Import dans la base des activités Garmin nouvelles ou modifiées. Déclenchée à la main pour l'instant, rejouable sans doublon. | Use case `SyncGarminActivities` |
| Dernière activité connue | Activité enregistrée dont la date de début est la plus récente. Point de reprise de la synchronisation. | `findLatestStartedAt()` |
| Fenêtre de recouvrement | Période relue à chaque synchronisation : elle commence 7 jours avant la dernière activité connue, pour rattraper les modifications récentes côté Garmin. Sans activité connue, il n'y a pas de borne et l'historique remonte à 365 jours. | Value Object `SyncWindow` |
| Activité créée | Activité Garmin dont l'identifiant n'est pas encore en base. Compteur `created`. | Résultat de la synchronisation |
| Activité mise à jour | Activité déjà en base, dont le contenu Garmin a changé. Compteur `updated`. | Résultat de la synchronisation |
| Activité ignorée | Activité déjà en base, dont le contenu est identique. Elle n'est pas réécrite. Compteur `ignored`. | Résultat de la synchronisation |
| Activité invalide | Activité Garmin dont le format ou les valeurs ne respectent pas les règles : elle est sautée et journalisée, sans être comptée. | `InvalidActivityError`, adapter Garmin |
| Clé Garmin Personal | Secret créé par l'utilisateur dans Garmin Connect, échangé contre un jeton d'accès. Variable `GARMIN_PERSONAL_API_KEY`. Elle expire (30 jours à 1 an selon le choix de l'utilisateur). | `GarminPersonalApiTokenProvider`, voir [API Garmin Personal](../technique/garmin-personal-api.md) |
| Jeton d'accès Garmin | Jeton valable 24 heures, renouvelé automatiquement 60 secondes avant son expiration. Jamais journalisé ni renvoyé. | `GarminPersonalApiTokenProvider` |
| Accès Garmin refusé | Erreur `GARMIN_ACCESS_DENIED` (502) : clé absente ou refusée, ou jeton refusé. | `GarminAccessDeniedError` |
| Garmin indisponible | Erreur `GARMIN_UNAVAILABLE` (503) : panne, délai dépassé ou réponse inattendue de Garmin. | `GarminUnavailableError` |
| Statistiques d'entraînement | Volume de séances agrégé par période (nombre de séances, durée totale, distance totale), pour l'ensemble des activités ou pour un type, avec la période précédente et la variation. Calculées à la demande depuis les activités synchronisées, rien n'est stocké. | `GET /api/stats`, `GetTrainingStatsUseCase`, `TrainingStatsCalculator` (`training-stats`) |
| Période | Intervalle de temps de calcul, toujours complet : soit une semaine ISO (du lundi 00:00:00.000 UTC au dimanche 23:59:59.999 UTC), soit un mois calendaire UTC. Une activité appartient à une seule période, celle qui contient sa date de début. | Value Object `StatsPeriod` (granularité `week` ou `month`) |
| Plage de périodes | Ensemble des périodes complètes qui intersectent les dates `from` et `to` demandées. Limitée à 104 périodes. | Value Object `StatsRange` ; erreur `STATS_RANGE_TOO_LARGE` |
| Période précédente | Période de même granularité immédiatement antérieure à la période courante (la semaine précédente, ou le mois précédent, y compris au changement d'année). Sert de référence à la variation. | `StatsPeriod.previous()`, champ `previous` de la réponse |
| Volume | Ensemble de trois mesures d'une période : `count` (nombre de séances), `durationSeconds` (somme des durées), `distanceMeters` (somme des distances). Une séance sans distance compte pour zéro mètre, mais reste comptée en nombre et en durée. | Value Object `ActivityVolume` |
| Variation | Écart entre la période courante et la période précédente, pour chaque mesure du volume : `absolute` (courant moins précédent) et `percent` (écart relatif arrondi à une décimale, `null` si la période précédente vaut zéro). | Value Object `VolumeVariation` |
