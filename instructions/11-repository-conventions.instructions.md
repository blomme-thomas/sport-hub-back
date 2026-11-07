---
description: 'Conventions concrètes de sport-hub-back : stack, arborescence par module, nommage, templates de code, spécificités Garmin/IA. Source de vérité citée par tous les autres fichiers (« 11 »).'
applyTo: '**'
---
# Conventions du dépôt (sport-hub-back)

> **Lecture ciblée** (repère une section avec `Grep "^## "` puis `Read` avec offset/limit) : *Stack*, *Arborescence par module*, *Nommage*, *Ports et tokens* et *Templates de code* pour écrire du code ; *Tests* pour les tests ; *Commandes cibles* pour lint/build/audit ; *Configuration* pour les variables d'environnement ; *Commentaires et TSDoc* pour la documentation du code ; *Spécificités du domaine* (Garmin, IA) **uniquement si la story touche Garmin ou la génération par IA**.

> **Trois modules métier : `garmin-sync`, `training-stats` et `workout-generation`.** Le dépôt contient le socle technique : NestJS, configuration validée, Prisma (modèle `Activity` et première migration), route `/api/health`, format d'erreur uniforme RFC 9457 (filtre global, correlation id, `DomainError`), tests, CI et garde-fou d'architecture. Le module `src/modules/garmin-sync/` (authentification Garmin, synchronisation manuelle des activités et consultation paginée `GET /api/activities`, quatre couches) et le module `src/modules/training-stats/` (statistiques de volume via `GET /api/stats`, lecture de la table `activities` sans import de `garmin-sync`) et le module `src/modules/workout-generation/` (génération de séance par Claude, `POST /api/workouts/generate`, sans persistance, ACL vers `training-stats`) suivent l'arborescence par module ci-dessous. Dès que le code réel diverge d'un point précis, **mettre à jour ce fichier** pour refléter l'existant (cf. `10` §Contradictions) plutôt que de laisser `11` mentir.

## Stack

- NestJS (TypeScript) — monolithe modulaire, un module Nest = un Bounded Context.
- Persistance : Prisma + PostgreSQL.
- Cache : Redis, **optionnel**, introduit seulement sur besoin réel (`06`).
- IA : Claude (Anthropic SDK, `@anthropic-ai/sdk`) pour la génération de séances d'entraînement.
- Source de données externe : Garmin Connect (sync des activités).
- Tests : Vitest (+ supertest pour les e2e).
- Qualité : oxlint (lint typé), Prettier (format), `dependency-cruiser` (règles de couches, `npm run deps:check`).
- Modules ES (`"type": "module"`, TypeScript `nodenext`) : les imports relatifs s'écrivent **avec l'extension `.js`** (ex. `import { X } from './x.js'`), même si le fichier source est en `.ts`.
- Configuration : `@nestjs/config` avec validation par **zod** (voir §Configuration).
- Authentification : **aucune** — usage strictement local, un seul utilisateur (cf. `08`).

## Arborescence par module

