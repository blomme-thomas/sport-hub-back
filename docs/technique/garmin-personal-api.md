# API Garmin Personal : authentification

Cette page décrit comment `sport-hub-back` s'authentifie auprès de l'API Garmin Personal. Les faits de l'authentification viennent de l'issue #7 et de `instructions/11`. Le format de la réponse du jeton a été vérifié avec une vraie réponse Garmin. Les endpoints d'activités, le format des réponses d'activités et les statuts 401 et 403 des endpoints de données sont confirmés par la spécification officielle (`garmin/swagger.json`, voir le [catalogue des endpoints](garmin-personal-api-endpoints.md)). Le point d'échange du jeton n'est pas dans cette spécification. Tout ce qui n'a pas de source est marqué **non vérifié**.

## Authentification

- Une clé d'API personnelle (`GARMIN_PERSONAL_API_KEY`) est échangée contre un jeton d'accès.
- Requête : `POST {GARMIN_PERSONAL_API_BASE_URL}/personalapitoken-service/personal-api/personal-api-key/token`, en-tête `Authorization: ApiKey <clé>`. La clé n'est jamais placée dans l'URL.
- URL de base par défaut : `https://personal.connectapi.garmin.com`, surchargeable par `GARMIN_PERSONAL_API_BASE_URL` (tests, et protection contre une cible non voulue).
- Réponse : le corps est un **JWT brut** (chaîne `en-tête.payload.signature`), pas un objet JSON. Il est valable 24 heures et son expiration se lit dans le claim `exp` (secondes Unix) du payload. Ses scopes sont en lecture seule (`CONNECT_READ`, `PERSONAL_API_FITNESS_READ`, `PERSONAL_API_NUTRITION_READ`, `PERSONAL_API_USER_READ`, `PERSONAL_API_WELLNESS_READ`). La signature n'est pas vérifiée : le jeton est reçu de Garmin en HTTPS et seulement réutilisé comme `Bearer`.
- Le fournisseur `GarminPersonalApiTokenProvider` garde le jeton en mémoire, le renouvelle 60 secondes avant son expiration (`exp`) et mutualise les obtentions simultanées. `invalidate()` force un nouvel échange.
- Clé absente ou vide : le démarrage de l'API n'échoue pas, l'erreur `GarminAuthenticationError` (`KEY_MISSING`) est levée à la première demande de jeton.
- Erreurs : `KEY_REJECTED` (401 ou 403), `UNEXPECTED_RESPONSE` (corps qui n'est pas un JWT, payload illisible ou claim `exp` absent ou invalide). Les indisponibilités restent des `ExternalServiceError`. Aucune erreur ni log ne contient la clé ou le jeton.

## Points non vérifiés

Statut après la story #24, sources dans la spécification officielle (`garmin/swagger.json`, opérations citées par leur chemin). Le détail par endpoint est dans le [catalogue](garmin-personal-api-endpoints.md).

| Sujet | Statut |
|---|---|
| Quotas et limites de débit | non vérifié : la spécification ne décrit ni quota ni code 429 |
| Profondeur de l'historique disponible | non vérifié pour les activités : aucune borne documentée sur `GET /activitylist-service/activities/search/activities`. Les endpoints de santé ont des fenêtres maximales (31 jours, 28 jours, 1 an selon l'endpoint) |
| Scopes du jeton par endpoint | non précisé par la spécification (aucun `securitySchemes`) |
| Endpoints d'activités | vérifié : `GET /activity-service/activity/{activityId}`, `GET /activity-service/activity/{activityId}/workouts`, `GET /activitylist-service/activities/search/activities`, `GET /download-service/files/activity/{activityId}` |
| Format des réponses d'activités | vérifié en JSON pour la liste (`SummarizedActivityDTO`) et le détail (`ActivitySummaryDTO`). Le téléchargement renvoie une archive `application/x-zip-compressed` dont le contenu n'est pas décrit : le format FIT n'est pas confirmé |
| Statuts de refus (401 ou 403) | vérifié pour les endpoints de données (descriptions de `GET /activitylist-service/activities/search/activities`). Non vérifié pour le point d'échange du jeton, absent de la spécification |
