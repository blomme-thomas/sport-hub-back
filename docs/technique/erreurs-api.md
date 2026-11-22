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

Business Error (`DomainError`), ici `WORKOUT_NOT_FOUND` supposé mappé à 404 (exemple illustratif : ce code n'existe pas dans le dépôt ; les codes réels sont listés plus bas) :

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

Les codes des Business Errors s'ajoutent à ces codes (`DOMAIN_ERROR_STATUS`) : `GARMIN_ACCESS_DENIED` (502) et `GARMIN_UNAVAILABLE` (503), voir [Codes du module garmin-sync](#codes-du-module-garmin-sync) ; `STATS_RANGE_INVALID` et `STATS_RANGE_TOO_LARGE` (400), voir [Codes du module training-stats](#codes-du-module-training-stats) ; `WORKOUT_GENERATION_UNAVAILABLE` (503), `WORKOUT_GENERATION_ACCESS_DENIED` et `WORKOUT_GENERATION_INVALID_OUTPUT` (502), voir [Codes du module workout-generation](#codes-du-module-workout-generation) ; `SLOT_END_NOT_AFTER_START`, `SLOT_PERIOD_INVALID`, `SLOT_PERIOD_TOO_LARGE` et `SLOT_INVALID` (400) et `SLOT_NOT_FOUND` (404), voir [Codes du module creneaux](#codes-du-module-creneaux) ; `GOAL_INVALID`, `GOAL_TARGET_TIME_INVALID` (400) et `GOAL_NOT_FOUND` (404), voir [Codes du module objectifs](#codes-du-module-objectifs) ; `DISCIPLINE_INVALID` et `DISCIPLINE_LABEL_INVALID` (400) et `DISCIPLINE_NOT_FOUND` (404), voir [Codes du module disciplines](#codes-du-module-disciplines).

## Échec d'un service externe (`ExternalServiceError`)

Le client HTTP sortant (`src/core/http`, voir [Architecture](architecture.md)) lève `ExternalServiceError` quand un système externe échoue après les réessais. Ce n'est ni une `DomainError` ni une `HttpException` : le filtre la traite comme une exception inconnue et renvoie un 500 `INTERNAL_ERROR` avec le `detail` fixe `Une erreur interne est survenue.` (jamais le message, la cible ni le statut amont). L'erreur est loguée en `error` avec sa stack, et n'a pas de `cause`. Le module `garmin-sync` la traduit dans son adapter en `GARMIN_UNAVAILABLE` (503) ou `GARMIN_ACCESS_DENIED` (502) ; ailleurs, un Use Case peut la capturer pour la traduire en Business Error.

`GarminAuthenticationError` (module `garmin-sync`, causes `KEY_MISSING`, `KEY_REJECTED`, `UNEXPECTED_RESPONSE`, voir [API Garmin Personal](garmin-personal-api.md)) est une erreur technique qui n'est ni une `DomainError` ni une `HttpException`. L'adapter Garmin la traduit : `KEY_MISSING` et `KEY_REJECTED` deviennent `GARMIN_ACCESS_DENIED`, `UNEXPECTED_RESPONSE` devient `GARMIN_UNAVAILABLE`. Si elle atteignait le filtre, elle deviendrait un 500 `INTERNAL_ERROR`.

## Codes du module garmin-sync

| Code | Statut | `title` | `detail` renvoyé | Cas |
|---|---|---|---|---|
| `GARMIN_ACCESS_DENIED` | 502 | Bad Gateway | « L'accès à Garmin a été refusé : vérifiez la clé de l'API Garmin Personal. » | clé absente ou refusée, jeton refusé après renouvellement |
| `GARMIN_UNAVAILABLE` | 503 | Service Unavailable | « Garmin est momentanément indisponible. Réessayez plus tard. » | Garmin en panne, délai dépassé, réponse inattendue |

- `type` : `urn:sport-hub:problem:garmin-access-denied` et `urn:sport-hub:problem:garmin-unavailable`.
- Routes concernées : `POST /api/garmin-sync/run`, documentée avec `@ApiProblemResponses(502, 503)`.
- Ces `detail` sont fixes ; la `cause` technique n'est jamais transmise (voir [ADR 0004](decisions/0004-erreurs-techniques-garmin-en-domain-error.md)).
- `ACTIVITY_INVALID` (`InvalidActivityError`) n'est pas mappé dans `DOMAIN_ERROR_STATUS` : s'il atteignait le filtre, il donnerait un 422 avec un `warn`. À ce jour, l'adapter Garmin le capte et saute l'activité concernée, il n'atteint donc pas le filtre.

## Codes du module training-stats

| Code | Statut | `title` | `detail` renvoyé | Cas |
|---|---|---|---|---|
| `STATS_RANGE_TOO_LARGE` | 400 | Bad Request | « La plage demandée dépasse 104 périodes. Réduisez la plage de dates. » | plage de plus de 104 périodes (`GET /api/stats`) |
| `STATS_RANGE_INVALID` | 400 | Bad Request | « La date de fin doit être postérieure ou égale à la date de début. » | plage inversée ; filet du Domain, déjà couvert par la validation du transport (`to` antérieur à `from`, `VALIDATION_FAILED`) |

- `type` : `urn:sport-hub:problem:stats-range-too-large` et `urn:sport-hub:problem:stats-range-invalid`.
- Route concernée : `GET /api/stats`, documentée avec `@ApiProblemResponses(400)`.
- Un `to` antérieur à `from` renvoie `VALIDATION_FAILED` (400) avec `errors[].field` = `to` et `code` = `IS_NOT_BEFORE_FROM`, pas `STATS_RANGE_INVALID`.
- Ces codes ont un `detail` renvoyé tel quel (message de la `DomainError`) ; le statut 400 n'étant pas 5xx, il n'est pas concerné par la règle de masquage des 5xx.

## Codes du module workout-generation

| Code | Statut | `title` | `detail` renvoyé | Cas |
|---|---|---|---|---|
| `WORKOUT_GENERATION_UNAVAILABLE` | 503 | Service Unavailable | « La génération de séance est momentanément indisponible. Réessayez plus tard. » | clé `ANTHROPIC_API_KEY` absente, connexion ou délai dépassé, 429, 5xx du service d'IA (après les réessais du SDK) |
| `WORKOUT_GENERATION_ACCESS_DENIED` | 502 | Bad Gateway | « La génération de séance n'est pas autorisée par le service d'IA. » | 401 ou 403 du service d'IA (clé refusée ou droits insuffisants) |
| `WORKOUT_GENERATION_INVALID_OUTPUT` | 502 | Bad Gateway | message fixe décrivant l'anomalie, par exemple « La séance générée ne respecte pas le format attendu. » | réponse du modèle inexploitable : `stop_reason` autre que `end_turn` (`max_tokens`, refus), bloc non texte, JSON invalide, schéma non respecté, invariant de la séance violé (durée totale, ordre des étapes, etc.) |

- `type` : `urn:sport-hub:problem:workout-generation-unavailable`, `urn:sport-hub:problem:workout-generation-access-denied` et `urn:sport-hub:problem:workout-generation-invalid-output`.
- Route concernée : `POST /api/workouts/generate`, documentée avec `@ApiProblemResponses(400, 502, 503)`.
- `WORKOUT_GENERATION_INVALID_OUTPUT` renvoie son message tel quel (un 5xx de `DomainError` n'est pas masqué) : ces messages sont fixes, ils ne contiennent jamais de contenu renvoyé par le modèle. Aucune séance partielle n'est renvoyée dans ce cas.
- Aucune `cause` ni message du SDK Anthropic n'est transmis (voir [ADR 0006](decisions/0006-generation-seances-sans-persistance-et-acl-stats.md) et [Contexte workout-generation](contextes/workout-generation.md)).
- Une erreur qui n'est pas une `AnthropicError` côté adapter atteint le filtre comme exception inconnue : 500 `INTERNAL_ERROR`.

## Codes du module creneaux

| Code | Statut | `title` | `detail` renvoyé | Cas |
|---|---|---|---|---|
| `SLOT_END_NOT_AFTER_START` | 400 | Bad Request | « L'heure de fin du créneau doit être strictement postérieure à l'heure de début. » | fin égale ou antérieure au début, à la création ou après fusion lors d'un PATCH (`POST /api/slots`, `PATCH /api/slots/:id`) |
| `SLOT_PERIOD_INVALID` | 400 | Bad Request | « La date de fin de la période doit être postérieure ou égale à la date de début. » | `to` antérieur à `from` (`GET /api/slots`) |
| `SLOT_PERIOD_TOO_LARGE` | 400 | Bad Request | « La période demandée dépasse 366 jours. » | période de plus de 366 jours (`GET /api/slots`) |
| `SLOT_NOT_FOUND` | 404 | Not Found | « Le créneau demandé est introuvable. » | identifiant inconnu (`PATCH /api/slots/:id`, `DELETE /api/slots/:id`) |
| `SLOT_INVALID` | 400 | Bad Request | « Créneau invalide : <raison>. » | filet du Domain pour une valeur que la validation du transport n'a pas interceptée |

- `type` : `urn:sport-hub:problem:slot-end-not-after-start`, `urn:sport-hub:problem:slot-period-invalid`, `urn:sport-hub:problem:slot-period-too-large`, `urn:sport-hub:problem:slot-not-found` et `urn:sport-hub:problem:slot-invalid`.
- `SLOT_INVALID` porte une raison en clair dans `detail` : `le type doit être libre ou occupe`, `la récurrence doit être aucune ou hebdomadaire`, `la date est invalide`, `la date doit être au format YYYY-MM-DD`, `l'heure doit être au format HH:mm`, `le nombre de minutes doit être compris entre 0 et 1439`, `le fuseau horaire est inconnu`, `l'identifiant du créneau n'est pas un UUID`. Le transport couvre déjà ces cas : `SLOT_INVALID` n'est pas attendu en pratique.
- Routes concernées : `POST /api/slots` (400), `GET /api/slots` (400), `PATCH /api/slots/:id` (400, 404), `DELETE /api/slots/:id` (400, 404), documentées avec `@ApiProblemResponses`.
- Les erreurs de forme restent `VALIDATION_FAILED` (400) avec `errors[]` : `type` et `recurrence` hors valeurs (`IS_IN`), `date`, `from` et `to` (`IS_CALENDAR_DATE`), `startTime` et `endTime` (`IS_SLOT_TIME`), `timeZone` (`IS_IANA_TIME_ZONE`), `id` non UUID (`IS_UUID`), champ inconnu (`PROPERTY_NOT_ALLOWED`). Un `id` non UUID renvoie donc `VALIDATION_FAILED`, et non `SLOT_INVALID`.

## Codes du module objectifs

| Code | Statut | `title` | `detail` renvoyé | Cas |
|---|---|---|---|---|
| `GOAL_INVALID` | 400 | Bad Request | « Objectif invalide : <raison>. » | titre vide après retrait des espaces ; format ou temps cible posé sur un objectif qui n'est pas un `evenement` (`POST /api/goals`, `PATCH /api/goals/:id`, y compris un PATCH qui passe un événement à un autre type sans effacer son format ou son temps cible) |
| `GOAL_TARGET_TIME_INVALID` | 400 | Bad Request | « Le temps cible doit être un nombre entier de secondes strictement positif. » | filet du Domain pour un temps cible hors de 1 à 2147483647 ; non atteignable par les routes, la validation du transport (`IS_TARGET_TIME_SECONDS`) répond avant |
| `GOAL_NOT_FOUND` | 404 | Not Found | « L'objectif demandé est introuvable. » | identifiant inconnu (`GET`, `PATCH` et `DELETE` sur `/api/goals/:id`) |

- `type` : `urn:sport-hub:problem:goal-invalid`, `urn:sport-hub:problem:goal-target-time-invalid` et `urn:sport-hub:problem:goal-not-found`.
- `GOAL_INVALID` porte une raison en clair dans `detail` : `le titre ne peut pas être vide`, `le titre dépasse 200 caractères`, `le type doit être evenement, volume ou regularite`, `la date cible est invalide`, `le format et le temps cible ne sont permis que pour un événement`, `le format doit être sprint, olympique, half, full ou autre`, `l'identifiant de l'objectif n'est pas un UUID`. Le transport couvre déjà la plupart de ces cas : seuls le titre vide et les règles de cohérence par type sont attendus en pratique.
- Routes concernées : `POST /api/goals` (400), `GET /api/goals` (400), `GET /api/goals/:id` (400, 404), `PATCH /api/goals/:id` (400, 404), `DELETE /api/goals/:id` (400, 404), documentées avec `@ApiProblemResponses`.
- Les erreurs de forme restent `VALIDATION_FAILED` (400) avec `errors[]` : titre absent ou non texte, titre de plus de 200 caractères, `type` et `eventFormat` hors valeurs (`IS_IN`), `targetDate` mal formée ou inexistante (`IS_CALENDAR_DATE`), `targetTimeSeconds` négatif, nul, non entier ou au-delà de 2147483647 (`IS_TARGET_TIME_SECONDS`), `upcoming` non booléen (`IS_BOOLEAN`), `id` non UUID (`IS_UUID`), champ inconnu (`PROPERTY_NOT_ALLOWED`). Un `id` non UUID renvoie donc `VALIDATION_FAILED`, et non `GOAL_INVALID`.

## Codes du module disciplines

| Code | Statut | `title` | `detail` renvoyé | Cas |
|---|---|---|---|---|
| `DISCIPLINE_INVALID` | 400 | Bad Request | « Discipline invalide : <raison>. » | clé de type vide après retrait des espaces (`PATCH /api/disciplines/:typeKey`, par exemple une clé composée d'espaces) ; clé de plus de 100 caractères après retrait des espaces, lue depuis le stockage |
| `DISCIPLINE_LABEL_INVALID` | 400 | Bad Request | « Libellé de discipline invalide : <raison>. » | libellé vide ou de plus de 60 caractères après retrait des espaces (`PATCH /api/disciplines/:typeKey`) ; filet du Domain, non atteignable par la route : la validation du transport répond avant (`VALIDATION_FAILED`) |
| `DISCIPLINE_NOT_FOUND` | 404 | Not Found | « La discipline demandée est introuvable. » | clé de type inconnue (`PATCH /api/disciplines/:typeKey`) |

- `type` : `urn:sport-hub:problem:discipline-invalid`, `urn:sport-hub:problem:discipline-label-invalid` et `urn:sport-hub:problem:discipline-not-found`.
- `DISCIPLINE_INVALID` porte une raison en clair dans `detail` : `la clé de type est vide` ou `la clé de type dépasse 100 caractères`. `DISCIPLINE_LABEL_INVALID` porte `le libellé ne peut pas être vide` ou `le libellé dépasse 60 caractères`.
- Routes concernées : `PATCH /api/disciplines/:typeKey` (400, 404), documentée avec `@ApiProblemResponses(400, 404)`. `GET /api/disciplines` ne renvoie pas de code métier.
- Les erreurs de forme restent `VALIDATION_FAILED` (400) avec `errors[]` : `label` absent, non texte, vide après retrait des espaces ou de plus de 60 caractères, champ inconnu (`PROPERTY_NOT_ALLOWED`). Un paramètre `typeKey` de plus de 100 caractères brut (avant retrait des espaces) est aussi `VALIDATION_FAILED`.
- Le paramètre `typeKey` n'est pas rogné par le transport : une clé faite d'espaces passe la validation de forme et donne donc `DISCIPLINE_INVALID`, alors qu'une clé avec espaces en bordure (`%20running%20`) est recherchée sous sa forme rognée.
- Un enregistrement de synchronisation ne renvoie aucun de ces codes : les clés invalides y sont ignorées (voir [Contexte disciplines](contextes/disciplines.md#modèle-et-règles)).

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