```
src/modules/<module>/
  domain/
    entities/<name>.entity.ts                 # Entity *ou* Aggregate Root (Aggregate Root = Entity qui étend AggregateRoot)
    value-objects/<name>.vo.ts
    events/<name>.event.ts                    # Domain Event, participe passé
    errors/<name>.error.ts                    # Business Error, étend shared DomainError
    services/<name>.service.ts                # Domain Service — dernier recours (cf. 02)
    specifications/<name>.specification.ts    # Specification/Policy — si réutilisée/composée
    factories/<name>.factory.ts               # Factory — seulement si extraite d'une Entity
    ports/
      outbound/<name>.repository.port.ts      # interface I<Name>Repository + token Symbol
      outbound/<name>.port.ts                 # ex: garmin-connect-client.port.ts, workout-ai-generator.port.ts
  application/
    use-cases/<verb-noun>.use-case.ts         # @Injectable(), execute(...), injecte les Ports
    dtos/<name>.dto.ts                        # Application DTO (pas de class-validator ici)
  infrastructure/
    persistence/prisma/<name>.repository.adapter.ts  # implements I<Name>Repository, injecte PrismaService
    persistence/prisma/<name>.mapper.ts               # Domain Entity <-> modèle Prisma
    adapters/<name>.adapter.ts                 # ex: garmin-connect.adapter.ts, claude-workout-generator.adapter.ts
    mappers/<name>.external-mapper.ts          # Traduction modèle externe <-> domaine, toujours présent pour un Adapter externe (voir 08)
    scheduler/<name>.scheduler.ts              # Inbound Adapter planifié (@nestjs/schedule)
  presentation/
    http/controllers/<name>.controller.ts
    http/mappers/<name>.http-mapper.ts         # Application DTO <-> Transport DTO (toujours présent, voir 08)
    http/dtos/<name>.request.dto.ts
    http/dtos/<name>.response.dto.ts           # Transport DTOs (class-validator + class-transformer)
  <module>.module.ts                           # composition root : { provide: TOKEN, useClass: Adapter }
```

