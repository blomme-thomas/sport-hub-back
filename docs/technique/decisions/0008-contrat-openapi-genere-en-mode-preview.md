# ADR 0008 : contrat OpenAPI généré en mode preview, sans base

Statut : accepté (issue #22).

## Contexte
Swagger n'était produit qu'à l'exécution, et l'application exige la base au démarrage (ADR 0003) : impossible de lire le contrat sans base, donc ni en revue de PR, ni en CI, ni pour un import dans Apidog. Le contrat doit être versionné et vérifié en CI sans PostgreSQL.

## Décision
- Le contrat est généré par `npm run openapi:generate` dans `docs/api/openapi.json`, depuis le même code que Swagger (`createOpenApiDocument`, `src/swagger.setup.ts`).
- L'application est construite avec `NestFactory.create(AppModule, { preview: true, abortOnError: false, logger: false })` : le mode `preview` de Nest n'exécute pas l'initialisation de `PrismaService`, donc pas de connexion à la base.
- Les variables lues au chargement d'`AppModule` sont fixées par `src/openapi/openapi-env.ts` (affectation directe) : le contrat ne dépend ni du `.env` ni de la machine.
- Le fichier est trié et sérialisé de façon déterministe (`src/openapi/openapi-serializer.ts`), et la CI échoue s'il est périmé.

## Conséquences
- Génération possible sans base, en local comme en CI.
- Toute route, DTO ou tag modifié impose de régénérer et committer le fichier (règle dans [Contrat OpenAPI](../openapi.md)).
- `openapi-env.ts` doit suivre les variables requises au démarrage : une variable ajoutée à `env.validation.ts` et nécessaire à `AppModule` doit aussi être fixée là, sinon la génération échoue.
- Dépendance au comportement du mode `preview` de Nest : une montée de version de `@nestjs/core` peut le modifier ; la génération et la CI le détectent.

Détail : [Contrat OpenAPI](../openapi.md).
