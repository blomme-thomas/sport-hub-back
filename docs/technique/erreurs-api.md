# Erreurs de l'API

Toute erreur est renvoyée au format RFC 9457 Problem Details, avec le `Content-Type` `application/problem+json`. Le filtre global `ProblemDetailsExceptionFilter` (`src/core/filters/problem-details.exception-filter.ts`) produit ce corps pour toute exception (`@Catch()`), y compris les 404 de route inconnue. Un contexte non HTTP relance l'exception.

## Corps de réponse

| Champ | Contenu |
|---|---|
| `type` | `urn:sport-hub:problem:<code en kebab-case>` (ex. `urn:sport-hub:problem:validation-failed`) |
| `title` | libellé HTTP du statut (`STATUS_CODES` de Node) |
| `status` | statut HTTP |
| `detail` | message lisible (voir chaque cas) |
| `instance` | chemin de la requête, sans query string |
| `code` | code stable (contrat public) |
| `correlationId` | identifiant de corrélation (aussi dans le header `X-Correlation-Id`) |
| `errors` | présent uniquement pour `VALIDATION_FAILED` : liste de `{ field, code, message }` |
| `checks` | présent uniquement pour `SERVICE_UNAVAILABLE` : état par dépendance, ex. `{ "database": "down" }` (valeurs `up` ou `down`) |

Le schéma OpenAPI (`ProblemDetailsDto`) est généré dans Swagger ; il n'est pas recopié ici.

## Exemples

Validation (400) :

```json
{
  "type": "urn:sport-hub:problem:validation-failed",
  "title": "Bad Request",
  "status": 400,
  "detail": "La requête contient 2 erreur(s) de validation.",
  "instance": "/api/workouts",
  "code": "VALIDATION_FAILED",
  "correlationId": "3f0c2a52-9d3e-4a52-8f43-1d2b5a0c9e11",
  "errors": [
    { "field": "name", "code": "IS_NOT_EMPTY", "message": "name should not be empty" },
    { "field": "address.city", "code": "PROPERTY_NOT_ALLOWED", "message": "property city should not exist" }
  ]
}
```

Business Error (`DomainError`), ici `WORKOUT_NOT_FOUND` supposé mappé à 404 (exemple illustratif : `DOMAIN_ERROR_STATUS` est vide à ce jour) :

```json
{
  "type": "urn:sport-hub:problem:workout-not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "Séance introuvable.",
  "instance": "/api/workouts/42",
  "code": "WORKOUT_NOT_FOUND",
  "correlationId": "..."
}
```

Route inconnue (404), `detail` = message de l'exception Nest :

```json
{
  "type": "urn:sport-hub:problem:not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "Cannot GET /api/inconnu",
  "instance": "/api/inconnu",
  "code": "NOT_FOUND",
  "correlationId": "..."
}
```

Erreur interne (500), jamais de détail interne :

```json
{
  "type": "urn:sport-hub:problem:internal-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "Une erreur interne est survenue.",
  "instance": "/api/health",
  "code": "INTERNAL_ERROR",
  "correlationId": "..."
}
```

Dépendance indisponible (503), ici la base lors de `GET /api/health` :

```json
{
  "type": "urn:sport-hub:problem:service-unavailable",
  "title": "Service Unavailable",
  "status": 503,
  "detail": "Une dépendance du service est indisponible.",
  "instance": "/api/health",
  "code": "SERVICE_UNAVAILABLE",
  "correlationId": "...",
  "checks": { "database": "down" }
}
```

JSON invalide (400) :

```json
{
  "type": "urn:sport-hub:problem:malformed-request-body",
  "title": "Bad Request",
  "status": 400,
  "detail": "Le corps de la requête est invalide.",
  "instance": "/api/workouts",
  "code": "MALFORMED_REQUEST_BODY",
  "correlationId": "..."
}
```

Corps trop gros (413) :

```json
{
  "type": "urn:sport-hub:problem:payload-too-large",
  "title": "Payload Too Large",
  "status": 413,
  "detail": "Le corps de la requête est trop volumineux.",
  "instance": "/api/workouts",
  "code": "PAYLOAD_TOO_LARGE",
  "correlationId": "..."
}
```

## Codes génériques

Définis dans `GENERIC_PROBLEM_CODES` (`src/core/filters/error-status.table.ts`). Statut tel que le filtre le renvoie réellement :

| Code | Statut | Cas |
|---|---|---|
| `VALIDATION_FAILED` | 400 | échec de validation du DTO (`errors[]` renseigné) |
| `BAD_REQUEST` | 400 | `HttpException` 400 autre que validation et corps invalide |
| `MALFORMED_REQUEST_BODY` | 400 | JSON invalide |
| `NOT_FOUND` | 404 | route ou ressource absente (`HttpException` 404) |
| `PAYLOAD_TOO_LARGE` | 413 | corps trop volumineux |
| `CLIENT_ERROR` | statut 4xx d'origine (401, 403, 405, 409, 415, 429...) | autre 4xx d'`HttpException` ; `detail` = message de l'exception |
| `SERVICE_UNAVAILABLE` | 503 | `DependencyUnavailableException` uniquement (`src/core/filters/dependency-unavailable.exception.ts`) ; `detail` fixe, extension `checks` |
| `INTERNAL_ERROR` | 500, ou statut 5xx d'origine d'une autre `HttpException` (ex. 502, ou un 503 levé autrement comme `ServiceUnavailableException` de Nest) | erreur technique ; `detail` fixe, message masqué |

