# ADR 0006 : génération de séances sans persistance, statistiques lues par ACL, erreurs IA en DomainError

Statut : accepté (issue #12).

## Contexte
La story #12 demande une séance d'entraînement générée par Claude à partir des statistiques récentes. Les critères livrés ne demandent pas d'historique des séances : la persistance est une hypothèse du plan, non une exigence. Le contexte d'entrée est fourni par `training-stats` (story #11), qui possède le calcul de volume ; le nouveau module ne doit ni importer son Domain ni lire la table `activities` à sa place.

Les erreurs d'un système tiers (Claude) posent le même problème que pour Garmin : une erreur technique ne doit ni atteindre le filtre comme 500 `INTERNAL_ERROR`, ni transporter le détail du SDK (voir [ADR 0004](0004-erreurs-techniques-garmin-en-domain-error.md)).

## Décision
- **Aucune persistance** : pas de modèle Prisma, pas de migration, pas de Repository. `POST /api/workouts/generate` renvoie la séance sans l'enregistrer. `docs/technique/donnees.md` reste inchangé.
- **ACL vers `training-stats`** : `TrainingStatsContextAdapter` (infrastructure) implémente le port `IRecentTrainingContextProvider` et appelle `GetTrainingStatsUseCase`, exporté par `TrainingStatsModule`, en granularité semaine. Le Domain et l'Application de `workout-generation` manipulent le modèle propre `RecentTrainingContext`, sans le DTO de statistiques.
- **Erreurs IA en DomainError** sur le modèle de l'ADR 0004 : `WORKOUT_GENERATION_UNAVAILABLE` (503), `WORKOUT_GENERATION_ACCESS_DENIED` (502) et `WORKOUT_GENERATION_INVALID_OUTPUT` (502), déclarés dans `DOMAIN_ERROR_STATUS`, sans `cause`, avec des messages fixes.
- **Classification par `instanceof`** dans `ClaudeWorkoutGeneratorAdapter` : `AuthenticationError` et `PermissionDeniedError` vont en `ACCESS_DENIED` ; toute autre `AnthropicError` (connexion, délai, 429, 5xx) va en `UNAVAILABLE`. L'absence de clé va en `UNAVAILABLE` sans appel réseau.
- **Sortie du modèle validée deux fois** : schéma zod, puis `GeneratedWorkout.create()`. Toute anomalie lève `INVALID_OUTPUT`, et aucune séance partielle n'est renvoyée.

## Conséquences
- Aucune séance n'est conservée : elle ne peut pas être retrouvée ni comparée à une séance précédente. Si l'historique est demandé plus tard, il faudra un modèle `Workout`, une migration, un Aggregate Root, un `IWorkoutRepository` et un adapter Prisma, puis mettre à jour `donnees.md`.
- `workout-generation` dépend du contrat `GetTrainingStatsUseCase` et de son DTO. Une modification de ce contrat doit être répercutée dans l'ACL. `deps:check` ne vérifie que par un avertissement l'isolation entre modules.
- Chaque appel consomme le modèle, sans cache. Les réessais sont bornés par `ANTHROPIC_MAX_RETRIES` (2 par défaut) et le délai par `ANTHROPIC_TIMEOUT_MS`.
- Écart assumé avec la distinction Technical Error / Business Error de `00`, comme dans l'ADR 0004 : l'échec du service d'IA est exposé comme code public stable. Les codes sont des contrats publics et ne se renomment pas.
- Une exception qui n'est pas une `AnthropicError` côté adapter devient un 500 `INTERNAL_ERROR`.

Détail : [Erreurs de l'API](../erreurs-api.md#codes-du-module-workout-generation), [Contexte workout-generation](../contextes/workout-generation.md), [Contexte training-stats](../contextes/training-stats.md).
