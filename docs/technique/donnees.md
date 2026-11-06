# Données

Prisma 7 + PostgreSQL sont initialisés ; il n'y a pas encore de modèle de données.

- `prisma/schema.prisma` : générateur `prisma-client` et datasource `postgresql`, aucun modèle.
- `prisma.config.ts` : chemin du schéma, dossier de migrations `prisma/migrations`, URL de connexion lue dans `DATABASE_URL`.
- Aucune migration à ce jour (le dossier `prisma/migrations` n'existe pas).
- Client généré dans `src/core/prisma/generated`, ignoré par Git : le régénérer avec `npm run prisma:generate` (nécessaire avant lint, tests et build ; la CI le fait).
- Connexion via l'adaptateur `@prisma/adapter-pg` dans `PrismaService` (`src/core/prisma`), qui vérifie la base au démarrage (voir [ADR 0003](decisions/0003-connexion-base-au-demarrage.md)).

Les modèles arriveront avec le premier module métier. Base locale : voir [Développement](developpement.md).
