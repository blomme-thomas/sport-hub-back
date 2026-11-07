# ADR 0004 : erreurs techniques Garmin modélisées en DomainError

Statut : accepté (issue #8).

## Contexte
La synchronisation Garmin peut échouer pour deux raisons : la clé ou le jeton est refusé (502), ou Garmin est indisponible (503). L'issue demande une erreur applicative propre, sans détail interne. Les erreurs techniques de l'adapter (`ExternalServiceError`, `GarminAuthenticationError`) ne doivent pas atteindre le filtre (elles deviendraient un 500 `INTERNAL_ERROR`) ni être connues du Domain ou de l'Application (`deps:check` interdit `src/core/http` à ces couches). Le Domain ne doit pas non plus dépendre de HTTP.

L'ADR 0003 a écarté `DomainError` pour la base de données, qui est une dépendance de l'application elle-même (démarrage, health check). Ici, la dépendance est un système tiers appelé par un use case.

## Décision
- `GarminAccessDeniedError` (`GARMIN_ACCESS_DENIED`) et `GarminUnavailableError` (`GARMIN_UNAVAILABLE`) étendent `DomainError` et vivent dans `domain/errors/` du module `garmin-sync`.
- Leurs statuts sont déclarés dans `DOMAIN_ERROR_STATUS` : 502 pour l'accès refusé, 503 pour l'indisponibilité.
- L'adapter `GarminConnectAdapter` (anti-corruption layer) traduit les erreurs techniques vers ces erreurs ; aucune `cause` n'est transmise.
- Les messages sont fixes et génériques ; le filtre renvoie le `message` d'une `DomainError` 5xx sans le masquer, il ne doit donc contenir aucune donnée interne.

## Conséquences
- Écart assumé avec la distinction Business Error / Technical Error de `00` : ces erreurs sont techniques par nature, mais elles sont exposées sous forme de codes publics stables, à la manière d'une Business Error, pour que l'API documente le statut et le code.
- Les codes deviennent un contrat public : ils ne se renomment pas, et `openapi.e2e-spec.ts` vérifie leur présence dans l'enum `ProblemCode`.
- Un nouvel échec Garmin doit être traduit dans l'adapter, sinon il tombe en 500 `INTERNAL_ERROR`.
- Les clés de la table sont des chaînes littérales non vérifiées par le compilateur (voir [ADR 0001](0001-table-centralisee-code-statut.md)).
- Le use case ne capture rien : il propage les erreurs de l'adapter.

Détail : [Erreurs de l'API](../erreurs-api.md#codes-du-module-garmin-sync), [Contexte garmin-sync](../contextes/garmin-sync.md).
