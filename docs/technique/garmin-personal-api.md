# API Garmin Personal : authentification

Cette page décrit comment `sport-hub-back` s'authentifie auprès de l'API Garmin Personal. Les faits de l'authentification viennent de l'issue #7 et de `instructions/11`. Le format de la réponse du jeton a été vérifié avec une vraie réponse Garmin. Tout le reste est marqué **non vérifié** : le spike web n'a pas pu être mené.

## Authentification

- Une clé d'API personnelle (`GARMIN_PERSONAL_API_KEY`) est échangée contre un jeton d'accès.
- Requête : `POST {GARMIN_PERSONAL_API_BASE_URL}/personalapitoken-service/personal-api/personal-api-key/token`, en-tête `Authorization: ApiKey <clé>`. La clé n'est jamais placée dans l'URL.
- URL de base par défaut : `https://personal.connectapi.garmin.com`, surchargeable par `GARMIN_PERSONAL_API_BASE_URL` (tests, et protection contre une cible non voulue).
- Réponse : le corps est un **JWT brut** (chaîne `en-tête.payload.signature`), pas un objet JSON. Il est valable 24 heures et son expiration se lit dans le claim `exp` (secondes Unix) du payload. Ses scopes sont en lecture seule (`CONNECT_READ`, `PERSONAL_API_FITNESS_READ`, `PERSONAL_API_NUTRITION_READ`, `PERSONAL_API_USER_READ`, `PERSONAL_API_WELLNESS_READ`). La signature n'est pas vérifiée : le jeton est reçu de Garmin en HTTPS et seulement réutilisé comme `Bearer`.
- Le fournisseur `GarminPersonalApiTokenProvider` garde le jeton en mémoire, le renouvelle 60 secondes avant son expiration (`exp`) et mutualise les obtentions simultanées. `invalidate()` force un nouvel échange.
- Clé absente ou vide : le démarrage de l'API n'échoue pas, l'erreur `GarminAuthenticationError` (`KEY_MISSING`) est levée à la première demande de jeton.
- Erreurs : `KEY_REJECTED` (401 ou 403), `UNEXPECTED_RESPONSE` (corps qui n'est pas un JWT, payload illisible ou claim `exp` absent ou invalide). Les indisponibilités restent des `ExternalServiceError`. Aucune erreur ni log ne contient la clé ou le jeton.

## Points non vérifiés

À confirmer manuellement dans la documentation Garmin avant la story #8.

| Sujet | Statut |
|---|---|
| Quotas et limites de débit | non vérifié, à confirmer manuellement dans la doc Garmin avant la story #8 |
| Profondeur de l'historique disponible | non vérifié, à confirmer manuellement dans la doc Garmin avant la story #8 |
| Endpoints d'activités | non vérifié, à confirmer manuellement dans la doc Garmin avant la story #8 |
| Format des réponses d'activités | non vérifié, à confirmer manuellement dans la doc Garmin avant la story #8 |
| Statuts de refus de la clé (401 ou 403) | non vérifié, à confirmer manuellement dans la doc Garmin avant la story #8 |