Transversal (hors modules) :
- `src/core/` : infrastructure partagée, à plat (pas de sous-dossier `domain`/`infrastructure` imbriqué) — `src/core/config/` (`AppConfigModule`, un namespace par domaine ; voir §Configuration), `src/core/health/` (route `GET /health`, soit `/api/health` avec le préfixe global), `src/core/prisma/` (`PrismaModule`/`PrismaService`, client généré dans `src/core/prisma/generated`, ignoré par Git), `src/core/cache/` (`CacheModule` Redis, optionnel), `src/core/http/` (client HTTP sortant `HttpClientService` : timeout, réessais bornés des seules requêtes idempotentes, redirections non suivies, erreurs traduites en `ExternalServiceError` sans `cause` ; les adapters importent `HttpClientModule` de `src/core/http`, **jamais** `HttpModule` de `@nestjs/axios` ; l'URL ne vient jamais d'une entrée externe ; interdit au Domain et à l'Application ; voir `docs/technique/architecture.md`), `src/core/filters/` (filtre d'exceptions global `ProblemDetailsExceptionFilter`, table `code → statut HTTP`, factory des erreurs de validation, DTO Swagger et décorateur `@ApiProblemResponses()`), `src/core/middlewares/` (middleware de correlation id, `AsyncLocalStorage`).
- `src/app.setup.ts` : `configureApp(app)` applique les réglages HTTP communs (préfixe global, middleware de correlation id, `ValidationPipe` avec `exceptionFactory`, filtre global d'erreurs, CORS avec `X-Correlation-Id` exposé, niveaux de log) ; utilisé par `main.ts` **et** par les tests e2e pour qu'ils voient les mêmes routes qu'en production. Swagger est initialisé dans `main.ts` (`/swagger`, hors préfixe) via `buildOpenApiDocument` de `src/swagger.setup.ts`, ce qui rend l'OpenAPI testable.
- `src/shared/domain/` : **classes de base réellement partagées** (du vrai code, pas des templates). Existant : `domain-error.ts` (classe abstraite portant un `code` stable, sans dépendance NestJS ni HTTP). **À créer avec le premier module qui en a besoin** : `aggregate-root.ts` (collecte des Domain Events via `addDomainEvent`/`pullDomainEvents`), `entity.ts` (id + `equals` par identité), `value-object.ts` (`equals` par valeur). Les Entities/Aggregate Roots/Value Objects concrets étendent ces bases.

### Erreurs HTTP

- Toute erreur de l'API est renvoyée au format **RFC 9457 Problem Details** (`application/problem+json`) avec les extensions `code` (stable), `errors[]` (validation) et `correlationId` (aussi dans le header `X-Correlation-Id`). Aucune route ne formate elle-même une erreur HTTP : elle lève une `DomainError`, une `HttpException` ou laisse la validation du DTO échouer, le filtre global traduit.
- Une Business Error étend `DomainError` et déclare `readonly code` (UPPER_SNAKE_CASE, préfixé par le concept métier). Son statut HTTP est déclaré dans la table centralisée `DOMAIN_ERROR_STATUS` (`src/core/filters/error-status.table.ts`) ; un code absent de la table donne un 422 et un warn. Un `code` est un contrat public : il ne se renomme pas.
- Chaque route documente ses erreurs avec `@ApiProblemResponses(...statuts)`.
- Détail, exemples et marche à suivre : `docs/technique/erreurs-api.md`.

Un module Nest n'importe pas le Domain d'un autre module sans passer par un contrat explicite ; le transverse va dans `src/core` ou `src/shared` (cf. `04`).

**Read Models / Projections** (ex. agrégations de stats d'entraînement, lecture divergente de l'écriture) : requête Prisma de lecture directe dans `infrastructure/persistence/prisma/<name>.read-model.ts`, derrière un Outbound Port de lecture `domain/ports/outbound/<name>.read-model.port.ts` (interface `I<Name>ReadModel` + token `Symbol`, comme `06` §Projections), exposée par un Use Case de lecture dédié dans `application/use-cases/` (ex. `get-training-stats.use-case.ts`) qui injecte le port, jamais l'adapter. Cas concret : `IActivityListReadModel` (`ACTIVITY_LIST_READ_MODEL`, `domain/ports/outbound/activity-list.read-model.port.ts`), implémenté par `PrismaActivityListReadModel` (`infrastructure/persistence/prisma/activity-list.read-model.ts`), consommé par `ListActivitiesUseCase` via `@Inject(ACTIVITY_LIST_READ_MODEL)`. **Pas** de dossier `application/queries/` séparé tant que CQRS n'est pas explicitement justifié (`05`) — le Use Case suffit à nommer l'intention de lecture.

## Chaque concept DDD n'est pas forcément un fichier

Le glossaire (`00`) décrit des concepts, pas des fichiers obligatoires (`00` §chapeau). Règle de décision pour ce dépôt :

| Concept | Fichier dédié ? | Règle |
|---|---|---|
| Entity / Aggregate Root | `domain/entities/*.entity.ts` | Toujours un fichier. Aggregate Root = Entity qui étend `AggregateRoot` |
| Value Object | `domain/value-objects/*.vo.ts` | Toujours un fichier |
| Domain Event | `domain/events/*.event.ts` | Toujours un fichier |
| Business Error | `domain/errors/*.error.ts` | Toujours un fichier |
| Domain Service | `domain/services/*.service.ts` | Seulement si la règle n'a pas de propriétaire naturel (dernier recours, `02`) |
| Factory | méthode statique `create()` / `reconstitute()` sur l'Entity | Fichier dédié `domain/factories/*.factory.ts` seulement si la construction est complexe et partagée entre plusieurs classes |
| Specification / Policy | `domain/specifications/*.specification.ts` | Seulement si la règle est réutilisée ou composée ; sinon un simple `if` dans l'Entity suffit |
| Repository (Outbound Port) | `domain/ports/outbound/*.repository.port.ts` | Toujours un fichier, un par Aggregate Root |
| Autre Outbound Port (client externe, IA, horloge, id) | `domain/ports/outbound/*.port.ts` | Toujours un fichier |
| Inbound Port | interface dédiée dans `application/` | Seulement si plusieurs Adapters entrants appellent le même Use Case ou si une vraie substitution est nécessaire ; sinon le Use Case (classe + `execute()`) fait office de contrat (`04` §Pragmatisme) |

## Nommage

| Artefact | Fichier | Classe/Interface |
|---|---|---|
| Entity | `<name>.entity.ts` | `<Name>` (nom métier, pas `<Name>Entity`) |
| Value Object | `<name>.vo.ts` | `<Name>` |
| Domain Event | `<name>.event.ts` | `<ParticipePasse>Event` (ex. `ActivitySyncedEvent`) |
| Business Error | `<name>.error.ts` | `<Name>Error` |
| Domain Service | `<name>.service.ts` | `<Name>` (verbe/nom métier, pas `Manager`/`Helper`) |
| Use Case | `<verb-noun>.use-case.ts` | `<VerbNoun>UseCase` |
| Application DTO | `<name>.dto.ts` | `<Name>Dto` |
| Outbound Port (repository) | `<name>.repository.port.ts` | `I<Name>Repository` + `export const <NAME>_REPOSITORY = Symbol('<NAME>_REPOSITORY')` |
| Outbound Port (autre) | `<name>.port.ts` | `I<Name>` + token `Symbol` associé |
| Repository Adapter | `<name>.repository.adapter.ts` | `Prisma<Name>RepositoryAdapter` |
| Mapper (persistance) | `<name>.mapper.ts` | `<Name>Mapper` (méthodes statiques `toDomain`/`toPersistence`) |
| Mapper (Adapter externe / ACL) | `infrastructure/mappers/<name>.external-mapper.ts` | `<Name>ExternalMapper` (méthodes statiques) — toujours présent pour un Adapter externe, jamais de traduction inline dans l'Adapter |
| Controller | `<name>.controller.ts` | `<Name>Controller` |
| Mapper (présentation HTTP) | `<name>.http-mapper.ts` | `<Name>HttpMapper` (méthodes statiques `toResponse` / `toQuery`) — toujours présent, même pour un endpoint simple |
| Transport DTO | `<name>.request.dto.ts` / `<name>.response.dto.ts` | `<Name>RequestDto` / `<Name>ResponseDto` |

## Ports et tokens

Chaque Outbound Port expose une interface **et** un token d'injection dans le même fichier :

```ts
export interface IActivityRepository { /* ... */ }
export const ACTIVITY_REPOSITORY = Symbol('ACTIVITY_REPOSITORY');
```

Câblage dans `<module>.module.ts` :

```ts
providers: [{ provide: ACTIVITY_REPOSITORY, useClass: PrismaActivityRepositoryAdapter }]
```

Un Use Case injecte via `@Inject(ACTIVITY_REPOSITORY) private readonly activities: IActivityRepository`.

## Templates de code (squelettes)

Pour éviter d'alourdir les fichiers `instructions/*.md` avec de longs blocs de code, chaque artefact a un squelette TypeScript valide (noms d'exemple `Example...`) dans `instructions/templates/`. Ces fichiers sont **exclus du build/lint/test** (`tsconfig.json` : `exclude: ["instructions/templates"]` ; le build, oxlint et Vitest ne couvrent que `src/` et `test/`) : ce sont des gabarits à copier/renommer, pas du code exécuté. Les imports relatifs d'un gabarit copié doivent prendre l'extension `.js`.

