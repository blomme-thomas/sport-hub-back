# Données

Prisma 7 + PostgreSQL. Quatre modèles : `Activity`, écrit par le module `garmin-sync` (voir la section « Accès depuis garmin-sync » plus bas) et relu par `garmin-sync` et `training-stats` (voir « Lecture pour les statistiques »), `Slot` (table `slots`), propre au module `creneaux` (voir « Modèle Slot » plus bas), `Goal` (table `goals`), propre au module `objectifs` (voir « Modèle Goal » plus bas), et `Discipline` (table `disciplines`), propre au module `disciplines` et alimenté par `garmin-sync` (voir « Modèle Discipline » plus bas). Le module `training-stats` n'a pas de modèle ni de migration qui lui soit propre.

- `prisma/schema.prisma` : générateur `prisma-client`, datasource `postgresql`, modèles `Activity`, `Slot`, `Goal` et `Discipline`.
- `prisma.config.ts` : chemin du schéma, dossier de migrations `prisma/migrations`, URL de connexion lue dans `DATABASE_URL`.
- Client généré dans `src/core/prisma/generated`, ignoré par Git : le régénérer avec `npm run prisma:generate` (nécessaire avant lint, tests et build ; la CI le fait).
- Connexion via l'adaptateur `@prisma/adapter-pg` dans `PrismaService` (`src/core/prisma`), qui vérifie la base au démarrage (voir [ADR 0003](decisions/0003-connexion-base-au-demarrage.md)).

Base locale : voir [Développement](developpement.md).

## Modèle `Activity` (table `activities`)

Activité Garmin synchronisée.

| Champ Prisma | Colonne | Type PostgreSQL | Notes |
|---|---|---|---|
| `id` | `id` | `UUID` | clé primaire, `uuid()` généré par Prisma |
| `garminActivityId` | `garmin_activity_id` | `TEXT` | unique : un doublon est refusé (erreur Prisma `P2002`) |
| `type` | `type` | `TEXT` | libellé de sport libre, pas d'enum |
| `startedAt` | `started_at` | `TIMESTAMPTZ(3)` | |
| `durationSeconds` | `duration_seconds` | `DOUBLE PRECISION` | |
| `distanceMeters` | `distance_meters` | `DOUBLE PRECISION` | nullable |
| `rawPayload` | `raw_payload` | `JSONB` | charge brute Garmin |
| `createdAt` | `created_at` | `TIMESTAMPTZ(3)` | défaut `now()` |
| `updatedAt` | `updated_at` | `TIMESTAMPTZ(3)` | maintenu par Prisma (`@updatedAt`), sans défaut SQL |

Index : unique sur `garmin_activity_id`, `started_at`, et `(type, started_at)`.

