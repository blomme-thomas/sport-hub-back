# Architecture

API NestJS (ESM, TypeScript) en architecture hexagonale / DDD. Conventions détaillées : `instructions/11-repository-conventions.instructions.md`.

## État actuel

Seul le socle technique est livré, dans `src/` :

- `main.ts` : démarrage, Swagger (`/swagger`).
- `swagger.setup.ts` : `buildOpenApiDocument`, construction du document OpenAPI (isolée de `main.ts` pour être testable ; enregistre les modèles d'erreur).
- `app.setup.ts` : réglages HTTP partagés avec les tests e2e (middleware de correlation id en premier, logger, préfixe global, CORS avec `X-Correlation-Id` exposé, `ValidationPipe` avec `whitelist`, `forbidNonWhitelisted`, `transform` et `exceptionFactory`, filtre global d'erreurs).
- `app.module.ts` : assemble `AppConfigModule`, `PrismaModule`, `HealthModule` et `GarminSyncModule`.
- `src/core/config` : configuration typée (`@nestjs/config`) validée par zod au démarrage ; sections `app`, `database` et `garmin` (`GARMIN_PERSONAL_API_KEY` optionnelle, vide = absente ; `GARMIN_PERSONAL_API_BASE_URL`).
- `src/core/prisma` : `PrismaService` (client Prisma avec adaptateur `pg`) : vérifie la base au démarrage (`onModuleInit`) et lève `DatabaseUnavailableError` si elle ne répond pas, voir [ADR 0003](decisions/0003-connexion-base-au-demarrage.md) ; client généré dans `generated/`.
- `src/core/health` : route technique `GET /api/health` (200 si la base répond via `DatabaseHealthIndicator`, sinon 503 `SERVICE_UNAVAILABLE`).
- `src/core/filters` : filtre d'exceptions global `ProblemDetailsExceptionFilter`, table code vers statut HTTP (`error-status.table.ts`), `DependencyUnavailableException` (dépendance technique indisponible, rendue en 503), factory des erreurs de validation, DTO Swagger et décorateur `@ApiProblemResponses()`. Voir [Erreurs de l'API](erreurs-api.md).
- `src/core/middlewares` : middleware d'identifiant de corrélation et son `AsyncLocalStorage`.
- `src/core/http` : client HTTP sortant commun (`HttpClientModule` exporte `HttpClientService`), non global ; seul consommateur à ce jour : `GarminSyncModule`. Détail ci-dessous.
- `src/shared/domain/domain-error.ts` : classe abstraite `DomainError` (base des Business Errors, `code` stable, sans dépendance NestJS ni HTTP). Seul fichier de `src/shared` à ce jour.

Un seul module existe dans `src/modules/` : `garmin-sync`, réduit à ce jour à la couche Infrastructure. `GarminSyncModule` importe `HttpClientModule` et exporte `GarminPersonalApiTokenProvider` (`infrastructure/adapters/`), qui obtient et met en cache le jeton d'accès de l'API Garmin Personal ; erreurs `GarminAuthenticationError`. Détail : [API Garmin Personal](garmin-personal-api.md). Ni Domain, ni Application, ni Presentation, ni synchronisation d'activités n'existent encore.

## Client HTTP sortant (`src/core/http`)

Réservé aux Adapters d'Infrastructure qui appellent un système externe (Garmin, Anthropic). Un adapter importe `HttpClientModule` (de `src/core/http`) et injecte `HttpClientService` ; il n'importe jamais `HttpModule` de `@nestjs/axios`. Le Domain et l'Application ne l'utilisent pas (règle `domain-application-no-http-client` de `deps:check`).

API : `get(target, url, options?)`, `post(target, url, data?, options?)` et `request(target, { method, url, data?, headers?, timeoutMs? })`. `target` est un libellé du système appelé (utilisé dans les logs et l'erreur). Retour : `{ status, data }` pour un statut 2xx.

Comportement (valeurs par défaut `DEFAULT_HTTP_CLIENT_OPTIONS`, injectées via le token `HTTP_CLIENT_DEFAULTS`) :

- timeout de 10 s par tentative, surchargeable par appel (`timeoutMs`) ;
- 2 réessais au plus (3 tentatives), backoff exponentiel sans jitter de 200 ms plafonné à 2 s ;
- réessai uniquement pour les méthodes idempotentes (GET, HEAD, OPTIONS, PUT, DELETE) et pour une erreur réseau, un timeout ou un statut 5xx ; jamais pour POST/PATCH, ni pour un 4xx ;
- `maxRedirects: 0` : les redirections ne sont pas suivies, un 3xx est donc traité comme un statut hors 2xx (`HTTP_STATUS`, sans réessai) ;
- tout statut hors 2xx, timeout ou erreur réseau, après les réessais autorisés, lève `ExternalServiceError(target, failure, attempts, upstreamStatus?)` avec `failure` parmi `TIMEOUT`, `NETWORK`, `HTTP_STATUS`. Le message est fixe (`Le service externe "<target>" est indisponible.`) et l'erreur ne porte aucune `cause` : l'`AxiosError` d'origine contient les en-têtes (dont `Authorization`) et ne doit jamais être propagée ;
- logs `[correlationId] target METHOD origine+chemin -> statut|failure` : ni en-têtes, ni query string, ni identifiants d'URL, ni corps. Le chemin de l'URL est journalisé tel quel : ne pas y placer de secret.

Sécurité : l'URL passée au client ne doit jamais provenir d'une entrée externe (requête utilisateur, donnée renvoyée par un tiers), sous peine de SSRF ; elle est construite par l'adapter à partir d'une base connue.

`ExternalServiceError` n'est pas une `DomainError`. Si un Use Case ou un adapter ne la traduit pas, elle atteint le filtre global et devient un 500 `INTERNAL_ERROR` (voir [Erreurs de l'API](erreurs-api.md)).

## Cible : un module = un Bounded Context

`src/modules/<module>/{domain,application,infrastructure,presentation}`.

Sens des dépendances : `presentation` vers `application` vers `domain`, `infrastructure` vers `domain` (les couches externes dépendent des internes, jamais l'inverse). `src/core` (et `src/shared` s'il est créé) est transverse et ne dépend pas des modules.

## Garde-fou : `npm run deps:check`

dependency-cruiser (`.dependency-cruiser.cjs`) vérifie ces règles sur `src/`, en CI (`ci-branch`). Erreurs :

- pas de dépendance circulaire ;
- le Domain n'importe ni Application, ni Infrastructure, ni Presentation ;
- le Domain n'importe ni NestJS, ni client/ORM (pg, express, axios, class-validator, class-transformer, Prisma, Anthropic, garmin-connect, `src/core/prisma`) ;
- l'Application n'importe ni Infrastructure, ni Presentation, ni client/ORM (`@nestjs/common` reste autorisé) ;
- la Presentation n'importe pas l'Infrastructure ; l'Infrastructure n'importe pas la Presentation ;
- `src/shared` et `src/core` n'importent pas les modules ;
- le Domain et l'Application n'importent pas `src/core/http` (`domain-application-no-http-client`) ;
- le code de production n'importe ni fichier `.spec.ts`, ni devDependency.

Avertissement seulement : `modules-isolated` (un module n'importe pas l'intérieur d'un autre), le contrat entre modules n'étant pas encore défini. Le client Prisma généré est exclu de l'analyse.

Ces règles s'exercent à ce jour sur le seul module `garmin-sync` (Infrastructure uniquement).

## Bounded contexts
`garmin-sync` : en cours (authentification seulement). Fiche `contextes/garmin-sync.md` : à compléter.

## Flux entre contextes
À compléter.