| Artefact | Template |
|---|---|
| Entity (non-root) | `instructions/templates/entity.template.ts` |
| Aggregate Root | `instructions/templates/aggregate-root.template.ts` |
| Value Object | `instructions/templates/value-object.template.ts` |
| Domain Event | `instructions/templates/domain-event.template.ts` |
| Domain Service | `instructions/templates/domain-service.template.ts` |
| Specification / Policy | `instructions/templates/specification.template.ts` |
| Business Error | `instructions/templates/domain-error.template.ts` |
| Repository Port | `instructions/templates/outbound-port.template.ts` |
| Autre Outbound Port | `instructions/templates/external-port.template.ts` |
| Use Case | `instructions/templates/use-case.template.ts` |
| Application DTO | `instructions/templates/application-dto.template.ts` |
| Repository Adapter (Prisma) | `instructions/templates/repository-adapter.template.ts` |
| Mapper | `instructions/templates/mapper.template.ts` |
| Controller | `instructions/templates/controller.template.ts` |
| Mapper (présentation HTTP) | `instructions/templates/http-mapper.template.ts` |
| Mapper (Adapter externe / ACL) | `instructions/templates/external-mapper.template.ts` |
| Transport DTO | `instructions/templates/transport-dto.template.ts` |

## Spécificités du domaine