Un statut 4xx qui a un code dédié (400, 404, 413) prend ce code ; tous les autres 4xx prennent `CLIENT_ERROR`. La valeur `400` associée à `CLIENT_ERROR` dans `GENERIC_PROBLEM_CODES` n'est qu'un repère : le filtre n'utilise jamais cette valeur et renvoie le statut d'origine.

Les codes des Business Errors s'ajoutent à ces codes (`DOMAIN_ERROR_STATUS`), à ce jour aucun.

## Échec d'un service externe (`ExternalServiceError`)

Le client HTTP sortant (`src/core/http`, voir [Architecture](architecture.md)) lève `ExternalServiceError` quand un système externe échoue après les réessais. Ce n'est ni une `DomainError` ni une `HttpException` : le filtre la traite comme une exception inconnue et renvoie un 500 `INTERNAL_ERROR` avec le `detail` fixe `Une erreur interne est survenue.` (jamais le message, la cible ni le statut amont). L'erreur est loguée en `error` avec sa stack, et n'a pas de `cause`. Aucun code dédié n'existe à ce jour ; un Use Case peut la capturer pour la traduire en Business Error.

## Business Errors : règle du statut

Le statut d'une `DomainError` vient de `DOMAIN_ERROR_STATUS` (table centralisée code vers statut). Un code absent de la table donne un 422 (`DEFAULT_DOMAIN_ERROR_STATUS`) et un log `warn` indiquant le code non mappé. Le `detail` est le `message` de l'erreur, renvoyé tel quel.

## Codes de champ (`errors[]`)

- `field` : chemin du champ (`address.city`, `items[0].name`).
- `code` : clé de la contrainte class-validator convertie en UPPER_SNAKE (`isNotEmpty` donne `IS_NOT_EMPTY`, `min` donne `MIN`), ou `PROPERTY_NOT_ALLOWED` (code propre au dépôt) pour une propriété non autorisée (`whitelistValidation`, `forbidNonWhitelisted`).
- Ces codes ne sont pas dans l'enum OpenAPI `ProblemCode` (qui ne liste que les codes de `code` racine).
- Plafond de 100 items (`MAX_VALIDATION_ERRORS`) ; au-delà, la liste est tronquée et `detail` l'indique (`La requête contient N erreur(s) de validation. La liste est tronquée à 100 erreurs.`).

## Header `X-Correlation-Id`

- Le middleware `correlationIdMiddleware` (enregistré en premier dans `configureApp`, donc actif aussi pour les 404) lit `X-Correlation-Id` de la requête. Il est repris s'il respecte `/^[A-Za-z0-9._:-]{1,128}$/` (protection contre l'injection dans logs et headers), sinon un UUID est généré.
- L'identifiant est posé sur la réponse (toutes les réponses, pas seulement les erreurs), stocké dans un `AsyncLocalStorage` (`src/core/middlewares/correlation-id.storage.ts`) et repris dans le corps d'erreur (`correlationId`) et les logs.
- Le header est exposé en CORS (`exposedHeaders`).

## Logs

Format : `[correlationId] METHOD /chemin -> statut : message`.

- statut 5xx : niveau `error`, avec la stack ;
- statut 4xx : niveau `debug` ;
- le message est assaini (retours à la ligne remplacés par des espaces) et tronqué à 500 caractères ;
- erreur survenue après l'envoi des headers : loguée en `error`, aucune réponse supplémentaire.

## Marche à suivre

Nouvelle route :
- documenter ses erreurs avec `@ApiProblemResponses(...statuts)` (le 500 est toujours ajouté) ;
- recevoir les entrées par un DTO validé (class-validator) : la validation produit `VALIDATION_FAILED` ;
- ne jamais formater une erreur HTTP à la main : lever une `DomainError` ou une `HttpException`, ou laisser la validation échouer.

Nouvelle Business Error :
1. créer `domain/errors/<name>.error.ts` dans le module ;
2. `extends DomainError` (`src/shared/domain/domain-error.ts`) avec `readonly code` (UPPER_SNAKE_CASE, préfixé par le concept métier) ;
3. ajouter l'entrée dans `DOMAIN_ERROR_STATUS` (`src/core/filters/error-status.table.ts`), clé en chaîne littérale (`src/core` n'importe pas `src/modules`) ;
4. ajouter le statut à `@ApiProblemResponses` des routes concernées.

Règles : le `code` est un contrat public, il ne se renomme pas. Le `message` est renvoyé tel quel dans `detail` : il ne doit contenir ni donnée interne ni token. Les détails techniques vont dans `cause` (option du constructeur), qui n'est jamais renvoyée.

## Limites connues

- JSON invalide détecté par heuristique : Nest (platform-express) convertit l'erreur de body-parser en `BadRequestException` avant le filtre et le `type` d'origine est perdu. Le filtre reconnaît donc un JSON invalide à : `BadRequestException` sans `cause`, `req.body` indéfini, `Content-Type` contenant `json` et corps non vide (`Content-Length` > 0 ou `Transfer-Encoding`). Un test e2e (`test/problem-details.e2e-spec.ts`) protège ce comportement : le conserver, et le relancer à chaque montée de version de Nest ou Express. Un corps trop gros est mieux identifié (le `type` reste dans `cause`).
- Le `message` d'une `DomainError` mappée vers un 5xx n'est pas masqué (contrairement aux autres 5xx, dont le `detail` est fixe).
