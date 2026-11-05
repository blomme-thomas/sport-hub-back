# Architecture

API NestJS (ESM, TypeScript) en architecture hexagonale / DDD. Conventions détaillées : `instructions/11-repository-conventions.instructions.md`.

## État actuel

Seul le socle technique est livré, dans `src/` :

- `main.ts` : démarrage, Swagger (`/swagger`).
- `app.setup.ts` : réglages HTTP partagés avec les tests e2e (logger, préfixe global, CORS, `ValidationPipe` avec `whitelist`, `forbidNonWhitelisted` et `transform`).
- `app.module.ts` : assemble `AppConfigModule`, `PrismaModule` et `HealthModule`.
- `src/core/config` : configuration typée (`@nestjs/config`) validée par zod au démarrage ; sections `app` et `database`.
- `src/core/prisma` : `PrismaService` (client Prisma avec adaptateur `pg`, sans connexion au démarrage) ; client généré dans `generated/`.
- `src/core/health` : route technique `GET /api/health`.

Aucun module métier (`src/modules/`) n'existe encore.

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
- le code de production n'importe ni fichier `.spec.ts`, ni devDependency.

Avertissement seulement : `modules-isolated` (un module n'importe pas l'intérieur d'un autre), le contrat entre modules n'étant pas encore défini. Le client Prisma généré est exclu de l'analyse.

Ces règles ne s'exercent pas encore, faute de modules.

## Bounded contexts
À compléter (aucun module livré).

## Flux entre contextes
À compléter.
