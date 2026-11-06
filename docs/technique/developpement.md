# Développement

## Prérequis

- Node.js 26 (version fixée dans `.nvmrc`).
- npm.
- Docker (pour la base PostgreSQL locale via `docker-compose.yml`).

## Installation

```
npm ci
cp .env.template .env      # puis ajuster si besoin (.env est ignoré par Git)
docker compose up -d       # démarre PostgreSQL 16
npx prisma generate        # génère le client Prisma (npm run prisma:generate)
```

Le client Prisma généré n'est pas versionné : à régénérer après un clone ou une modification de `prisma/schema.prisma`.

## Lancement local

```
npm run start:dev
```

- API sur `http://localhost:3000`, préfixe global `/api` (valeurs par défaut, configurables).
- Route technique de santé : `GET /api/health` interroge la base (`SELECT 1`). Base joignable : 200 `{ "status": "ok", "checks": { "database": "up" } }`. Base injoignable : 503 Problem Details, `code` `SERVICE_UNAVAILABLE`, `checks.database` = `down` (voir [Erreurs de l'API](erreurs-api.md)).
- Swagger : `/swagger` (hors préfixe `/api`).
- Header `X-Correlation-Id` : présent sur toutes les réponses ; envoyer le sien (`/^[A-Za-z0-9._:-]{1,128}$/`) pour le retrouver dans les logs, sinon un UUID est généré.
- Erreurs : toutes au format `application/problem+json` (RFC 9457), voir [Erreurs de l'API](erreurs-api.md).
- La base est obligatoire au démarrage : `PrismaService.onModuleInit` fait `$connect` puis `SELECT 1` (timeout de connexion 5 s). Si elle ne répond pas, l'application s'arrête avec `Base de données injoignable (<hôte>:<port>/<base>)`, suivi du code d'erreur (ex. `ECONNREFUSED`) quand il est sûr. Ni utilisateur, ni mot de passe, ni URL de connexion dans le message. Voir [ADR 0003](decisions/0003-connexion-base-au-demarrage.md).
- Une configuration invalide (variable manquante ou incorrecte) fait échouer le démarrage avec le détail des erreurs.

## Base de données locale

`docker-compose.yml` définit un service `postgres` (image `postgres:16`, volume `postgres_data`). Utilisateur, mot de passe, nom de base et port hôte viennent des variables `DB_*` du `.env` (le démarrage échoue si l'une manque). Appliquer les migrations sur la base de développement : `npm run prisma:migrate:deploy` (voir [Données](donnees.md)).

## Scripts npm

| Script | Rôle |
|---|---|
| `build` | Compile (`nest build`) |
| `start` / `start:dev` / `start:debug` | Lance l'API (normal / watch / debug + watch) |
| `start:prod` | Lance `dist/main` |
| `format` / `format:check` | Prettier : écrit / vérifie |
| `lint` | oxlint typé sur `src/` et `test/` |
| `test` / `test:watch` / `test:cov` / `test:debug` | Tests unitaires Vitest (`**/*.spec.ts`) : une passe / watch / couverture / debug |
| `test:e2e` | Tests e2e Vitest (`vitest.config.e2e.ts`, `**/*.e2e-spec.ts`, dans `test/`) |
| `deps:check` | Garde-fou d'architecture (dependency-cruiser) |
| `prisma:validate` / `prisma:generate` / `prisma:studio` | Commandes Prisma (validate / generate / studio) |
| `prisma:migrate` | `prisma migrate dev` : crée et applique une migration à partir du schéma |
| `prisma:migrate:deploy` | `prisma migrate deploy` : applique les migrations existantes (CI, déploiement) |
| `prisma:migrate:reset` | `prisma migrate reset` : recrée la base et rejoue les migrations (**efface les données**) |

Les tests e2e fixent eux-mêmes leur environnement (base `sporthub_test` sur `localhost:5432`, utilisateur `sporthub`) et ne dépendent pas du `.env`. Avant les tests, un `globalSetup` Vitest applique les migrations sur cette base (`prisma migrate deploy`) : inutile de les lancer à la main en local. Comme l'application se connecte à la base à l'initialisation, **une base `sporthub_test` joignable est un prérequis local** des e2e. `docker compose up -d` la crée automatiquement, avec `DB_NAME`, via le script `docker/postgres/init/01-create-test-db.sh` (monté dans `/docker-entrypoint-initdb.d`, idempotent, il réutilise l'utilisateur du conteneur). En CI, le service PostgreSQL la crée (`POSTGRES_DB: sporthub_test`).

Les scripts d'initialisation de l'image Postgres ne s'exécutent **qu'au premier démarrage d'un volume vide**. Sur un volume existant, deux options :

- création ponctuelle : `docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE sporthub_test"'` (ou `docker compose exec postgres bash /docker-entrypoint-initdb.d/01-create-test-db.sh`, idempotent) ;
- recréation du volume : `docker compose down -v` puis `docker compose up -d` (**efface les données** de la base de développement).

## Variables d'environnement

Validées au démarrage par le schéma zod de `src/core/config/env.validation.ts`. Modèle : `.env.template`. Aucun secret ici : les valeurs du modèle sont locales.

Application (toutes optionnelles) :

| Variable | Défaut | Contrainte |
|---|---|---|
| `NODE_ENV` | `development` | `development`, `test` ou `production` |
| `APP_NAME` | `sport-hub-back` | non vide |
| `APP_HOST` | `localhost` | non vide |
| `APP_PORT` | `3000` | entier 1 à 65535 |
| `APP_GLOBAL_PREFIX` | `api` | chaîne |
| `APP_LOG_LEVEL` | `log` | `verbose`, `debug`, `log`, `warn`, `error` ou `fatal` (activer un niveau active aussi les plus sévères) |
| `APP_CORS_ORIGIN` | `http://localhost:4200` | URL |

Base de données (toutes obligatoires, sans défaut) :

| Variable | Contrainte |
|---|---|
| `DB_NAME`, `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD` | non vides |
| `DB_PORT` | entier 1 à 65535 |
| `DATABASE_URL` | URL `postgresql://` (ou `postgres://`) dont hôte, port, utilisateur, mot de passe et base doivent correspondre aux variables `DB_*`, sinon le démarrage échoue |

`DATABASE_URL` est lue par Prisma (`prisma.config.ts`) et doit être écrite en clair : la CLI Prisma n'étend pas les `${variables}`. Les variables `DB_*` sont aussi lues par `docker-compose.yml`.

## CI (GitHub Actions, `.github/workflows/`)

- `ci-branch` : à chaque push sur `feature/**` et `fix/**` : `npm ci`, `prisma generate`, format, lint, `deps:check`, `npm audit` (échoue sur high et critical).
- `ci-develop` : à chaque push sur `develop` (PR fusionnée) : tests unitaires, tests e2e (service PostgreSQL 16, étape « Migrations » `npm run prisma:migrate:deploy` avant les e2e), build.
- `ci-release` : sur les branches `release/**` et les PR vers `main` issues d'une release : garde-fou de version (voir [Workflow Git](workflow-git.md)).
- `ci-main` : à chaque push sur `main` issu d'un merge de `release/**` : création automatique du tag `vx.y.z` et de la release GitHub (voir [Workflow Git](workflow-git.md)).
