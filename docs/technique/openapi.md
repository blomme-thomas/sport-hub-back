# Contrat OpenAPI versionné

Le contrat de l'API est versionné dans `docs/api/openapi.json` (OpenAPI 3.0.0). Ce fichier est **généré** à partir des décorateurs NestJS et commité ; il sert à la revue de PR (un changement d'API se voit dans le diff) et à l'import dans Apidog.

Swagger reste servi à l'exécution sur `/swagger` (hors préfixe `/api`, voir [Développement](developpement.md)) : il est construit par le même code (`createOpenApiDocument` de `src/swagger.setup.ts`). Le fichier versionné est une photo de ce document à un instant donné.

## Génération

```
npm run openapi:generate
```

Le script compile (`nest build`) puis lance `dist/openapi/generate-openapi.js`, qui écrit `docs/api/openapi.json`. Il faut le client Prisma généré (`npm run prisma:generate`), comme pour `npm run build`.

- **Sans base de données** : l'application est construite en mode `preview` de Nest (`NestFactory.create(AppModule, { preview: true, abortOnError: false, logger: false })`), ce qui évite l'initialisation de `PrismaService` (connexion à la base, voir [ADR 0003](decisions/0003-connexion-base-au-demarrage.md)). Aucun `.env` n'est nécessaire, et la génération fonctionne en CI sans PostgreSQL.
- **Environnement figé** : `src/openapi/openapi-env.ts` fixe les variables lues au chargement d'`AppModule` (défauts du schéma zod pour `APP_*`, base factice, `GARMIN_SYNC_CRON_ENABLED=false`, `GARMIN_PERSONAL_API_KEY` et `ANTHROPIC_API_KEY` vidées). Le contrat ne dépend donc ni du `.env` ni de la machine. Une nouvelle variable requise au démarrage doit être ajoutée à ce fichier.
- **Version** : `info.version` vient de `package.json` (lu directement, pas via `npm_package_version`). Un bump de version modifie donc le fichier : c'est attendu, et il se régénère comme le reste.

## Contenu du fichier