Choix : `garminActivityId` en texte (identifiants Garmin plus grands qu'un int32) ; `type` en texte pour éviter une migration à chaque nouveau sport. Ces champs peuvent encore évoluer par migration additive ; le format des activités Garmin n'est pas vérifié (voir [Contexte garmin-sync](contextes/garmin-sync.md)).

Couvert par `test/activity-persistence.e2e-spec.ts` (création, relecture, doublon `P2002`, distance nulle), qui utilise directement `PrismaService`.

## Modèle `Slot` (table `slots`)

Créneau de disponibilité saisi par l'utilisateur (module `creneaux`, voir [Contexte creneaux](contextes/creneaux.md)). Les occurrences ne sont pas stockées : elles sont calculées à la lecture.

| Champ Prisma | Colonne | Type PostgreSQL | Notes |
|---|---|---|---|
| `id` | `id` | `UUID` | clé primaire ; le Domain génère l'identifiant (`SlotId`, `randomUUID`) et l'envoie à l'écriture, le `uuid()` Prisma n'intervient pas |
| `type` | `type` | `TEXT` | `libre` ou `occupe` ; validé par le Domain, sans contrainte SQL |
| `date` | `date` | `DATE` | jour calendaire (ponctuel) ou date d'ancrage (hebdomadaire) ; relu à minuit UTC |
| `startMinute` | `start_minute` | `INTEGER` | minutes depuis minuit, de 0 à 1439 |
| `endMinute` | `end_minute` | `INTEGER` | minutes depuis minuit, de 0 à 1439 |
| `recurrence` | `recurrence` | `TEXT`, défaut `'aucune'` | `aucune` ou `hebdomadaire` ; validé par le Domain |
| `timeZone` | `time_zone` | `TEXT` | fuseau IANA, métadonnée informative (défaut `Europe/Paris` côté use case) |
| `createdAt` | `created_at` | `TIMESTAMPTZ(3)` | défaut `now()` |
| `updatedAt` | `updated_at` | `TIMESTAMPTZ(3)` | maintenu par Prisma (`@updatedAt`), sans défaut SQL |

- Contrainte `slots_minutes_check` : `start_minute >= 0`, `end_minute <= 1439` et `end_minute > start_minute`. Ajoutée à la main dans la migration, comme prévu au plan ; `schema.prisma` ne la déclare pas.
- Index : `slots_date_idx` sur `date`, `slots_recurrence_date_idx` sur `(recurrence, date)`.
- Heures stockées en minutes : `LocalTime` convertit depuis et vers `HH:mm`. Pas de conversion de fuseau (voir [ADR 0009](decisions/0009-creneaux-heure-murale-locale.md)).

Accès depuis creneaux : port `ISlotRepository` (`src/modules/creneaux/domain/ports/outbound/slot.repository.port.ts`), implémenté par `PrismaSlotRepositoryAdapter` (`infrastructure/persistence/prisma/`), mapping par `SlotMapper`.

- `findById(id)` : `findUnique`, `null` si absent.
- `findIntersecting(period)` : `findMany` avec `OR` : (`recurrence = 'aucune'` et `date` entre `from` et `to`) ou (`recurrence = 'hebdomadaire'` et `date <= to`). Le filtrage des occurrences se fait ensuite dans le Domain.
- `save(slot)` : upsert sur `id`, avec les mêmes données en création et en mise à jour.
- `delete(id)` : `deleteMany` sur `id`, sans erreur si l'identifiant n'existe pas.

Couvert par `test/slot-repository.e2e-spec.ts` (voir le contexte pour le détail).

## Modèle `Goal` (table `goals`)

Objectif sportif saisi par l'utilisateur (module `objectifs`, voir [Contexte objectifs](contextes/objectifs.md)). Un seul modèle pour les trois types d'objectif : les champs propres à l'événement sont nullables.

| Champ Prisma | Colonne | Type PostgreSQL | Notes |
|---|---|---|---|
| `id` | `id` | `UUID` | clé primaire ; le Domain génère l'identifiant (`GoalId`, `randomUUID`) et l'envoie à l'écriture, le `uuid()` Prisma n'intervient pas |
| `title` | `title` | `TEXT` | non vide après trim, 200 caractères au plus ; contrôlé par le Domain, sans contrainte SQL |
| `type` | `type` | `TEXT` | `evenement`, `volume` ou `regularite` ; validé par le Domain, contrainte SQL seulement sur les champs d'événement |
| `targetDate` | `target_date` | `DATE` | nullable : date cible au format `YYYY-MM-DD`, sans heure ; relue à minuit UTC |
| `eventFormat` | `event_format` | `TEXT`, nullable | `sprint`, `olympique`, `half`, `full` ou `autre` ; réservé au type `evenement` |
| `targetTimeSeconds` | `target_time_seconds` | `INTEGER`, nullable | temps cible en secondes ; réservé au type `evenement` |
| `createdAt` | `created_at` | `TIMESTAMPTZ(3)` | défaut `now()` |
| `updatedAt` | `updated_at` | `TIMESTAMPTZ(3)` | maintenu par Prisma (`@updatedAt`), sans défaut SQL |

- Contrainte `goals_target_time_check` : `target_time_seconds IS NULL OR target_time_seconds > 0`.
- Contrainte `goals_event_fields_check` : `type = 'evenement' OR (event_format IS NULL AND target_time_seconds IS NULL)`. Ces deux contraintes ont été ajoutées à la main dans la migration, comme prévu au plan ; `schema.prisma` ne les déclare pas.
- Index : `goals_target_date_idx` sur `target_date`.
- Choix : une table, colonnes nullables, pas d'agrégat `Event` séparé.

Accès depuis objectifs : port `IGoalRepository` (`src/modules/objectifs/domain/ports/outbound/goal.repository.port.ts`), implémenté par `PrismaGoalRepositoryAdapter` (`infrastructure/persistence/prisma/`), mapping par `GoalMapper`.

- `findById(id)` : `findUnique`, `null` si absent.
- `findAll({ upcomingFrom })` : `findMany`, avec `targetDate >= upcomingFrom` si le filtre est présent (un objectif sans date n'est alors jamais renvoyé) ; tri `targetDate asc` avec les valeurs nulles en dernier, puis `createdAt asc`, puis `id asc`.
- `save(goal)` : upsert sur `id`, avec les mêmes données en création et en mise à jour.
- `delete(id)` : `deleteMany` sur `id`, sans erreur si l'identifiant n'existe pas.

Couvert par `test/goal-repository.e2e-spec.ts` (voir le contexte pour le détail).

## Modèle `Discipline` (table `disciplines`)

Référentiel des types d'activité Garmin, avec le libellé donné par l'utilisateur (module `disciplines`, voir [Contexte disciplines](contextes/disciplines.md)).

| Champ Prisma | Colonne | Type PostgreSQL | Notes |
|---|---|---|---|
| `id` | `id` | `UUID` | clé primaire ; `uuid()` généré par Prisma |
| `typeKey` | `type_key` | `TEXT` | unique (`disciplines_type_key_key`) ; clé de type Garmin, sans espace en bordure |
| `label` | `label` | `TEXT` | libellé affiché ; égal à la clé à la création, jamais écrasé par la synchronisation |
| `firstSeenAt` | `first_seen_at` | `TIMESTAMPTZ(3)` | instant de la première synchronisation ayant reçu ce type (pas la date de l'activité) |
| `lastSeenAt` | `last_seen_at` | `TIMESTAMPTZ(3)` | instant de la dernière synchronisation ayant reçu ce type ; ne recule jamais |
| `createdAt` | `created_at` | `TIMESTAMPTZ(3)` | défaut `now()` |
| `updatedAt` | `updated_at` | `TIMESTAMPTZ(3)` | maintenu par Prisma (`@updatedAt`), sans défaut SQL |

- Pas de contrainte SQL autre que la clé primaire et l'unicité de `type_key` : les bornes (1 à 100 caractères pour la clé, 1 à 60 pour un libellé saisi) sont contrôlées par le Domain.

### Backfill à la migration

La migration `20261107235900_add_disciplines` crée la table, puis insère une discipline par type déjà présent dans `activities` :

- clé : `DISTINCT` sur `activities.type` après retrait des espaces en bordure (`regexp_replace` avec `^\s+|\s+$`), clés vides exclues ;
- `label` = la clé ; `id` = `gen_random_uuid()` ;
- `firstSeenAt` = `lastSeenAt` = `CURRENT_TIMESTAMP`, c'est-à-dire l'instant d'exécution de la migration, et non la date des activités. Choix assumé, voir [ADR 0010](decisions/0010-referentiel-disciplines-acl-dates-de-synchronisation.md) ;
- aucune contrainte de longueur de 100 caractères n'est appliquée au backfill, contrairement au Domain : un type de plus de 100 caractères déjà présent rendrait la lecture de la liste en erreur (voir [Contexte disciplines](contextes/disciplines.md#limites-connues)). Non vérifié sur des données réelles ;
- l'alignement sur `String.prototype.trim()` n'est pas garanti : le backfill utilise `\s` de PostgreSQL.

Le backfill ne s'exécute qu'une fois, à l'application de la migration. Les types apparus ensuite sont enregistrés par la synchronisation (voir [garmin-sync](contextes/garmin-sync.md#flux-de-synchronisation)).

Accès depuis disciplines : port `IDisciplineRepository` (`src/modules/disciplines/domain/ports/outbound/discipline.repository.port.ts`), implémenté par `PrismaDisciplineRepositoryAdapter` (`infrastructure/persistence/prisma/`), mapping par `DisciplineMapper`.

- `findAll()` : tri `label asc`, puis `typeKey asc`.
- `findByTypeKey(key)` : `findUnique` sur `typeKey`, `null` si absent.
- `findByTypeKeys(keys)` : `findMany` avec `typeKey in (...)` ; liste vide sans requête.
- `saveAppearances(disciplines)` : une `$transaction` regroupant un `createMany` (`skipDuplicates`) pour les nouvelles et un `updateMany` par discipline connue (`lastSeenAt` seulement, si la nouvelle date est postérieure) ; liste vide sans requête. Le `label` n'est jamais écrit.
- `saveLabel(discipline)` : `updateMany` sur `typeKey`, qui écrit `label` (et `updatedAt`).

Couvert par `test/discipline-repository.e2e-spec.ts`.

## Modèles `Session`, `SessionModule` et `SessionChangeLog` (tables `sessions`, `session_modules`, `session_change_logs`)

- `sessions` : `id` (UUID), `date` (DATE), `discipline_type_key` (clé du référentiel, sans clé étrangère), `duration_minutes` (entier strictement positif), `status` (`planifiee`, `realisee`, `manquee` ; contrôle SQL), `modified_manually` (défaut faux), `description`, `equipment`, `attention_points`, `created_at`, `updated_at`. Index sur `date` et sur `(status, date)`.
- `session_modules` : `id`, `session_id` (FK vers `sessions`, suppression en cascade), `position` (au moins 1, unique par séance), `type`, `duration_minutes`, `instruction`, `target_zones` (JSONB, objet ou NULL), `perceived_effort` (1 à 10 ou NULL).
- `session_change_logs` : `id`, `session_id` (FK, suppression en cascade), `changed_at`, `field`, `previous_value`. Index sur `(session_id, changed_at)`.

- `session_activity_links` : `session_id` (clé primaire, FK vers `sessions`, suppression en cascade), `activity_id` (UUID unique, sans clé étrangère vers `activities` : la donnée reste dans `garmin-sync`), `origin` (`automatique` ou `manuel`, contrôle SQL), `linked_at`.

Migrations `20261108120000_create_sessions` et `20261110120000_create_session_activity_links`. Couvert par `test/session-repository.e2e-spec.ts`. Règles métier dans [seances](contextes/seances.md).

## Accès depuis garmin-sync

Port `IActivityRepository` (`src/modules/garmin-sync/domain/ports/outbound/activity.repository.port.ts`), implémenté par `PrismaActivityRepositoryAdapter` (`infrastructure/persistence/prisma/`). Le mapping entre l'entité `Activity` et le modèle Prisma est fait par `ActivityMapper`.

- `findLatestStartedAt()` : `startedAt` le plus récent, `null` si la table est vide.
- `findByGarminActivityIds(ids)` : activités connues parmi les identifiants fournis ; liste vide sans requête si aucun identifiant.
- `save(activities)` : un upsert par activité, sur `garminActivityId`, exécuté dans une seule `$transaction` Prisma : le lot est écrit en entier ou pas du tout. Le `create` et le `update` reçoivent les mêmes données ; `id` et `createdAt` ne sont donc pas modifiés à la mise à jour, et `updatedAt` est mis à jour par Prisma. Liste vide sans requête.
- `rawPayload` reçoit `sourcePayload`, l'objet Garmin tel que reçu. Le Domain le traite comme `unknown`.

Couvert par `test/activity-repository.e2e-spec.ts` (upsert sans doublon, mise à jour sans changement d'`id`, lot mixte, lot rejeté en entier, `findLatestStartedAt`, `findByGarminActivityIds`, aller-retour du mapping, distance nulle).

## Lecture des activités (read model)

`GET /api/activities` lit la table `activities` via le read model `PrismaActivityListReadModel` (`infrastructure/persistence/prisma/activity-list.read-model.ts`), port `IActivityListReadModel`. Aucune migration : les index `started_at` et `(type, started_at)` servent le tri et les filtres.

- Requête : `findMany` avec `select` explicite (`id`, `garminActivityId`, `type`, `startedAt`, `durationSeconds`, `distanceMeters`) et `count` avec le même `where`, dans une `$transaction`, pour un total cohérent avec la page.
- Tri `startedAt desc, id desc` ; `skip`/`take` pour la pagination.
- `rawPayload` n'est jamais lu par cette requête.

Couvert par `test/activities.e2e-spec.ts`.

## Lecture pour les statistiques

`GET /api/stats` lit la table `activities` via le read model `PrismaTrainingActivityReadModel` (`src/modules/training-stats/infrastructure/persistence/prisma/training-activity.read-model.ts`), port `ITrainingActivityReadModel`. Aucun modèle Prisma, aucune migration et aucune table de statistiques : les volumes sont calculés à la demande (voir [ADR 0005](decisions/0005-statistiques-calculees-a-la-volee.md)).

- Requête : `findMany` avec `select` explicite (`type`, `startedAt`, `durationSeconds`, `distanceMeters`), filtre `startedAt >= from AND startedAt < toExclusive` (fenêtre couvrant la période précédant la première période de la plage), et filtre `type` exact si présent ; tri `startedAt asc`.
- `rawPayload` n'est jamais lu par cette requête.
- Les index `started_at` et `(type, started_at)` existent (voir plus haut) ; leur usage effectif par le planner n'est pas vérifié.

Couvert par `test/training-stats.e2e-spec.ts`.

## Migrations

- Dossier `prisma/migrations`, versionné : une migration `20261106105629_create_activities` (création de `activities`), une migration `20261107120000_create_slots` (création de `slots`, avec la contrainte `slots_minutes_check` ajoutée à la main), une migration `20261107221922_create_goals` (création de `goals`, avec les contraintes `goals_target_time_check` et `goals_event_fields_check` ajoutées à la main), une migration `20261107235900_add_disciplines` (création de `disciplines` et backfill depuis `activities`, voir « Backfill à la migration ») et `migration_lock.toml`.
- Les fichiers `migration.sql` sont générés par `prisma migrate dev` et ne sont jamais édités à la main ; un changement de schéma = une nouvelle migration.
- Création / évolution en local : `npm run prisma:migrate` (`migrate dev`).
- Application sans génération (CI, tests, déploiement) : `npm run prisma:migrate:deploy` (`migrate deploy`).
- Remise à zéro de la base de développement : `npm run prisma:migrate:reset` (**efface les données**).
- Tests e2e : le `globalSetup` Vitest (`test/support/global-setup.ts`) lance `npx prisma migrate deploy` sur la base de test avant les tests, avec `DATABASE_URL` posée explicitement depuis `TEST_DATABASE_URL` (`test/support/test-database.ts`) : le `.env` de la machine n'est jamais utilisé.
- CI : le job `e2e` de `ci-develop` exécute `npm run prisma:migrate:deploy` (étape « Migrations », sans condition) avant `test:e2e`.
