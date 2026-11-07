# Données

Prisma 7 + PostgreSQL. Un seul modèle à ce jour : `Activity`, écrit et relu par le module `garmin-sync` (voir la section « Accès depuis garmin-sync » plus bas).

- `prisma/schema.prisma` : générateur `prisma-client`, datasource `postgresql`, modèle `Activity`.
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

## Migrations

- Dossier `prisma/migrations`, versionné : une migration `20261106105629_create_activities` (création de `activities`) et `migration_lock.toml`.
- Les fichiers `migration.sql` sont générés par `prisma migrate dev` et ne sont jamais édités à la main ; un changement de schéma = une nouvelle migration.
- Création / évolution en local : `npm run prisma:migrate` (`migrate dev`).
- Application sans génération (CI, tests, déploiement) : `npm run prisma:migrate:deploy` (`migrate deploy`).
- Remise à zéro de la base de développement : `npm run prisma:migrate:reset` (**efface les données**).
- Tests e2e : le `globalSetup` Vitest (`test/support/global-setup.ts`) lance `npx prisma migrate deploy` sur la base de test avant les tests, avec `DATABASE_URL` posée explicitement depuis `TEST_DATABASE_URL` (`test/support/test-database.ts`) : le `.env` de la machine n'est jamais utilisé.
- CI : le job `e2e` de `ci-develop` exécute `npm run prisma:migrate:deploy` (étape « Migrations », sans condition) avant `test:e2e`.
