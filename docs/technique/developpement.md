# Développement

## Prérequis

- Node.js 24 (version fixée dans `.nvmrc`).
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
- Route technique de santé : `GET /api/health` renvoie `{ "status": "ok" }`. Elle ne touche pas la base.
- Swagger : `/swagger` (hors préfixe `/api`).
- Prisma ne se connecte qu'à la première requête : l'application démarre même sans base.
- Une configuration invalide (variable manquante ou incorrecte) fait échouer le démarrage avec le détail des erreurs.

## Base de données locale

`docker-compose.yml` définit un service `postgres` (image `postgres:16`, volume `postgres_data`). Utilisateur, mot de passe, nom de base et port hôte viennent des variables `DB_*` du `.env` (le démarrage échoue si l'une manque). Aucune migration à ce jour (voir [Données](donnees.md)).

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
| `prisma:validate` / `prisma:generate` / `prisma:migrate` / `prisma:studio` | Commandes Prisma (validate / generate / migrate dev / studio) |

Les tests e2e fixent eux-mêmes leur environnement (base `sporthub_test` sur `localhost:5432`, utilisateur `sporthub`) et ne dépendent pas du `.env`.

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
- `ci-develop` : à chaque push sur `develop` (PR fusionnée) : tests unitaires, tests e2e (service PostgreSQL 16, migrations appliquées seulement si `prisma/migrations` existe), build.
- `ci-release` : sur les branches `release/**` et les PR vers `main` issues d'une release : garde-fou de version (voir [Workflow Git](workflow-git.md)).
- `ci-main` : à chaque push sur `main` issu d'un merge de `release/**` : création automatique du tag `vx.y.z` et de la release GitHub (voir [Workflow Git](workflow-git.md)).
