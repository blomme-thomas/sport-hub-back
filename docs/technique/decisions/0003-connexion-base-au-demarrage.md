# ADR 0003 : connexion à la base au démarrage et dans le health check

Statut : accepté (issue #4).

## Contexte
Prisma avec l'adaptateur `pg` ne se connectait qu'à la première requête : l'API démarrait sans base et `GET /api/health` répondait 200 quand même. Une base injoignable doit être détectée tout de suite, sans fuite de secret (URL de connexion, mot de passe) dans les messages ni les réponses.

## Décision
- `PrismaService.onModuleInit` fait `$connect()` puis `SELECT 1` (`$connect` seul peut n'ouvrir aucune connexion réelle avec un driver adapter). En cas d'échec : `$disconnect()` au mieux, puis `DatabaseUnavailableError`, qui arrête le démarrage.
- `DatabaseUnavailableError` est une erreur technique (pas une `DomainError`). Son message ne contient que hôte, port, nom de base et un code d'erreur filtré (`safeErrorCode`, `/^[A-Za-z0-9_]{1,40}$/`, lu sur l'erreur et ses causes, profondeur 3). Ni `cause`, ni utilisateur, ni mot de passe.
- `connectionTimeoutMillis` de 5 s passé à `PrismaPg` (`pg` n'a pas de timeout par défaut).
- `GET /api/health` appelle `DatabaseHealthIndicator.check()` : 200 `{ status: 'ok', checks: { database: 'up' } }`, sinon `DependencyUnavailableException`, rendue par le filtre global en 503 Problem Details, code `SERVICE_UNAVAILABLE`, extension `checks`.
- Écartés : `@nestjs/terminus`, un 503 JSON hors Problem Details, `ServiceUnavailableException` de Nest (reste en `INTERNAL_ERROR`), `DomainError`.

## Conséquences
- La base est obligatoire au démarrage, y compris pour les tests e2e : une base `sporthub_test` joignable est requise (voir [Développement](../developpement.md)).
- `SERVICE_UNAVAILABLE` et `checks` sont des ajouts compatibles au contrat d'erreur.
- Un 503 est loggé en `error` avec stack : bruit possible si une sonde interroge souvent.

Détail : [Erreurs de l'API](../erreurs-api.md).