### Synchronisation Garmin Connect
- **Source retenue : l'API Garmin Personal officielle** (accès de l'utilisateur à ses propres données, usage non commercial et mono-utilisateur), appelée en **HTTP direct** depuis l'Adapter : pas de librairie non officielle (elles reposent sur les points d'accès internes de l'application mobile, peuvent casser sans préavis et ne sont pas maintenues).
  - Authentification : la clé (créée par l'utilisateur dans Garmin Connect, durée de vie 30, 90, 180 jours ou 1 an) s'échange contre un jeton d'accès OAuth2 valable 24 h via `POST https://personal.connectapi.garmin.com/personalapitoken-service/personal-api/personal-api-key/token` avec l'en-tête `Authorization: ApiKey <clé>` ; pas de refresh token : l'Adapter redemande un jeton quand il expire.
  - Livraison en **pull uniquement** (pas de webhook) : cohérent avec le scheduler ci-dessous.
  - La clé expire : prévoir de la renouveler à la main avant l'échéance (Garmin envoie un e-mail environ une semaine avant). Variable d'environnement `GARMIN_PERSONAL_API_KEY`, déclarée dans la configuration (section `garmin`, optionnelle : sans clé l'API démarre et `GarminPersonalApiTokenProvider` lève `GarminAuthenticationError` `KEY_MISSING` à la première demande de jeton, voir §Configuration).
  - À vérifier à l'implémentation sur la documentation Garmin (pages `developer.garmin.com/gc-developer-program/personal/`) : quotas, profondeur d'historique, format exact des activités (JSON ou FIT). Non vérifié à la livraison de la story #8 : endpoint, pagination et format des activités sont des hypothèses isolées dans `garmin-connect.adapter.ts` (voir `docs/technique/contextes/garmin-sync.md`).
- Outbound Port `domain/ports/outbound/garmin-connect-client.port.ts` (`IGarminConnectClient`) — contrat exprimé en langage du domaine (`fetchActivitiesSince(since: Date | null): Promise<Activity[]>`, sans `athleteId` : mono-utilisateur), pas en termes de l'API Garmin.
- Adapter `infrastructure/adapters/garmin-connect.adapter.ts` : encapsule la librairie/les appels HTTP Garmin Connect et fait office d'**Anti-Corruption Layer** — traduit le modèle externe vers le modèle du domaine ; le Domain ne voit jamais le payload Garmin brut. La traduction est dans un mapper dédié `infrastructure/mappers/garmin-connect.external-mapper.ts` (voir §Nommage), jamais inline dans l'Adapter.
- Déclenchement : `infrastructure/scheduler/garmin-sync.scheduler.ts` (`@nestjs/schedule`, `@Cron(...)`, non livré : story #9) — un Inbound Adapter comme un autre, sans logique métier, qui appelle un Use Case `SyncGarminActivities`. Le déclenchement manuel livré est le contrôleur `presentation/http/controllers/garmin-sync.controller.ts` (`POST /api/garmin-sync/run`).
- Idempotence : la synchronisation doit pouvoir être rejouée sans dupliquer (upsert par identifiant externe, typé en Value Object `GarminActivityId`).

### Génération de séances par IA (Claude)
- Outbound Port `domain/ports/outbound/workout-ai-generator.port.ts` (`IWorkoutAiGenerator`), ex. `generate(input: GenerateWorkoutInput): Promise<GeneratedWorkout>`.
- Adapter `infrastructure/adapters/claude-workout-generator.adapter.ts` : encapsule `@anthropic-ai/sdk`, construit le prompt (les gabarits de prompt sont un détail technique, ex. `infrastructure/adapters/prompts/`) ; la traduction de la réponse vit dans `infrastructure/mappers/claude-workout-generator.external-mapper.ts`. Le Domain ne connaît ni le SDK ni le format de réponse du modèle.
- Le résultat généré doit être validé par les invariants du Domain avant persistance (passer par la Factory/`create()` de l'Entity concernée) : un contenu généré invalide est rejeté comme n'importe quelle construction invalide, pas fait confiance aveuglément.
- Un échec d'appel au modèle (timeout, erreur API) est une **Technical Error** exposée sous forme de `DomainError` à code public stable (`WORKOUT_GENERATION_UNAVAILABLE`, `WORKOUT_GENERATION_ACCESS_DENIED`, `WORKOUT_GENERATION_INVALID_OUTPUT`), sur le modèle de `GARMIN_*` (ADR 0004 et ADR 0006), et non une Business Error au sens de `00` §5. La classification se fait par `instanceof` sur les classes du SDK, jamais sur le message ; aucune `cause` ni message du SDK n'est transmis.
- Sans `ANTHROPIC_API_KEY`, le provider `ANTHROPIC_CLIENT` vaut `null` : la génération répond 503 `WORKOUT_GENERATION_UNAVAILABLE` sans appel réseau, et l'application démarre quand même. Le client SDK est construit avec `logLevel: 'off'`.
- Les statistiques de contexte passent par l'adapter `TrainingStatsContextAdapter` (ACL) qui appelle `GetTrainingStatsUseCase` ; le Domain du module ne voit pas le DTO de `training-stats` (ADR 0006).

## Authentification

Aucune (cf. décision actée) : l'API est exposée uniquement en local, pas de guard global. Si l'exposition change (accès distant), ce choix devra être révisé explicitement ici et dans `08`.

## Configuration

- Code dans `src/core/config/` : `env.validation.ts` (schémas zod par domaine, `validateEnv`), un fichier `<domaine>/<domaine>.config.ts` par namespace (`registerAs`, clé exportée, type `ConfigType`), `AppConfigModule` (global, charge les namespaces).
- **Toute variable d'environnement est déclarée et validée dans `env.validation.ts`** ; le code lit la configuration typée (`@Inject(<namespace>Config.KEY)`), jamais `process.env` directement.
- La validation a lieu au démarrage et liste toutes les erreurs d'un coup. Les variables de l'application ont des valeurs par défaut ; celles de la base (`DB_NAME`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DATABASE_URL`) sont obligatoires, et `DATABASE_URL` (lue par Prisma) doit correspondre aux variables `DB_*` (vérifié au démarrage, valeurs jamais affichées).
- `DATABASE_URL` est écrite en clair dans `.env` : la CLI Prisma n'étend pas les `${variables}`.
- `.env.template` (versionné, sans secret) doit rester synchronisé avec les schémas ; `.env` est ignoré par Git. Une nouvelle variable = schéma + `.env.template` + (si utile) `vitest.config.e2e.ts`.
- Un nouveau module technique ou métier qui a besoin de configuration ajoute son namespace et le déclare dans `AppConfigModule`. Les clés secrètes (Anthropic, Garmin) sont obligatoires seulement quand le code les utilise, jamais avant (la CI n'a aucun secret).

## Commentaires et TSDoc

- **Aucun commentaire d'explication** : ni `//`, ni `/* */`, ni `#` en YAML/shell (hors shebang), ni code commenté, ni bannière de section, ni référence à un ticket ou à une story. Un pourquoi non évident va dans la TSDoc du symbole ou dans un ADR. Les directives d'outils (`oxlint-disable`, `@ts-expect-error`) ne sont pas des commentaires d'explication et restent permises, sans prose.
- **TSDoc `/** */` en français, uniquement sur les contrats publics** : ports (inbound, outbound, externes), `execute()` des Use Cases, méthodes métier des Aggregates/Entities qui portent un invariant, fonctions et classes exportées de `core/` et `shared/` qui portent un contrat (ex. `safeErrorCode`, `DomainError`, `DatabaseUnavailableError`, `DependencyUnavailableException`).
- **Pas de TSDoc** sur les méthodes privées, getters, constructeurs, contrôleurs, DTO (Swagger les décrit déjà), ni dans les tests.
- **Format** : première ligne = ce que le symbole fait ou garantit (verbe), puis éventuellement le pourquoi ou l'invariant ; `@throws` pour les erreurs métier ; `@param`/`@returns` seulement si le nom et le type ne suffisent pas. Ne répète jamais la signature.
- **Périmètre** : `src/` et `test/` (hors `src/core/prisma/generated/`), `docker-compose.yml`, `.github/workflows/*.yml`, `docker/postgres/init/*.sh` : aucun commentaire. Exemptés : `.env.template` (il documente les variables), `instructions/templates/`, et les `description` des décorateurs Swagger (`@ApiProperty` etc.), qui ne sont pas des commentaires.
- **Squelettes** : les commentaires de `instructions/templates/*.ts` sont pédagogiques et **ne se recopient pas** dans le code copié, sauf la TSDoc d'un contrat public.
- **Code généré** (`src/core/prisma/generated/`) : jamais touché.

## Garde-fou d'architecture

`npm run deps:check` (`dependency-cruiser`, règles dans `.dependency-cruiser.cjs`, exécuté par `ci-branch`) vérifie : pas de cycle ; le Domain ne dépend ni des autres couches ni de NestJS, de client ou d'ORM ; l'Application ne dépend ni de l'Infrastructure, ni de la Presentation, ni de client ou d'ORM (`@nestjs/common` autorisé) ; la Presentation n'appelle pas l'Infrastructure ; `src/core` et `src/shared` ne dépendent pas de `src/modules` ; pas d'import de `devDependencies` en production. L'isolation entre modules est un simple avertissement tant que le contrat entre modules n'est pas défini. Si une règle bloque un cas légitime, la discuter plutôt que la contourner.

## Tests

- Vitest, fichiers `*.spec.ts` **colocalisés** à côté du fichier source (config : `vitest.config.ts`), pas d'arborescence miroir séparée. Les globals Vitest (`describe`, `it`, `expect`) sont activés.
- Tests e2e dans `test/` (fichiers `*.e2e-spec.ts`, config `vitest.config.e2e.ts`, supertest), ciblés sur les parcours critiques. Ils appellent `configureApp` (`src/app.setup.ts`) et ne dépendent pas du `.env` de la machine : l'environnement de test est fixé dans `vitest.config.e2e.ts`, avec la base du service PostgreSQL de la CI.
- Commandes cibles : `npm run test`, `npm run test:watch`, `npm run test:cov`, `npm run test:e2e`.

## Commandes cibles

- Démarrage : `docker compose up -d postgres` (base locale ; identifiants lus dans `.env`), `npm run start:dev`, `npm run build`.
- Qualité : `npm run format:check` (`npm run format` pour corriger), `npm run lint`, `npm run deps:check`, `npm run test`, `npm run test:e2e`, `npm audit --audit-level=high`.
- Prisma : `npm run prisma:generate` (client, à relancer après chaque modification du schéma et après un `npm install` sur un dépôt neuf), `npm run prisma:validate`, `npm run prisma:migrate` (`prisma migrate dev`), `npm run prisma:migrate:deploy` (`prisma migrate deploy` : CI, e2e, production), `npm run prisma:migrate:reset` (efface les données), `npm run prisma:studio`.
- `prisma generate` lit `DATABASE_URL` (via `prisma.config.ts`) même sans se connecter : elle doit être définie dans l'environnement, valeur factice acceptée (c'est ce que fait la CI).

Le schéma Prisma ne contient que le modèle `Activity` (table `activities`, voir `docs/technique/donnees.md`) et une migration versionnée dans `prisma/migrations` : ne pas supposer d'autre table, ne jamais éditer une migration existante (une évolution = une nouvelle migration via `prisma migrate dev`), ne pas utiliser `db push`. Les e2e appliquent les migrations eux-mêmes (`globalSetup`, base `sporthub_test`) ; la CI les applique avant `test:e2e`.
