# sport-hub-back
API NestJS (architecture hexagonale / DDD) qui synchronise mes données Garmin Connect, calcule mes statistiques d’entraînement et génère des séances par IA. Usage local.

## Démarrage local

Prérequis : Node 26 (voir `.nvmrc`) et Docker.

```bash
npm install
cp .env.template .env            # valeurs locales sans secret, à ajuster si besoin
docker compose up -d postgres    # base PostgreSQL locale (identifiants lus dans .env)
npm run prisma:generate          # client Prisma (à relancer après chaque modification du schéma)
npm run start:dev
```

- API : `http://localhost:3000/api` (route de santé : `GET /api/health`)
- Documentation OpenAPI : `http://localhost:3000/swagger`

L'application démarre même sans base lancée : Prisma ne se connecte qu'à la première requête.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run start:dev` | Démarre l'API en mode watch |
| `npm run build` | Compile (vérification de types incluse) |
| `npm run format:check` / `npm run format` | Vérifie / corrige le format (Prettier) |
| `npm run lint` | Lint typé (oxlint) |
| `npm run deps:check` | Vérifie les règles de couches hexagonales (dependency-cruiser) |
| `npm run test` / `npm run test:e2e` | Tests unitaires / e2e (Vitest) |
| `npm run prisma:generate` / `prisma:validate` / `prisma:migrate` / `prisma:studio` | Commandes Prisma |

## Documentation

- Conventions et règles d'architecture : `instructions/` (point d'entrée : `CLAUDE.md`, détail dans `instructions/11-repository-conventions.instructions.md`).
- Documentation technique et fonctionnelle : `docs/`.