- **`info`** : `title` = `APP_NAME` (`sport-hub-back` par défaut), `version` = version de `package.json`.
- **`servers`** : un seul serveur, `http://localhost:3000` (description « API locale »), construit depuis `APP_HOST` et `APP_PORT`. **Sans `/api`** : les chemins portent déjà le préfixe global (`/api/health`, `/api/activities`…). Avec `/api` dans le serveur, chaque URL serait doublée (`/api/api/...`) dans Apidog.
- **`paths`** : toutes les routes de l'application, avec leurs schémas de réponse et d'erreur. Les erreurs sont décrites par `ProblemDetailsDto` (et `ValidationErrorItemDto`), déclarés comme modèles supplémentaires (voir [Erreurs de l'API](erreurs-api.md)).
- **`operationId`** : produits par `operationIdFactory` (`src/openapi/operation-id.ts`) : nom de la classe du contrôleur sans le suffixe `Controller`, en camelCase initial, puis nom de la méthode avec une majuscule initiale. Exemples actuels : `healthCheck`, `activitiesList`, `garminSyncRun`, `trainingStatsGet`, `workoutsGenerate`.
- **`tags`** : un tag par module, qui sert de dossier dans Apidog et dans Swagger :

| Tag | Routes |
|---|---|
| `creneaux` | `POST /api/slots`, `GET /api/slots`, `PATCH /api/slots/:id`, `DELETE /api/slots/:id` |
| `disciplines` | `GET /api/disciplines`, `PATCH /api/disciplines/:typeKey` |
| `garmin-sync` | `GET /api/activities`, `POST /api/garmin-sync/run` |
| `health` | `GET /api/health` |
| `objectifs` | `POST /api/goals`, `GET /api/goals`, `GET /api/goals/:id`, `PATCH /api/goals/:id`, `DELETE /api/goals/:id` |
| `training-stats` | `GET /api/stats` |
| `workout-generation` | `POST /api/workouts/generate` |

Les contrôleurs portent ces tags via `@ApiTags`. Les anciens tags `activities`, `stats` et `workouts` ont été remplacés par cette story (#22) : le regroupement Swagger et Apidog a changé.

Écart constaté (issue #45) : le tag `disciplines` est porté par les opérations, mais il n'est pas déclaré dans la liste `API_TAGS` de `src/swagger.setup.ts`. Le fichier `docs/api/openapi.json` ne contient donc pas d'entrée `disciplines` dans `tags` de premier niveau (les six autres tags y figurent). Le tag n'a pas été ajouté à cette liste, car ce n'est pas un changement de documentation ; à corriger dans le code, puis à régénérer.

## Déterminisme

`serializeOpenApi` (`src/openapi/openapi-serializer.ts`) rend la sortie identique d'une génération à l'autre :

- clés d'objets triées récursivement ;
- `tags` de premier niveau triés par `name` ;
- les autres tableaux (paramètres, `required`, `servers`) gardent leur ordre, qui est significatif ;
- indentation de 2 espaces, fin de fichier LF (`.gitattributes` : `docs/api/openapi.json text eol=lf`) ;
- aucun horodatage.

Deux générations successives donnent un fichier strictement identique. Un diff sur ce fichier reflète donc un changement réel du contrat.

## Garde-fou CI

L'étape « Contrat OpenAPI à jour » de `.github/workflows/ci-branch.yml` s'exécute après l'étape « Architecture », sur les pushs `feature/**` et `fix/**` :

1. `npm run openapi:generate` régénère le fichier ;
2. si `git status --porcelain -- docs/api/openapi.json` n'est pas vide, la CI échoue avec le message :

```
docs/api/openapi.json est périmé : lancer 'npm run openapi:generate' et committer le fichier
```

Pour corriger en local : relancer la commande, vérifier le diff, committer le fichier.

## Règle de régénération

**Toute story qui ajoute ou modifie une route, un DTO (requête ou réponse, ou erreur) ou un tag régénère et commite `docs/api/openapi.json`.** Le fichier fait partie de la story : sans lui, la CI échoue. Un bump de version dans `package.json` (release) le modifie aussi : le régénérer dans la même PR.

Renommer un contrôleur ou une méthode change son `operationId` ; changer un tag change le regroupement. Ces changements sont des changements de contrat : les signaler dans la PR.

## Import dans Apidog

Les libellés de menus d'Apidog varient selon la version : les étapes ci-dessous sont à vérifier dans l'interface utilisée. « À compléter » là où la vérification n'a pas été faite.

1. Générer le fichier (`npm run openapi:generate`) ou récupérer `docs/api/openapi.json` depuis la branche voulue.
2. Dans Apidog, ouvrir le projet de sport-hub-back (le créer si nécessaire).
3. Importer le fichier `docs/api/openapi.json` via la fonction d'import de fichier OpenAPI/Swagger (JSON, OpenAPI 3.0). Libellé exact du menu : à compléter.
4. Pour une mise à jour après une évolution de l'API : utiliser le mode de ré-import qui met à jour les endpoints existants (« mise à jour » ou « fusion » selon la version d'Apidog ; à compléter). Les `operationId` stables et les chemins identiques évitent les doublons.
5. Vérifier après chaque ré-import : pas de doublon d'endpoint, serveur `http://localhost:3000`, dossiers = tags ci-dessus.

Apidog n'est pas synchronisé automatiquement : chaque mise à jour est un import manuel. La publication du fichier hors du dépôt est hors périmètre.

## Voir aussi

- [Décision 0008 : contrat OpenAPI généré en mode preview](decisions/0008-contrat-openapi-genere-en-mode-preview.md)
- [Développement](developpement.md) (scripts, CI)
- [Erreurs de l'API](erreurs-api.md)
