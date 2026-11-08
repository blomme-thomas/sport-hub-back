# Contexte training-stats

Bounded Context des statistiques d'entraînement : volume de séances (nombre, durée, distance) par semaine ISO ou par mois, total et par type, avec la période précédente et la variation. Code : `src/modules/training-stats/`. Usage mono-utilisateur.

Périmètre livré : `GET /api/stats` (issue #11) et `GET /api/stats/dashboard` (issue #50, voir [Tableau de bord](#tableau-de-bord)). Consommateur livré : le module `workout-generation` (story #12) lit les volumes par semaine via `GetTrainingStatsUseCase`, par son adapter ACL (voir [Contexte workout-generation](workout-generation.md)). Hors périmètre : métriques physiologiques (VO2max, TSS), graphiques, prédictions.

## Rôle

Calculer, à la demande, les statistiques de volume des périodes d'une plage de dates, à partir des activités de la table `activities`. Aucune statistique n'est stockée : il n'y a ni modèle Prisma ni migration pour ce module (voir [ADR 0005](../decisions/0005-statistiques-calculees-a-la-volee.md)).

Les règles de période, de volume et de variation sont décrites dans le parcours [Consulter les statistiques d'entraînement](../../fonctionnel/parcours/consulter-statistiques.md) et dans le glossaire.

## Structure

| Couche | Fichier | Rôle |
|---|---|---|
| Domain | `domain/value-objects/stats-granularity.vo.ts` | Type `StatsGranularity` (`'week' \| 'month'`) et garde `isStatsGranularity` |
| Domain | `domain/value-objects/stats-period.vo.ts` | `StatsPeriod` : période contenant un instant (`containing`), `previous()`, `next()`, `start`, `end` (exclusif en calcul), `contains`, `equals`, `key` |
| Domain | `domain/value-objects/stats-range.vo.ts` | `StatsRange.create({ from, to, granularity })` : périodes complètes de la plage, `periods()`, `queryWindow()` |
| Domain | `domain/value-objects/activity-volume.vo.ts` | `ActivityVolume` : `count`, `durationSeconds`, `distanceMeters` ; `ZERO`, `of`, `plus` |
| Domain | `domain/value-objects/volume-variation.vo.ts` | `VolumeVariation.between(current, previous)` : `absolute` et `percent` par mesure |
| Domain | `domain/errors/invalid-stats-range.error.ts` | `InvalidStatsRangeError` (`STATS_RANGE_INVALID`) |
| Domain | `domain/errors/stats-range-too-large.error.ts` | `StatsRangeTooLargeError` (`STATS_RANGE_TOO_LARGE`) |
| Domain | `domain/services/training-stats-calculator.service.ts` | `TrainingStatsCalculator.compute(range, facts, typeFilter)` : calcul pur des périodes |
| Domain | `domain/ports/outbound/training-activity.read-model.port.ts` | `ITrainingActivityReadModel` (token `TRAINING_ACTIVITY_READ_MODEL`), types `TrainingActivityFact` et `TrainingActivityWindow` |
| Application | `application/use-cases/get-training-stats.use-case.ts` | `GetTrainingStatsUseCase.execute(query)` : plage, lecture, calcul, DTO |
| Application | `application/dtos/training-stats.dto.ts` | `TrainingStatsQuery`, `TrainingStatsDto`, `PeriodStatsDto` et DTO associés |
| Infrastructure | `infrastructure/persistence/prisma/training-activity.read-model.ts` | `PrismaTrainingActivityReadModel` : lecture de la table `activities` |
| Presentation | `presentation/http/controllers/training-stats.controller.ts` | `GET /api/stats` (`TrainingStatsController`) |
| Presentation | `presentation/http/dtos/get-training-stats.request.dto.ts` | Paramètres de requête validés (class-validator) |
| Presentation | `presentation/http/dtos/training-stats.response.dto.ts` | Transport DTO de la réponse, annoté pour Swagger |
| Composition | `training-stats.module.ts` | Câblage du use case, du calculateur, du read model et du contrôleur |

Les tests unitaires sont colocalisés (`*.spec.ts`) ; le test e2e est `test/training-stats.e2e-spec.ts`.

## Ports publics

**`GetTrainingStatsUseCase.execute(query: TrainingStatsQuery): Promise<TrainingStatsDto>`** : exporté par `TrainingStatsModule`, c'est le point d'entrée pour les consommateurs du module (la route HTTP, et le module `workout-generation`, via son adapter `TrainingStatsContextAdapter`). Lève `InvalidStatsRangeError` si `from` est postérieur à `to`, `StatsRangeTooLargeError` si la plage dépasse 104 périodes. Le DTO applicatif `TrainingStatsDto` est un contrat : il ne se renomme pas.

**`ITrainingActivityReadModel.findFacts(window: TrainingActivityWindow): Promise<TrainingActivityFact[]>`** (token `TRAINING_ACTIVITY_READ_MODEL`) : faits d'activités (`type`, `startedAt`, `durationSeconds`, `distanceMeters`) dont la date de début est dans `[from, toExclusive)`, filtrés sur `type` si la fenêtre en porte un. Le port ne connaît ni Prisma ni `Activity` (l'Entity de `garmin-sync`).

## Lecture et calcul

1. `StatsRange.create` construit les périodes complètes qui contiennent `from` et `to` (semaine ISO ou mois calendaire, UTC) et refuse une plage inversée ou de plus de 104 périodes.
2. `queryWindow()` donne la fenêtre de lecture : du début de la période précédant la première jusqu'à la fin (exclusive) de la dernière.
3. `findFacts` lit les activités de cette fenêtre, avec le filtre `type` si présent. Le read model ne sélectionne que les quatre champs ci-dessus ; `rawPayload` n'est jamais lu.
4. `TrainingStatsCalculator.compute` applique le même filtre `type` en mémoire, puis, pour chaque période : totaux et ventilation par type (triée par type), période précédente, variation des totaux et par type. Une période vide donne des zéros et `byType` vide.
5. Le use case convertit le résultat en DTO : `end` est inclusif (`fin exclusive - 1 ms`, soit `23:59:59.999Z`).

Le calcul est dans le Domain : `TrainingStatsCalculator` et les value objects n'importent ni Prisma ni NestJS (règle `deps:check`). Le calculateur est fourni au use case par `useValue: new TrainingStatsCalculator()`.

## Règles et invariants

- Semaine ISO : du lundi 00:00:00.000 UTC au dimanche 23:59:59.999 UTC ; mois : calendaire UTC. Une période est toujours complète.
- `from` et `to` (dates `YYYY-MM-DD`, interprétées à 00:00:00.000 UTC) sélectionnent les périodes qui les contiennent et celles qui sont entre elles. Les dates `from` et `to` de la réponse reprennent les dates demandées : elles ne sont pas étendues.
- Une activité compte dans la période qui contient sa date de début (`startedAt`, borne de début incluse, de fin exclue en calcul).
- Une distance absente (`null`) compte pour zéro mètre ; l'activité reste comptée en séance et en durée.
- Variation : `absolute = courant - précédent` ; `percent = absolute / précédent * 100`, arrondi à une décimale, `null` si la période précédente vaut zéro.
- Période précédente : même granularité, immédiatement avant (passage d'année géré).
- Plage : 104 périodes au maximum.
- `type` : texte libre, comparaison exacte et sensible à la casse ; espaces en bordure retirés à la validation.

## Route

`GET /api/stats?granularity=week|month&from=YYYY-MM-DD&to=YYYY-MM-DD[&type=...]`. Pas de valeurs par défaut.

| Statut | Code | Cas |
|---|---|---|
| 200 | | Périodes renvoyées (une période sans activité a des zéros) |
| 400 | `VALIDATION_FAILED` | `granularity` hors `week`/`month` (`IS_IN`), `from`/`to` absents, mal formés ou non réels (`IS_CALENDAR_DATE`), `to` antérieur à `from` (`IS_NOT_BEFORE_FROM`), `type` vide ou de plus de 64 caractères, paramètre inconnu (`PROPERTY_NOT_ALLOWED`) |
| 400 | `STATS_RANGE_TOO_LARGE` | plage de plus de 104 périodes |
| 400 | `STATS_RANGE_INVALID` | filet du Domain pour une plage inversée ; la validation du transport couvre déjà ce cas, il ne devrait pas être atteint |

Les codes `STATS_RANGE_INVALID` et `STATS_RANGE_TOO_LARGE` sont déclarés dans `DOMAIN_ERROR_STATUS` (`src/core/filters/error-status.table.ts`) avec le statut 400. Voir [Erreurs de l'API](../erreurs-api.md#codes-du-module-training-stats).

## Tableau de bord

`GET /api/stats/dashboard?period=7d|30d|3m|1y` (issue #50) renvoie les indicateurs d'une période glissante qui se termine aujourd'hui (UTC), avec la même durée juste avant pour la variation. Code : `GetDashboardStatsUseCase`, `DashboardStatsCalculator` (pur, sans I/O), `DashboardPeriodWindow` (fenêtres). Port : `findDashboardFacts`, qui renvoie `type`, `startedAt`, `durationSeconds` et les indicateurs de la table `activities` (calories, dénivelé, FC moyenne, cinq zones).

- Fenêtres : la courante va de `from` (inclus) jusqu'au lendemain de aujourd'hui (exclu). `7d` et `30d` reculent de jours, `3m` et `1y` de mois calendaires ; le jour est ramené au dernier jour du mois cible s'il n'existe pas (30 mars moins un mois donne le 28 ou 29 février).
- Absent ≠ zéro : sommes (calories, dénivelé) et moyenne (FC) ne portent que sur les activités qui renseignent la valeur ; `null` si aucune ne la renseigne. Une zone cardiaque est sommée de la même façon.
- Répartition par sport : une entrée par `type`, triée par type.
- Série journalière : une entrée par jour de la période, jours vides compris.
- Variation : calculée sur la durée totale. `unknown` si la période précédente n'a aucune séance (`percent` à `null`) ; sinon `up`, `down` ou `flat`, avec `percent` arrondi à une décimale.
- Hypothèse : l'unité des zones cardiaques est supposée en secondes, non confirmée par la spec Garmin.
- Le tableau de bord ne lit que les activités de `garmin-sync` ; les activités enfants sont exclues à la synchronisation (`excludeChildren`).

Validation : `period` obligatoire, parmi les quatre valeurs, sinon `400 VALIDATION_FAILED`. Couvert par les tests unitaires du calculateur et des fenêtres. Pas encore de test e2e sur cette route.

## Limites connues

- **UTC** : une séance proche de minuit local peut changer de jour, de semaine ou de mois.
- **Période en cours** : la période courante est comparée à la précédente complète ; une période non terminée a donc une variation négative mécanique. Hors périmètre.
- **Calcul à la volée** : chaque requête relit les activités de la fenêtre. Pas de cache ni de projection (voir [ADR 0005](../decisions/0005-statistiques-calculees-a-la-volee.md)).
- **Couplage de lecture** : le read model dépend de la table `activities` et de ses colonnes, sans passer par `garmin-sync`.
- **Type** : texte libre, sensible à la casse, comme `GET /api/activities`.
- **Métriques** : volume uniquement (`count`, `durationSeconds`, `distanceMeters`).

## Tests

- Unitaires (colocalisés) : `StatsGranularity`, `StatsPeriod`, `StatsRange`, `ActivityVolume`, `VolumeVariation`, `TrainingStatsCalculator`, `GetTrainingStatsUseCase` (read model simulé), `TrainingStatsController`, `GetTrainingStatsRequestDto`.
- e2e (`test/training-stats.e2e-spec.ts`) : totaux, ventilation, période précédente et variation par semaine ; mois avec changement d'année et activité à `2026-12-31T23:59:59.999Z` ; période vide ; filtre de type (y compris sensible à la casse) ; distance absente ; charge brute jamais renvoyée ; validations par champ ; plage de plus de 104 périodes.
- `test/openapi.e2e-spec.ts` vérifie que `GET /api/stats` documente ses paramètres et son 400.
