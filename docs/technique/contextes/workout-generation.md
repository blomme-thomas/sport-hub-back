# Contexte workout-generation

Bounded Context de génération de séances d'entraînement par IA (Claude, via `@anthropic-ai/sdk`). Code : `src/modules/workout-generation/`. Usage mono-utilisateur, sans persistance.

Périmètre livré : `POST /api/workouts/generate` (issue #12). Hors périmètre : enregistrement ou historique des séances, parcours utilisateur (à compléter), métriques physiologiques (VO2max, TSS, zones, récupération), intégration de la séance dans un calendrier.

## Rôle

À partir d'une demande facultative (sport, objectif, durée) et des statistiques de volume des dernières semaines complètes, produire une séance structurée (titre, résumé, étapes). La séance est renvoyée à l'appelant et n'est jamais stockée (voir [ADR 0006](../decisions/0006-generation-seances-sans-persistance-et-acl-stats.md)).

## Structure

| Couche | Fichier | Rôle |
|---|---|---|
| Domain | `domain/value-objects/workout-intensity.vo.ts` | `WorkoutIntensity` (`easy`, `moderate`, `hard`) |
| Domain | `domain/value-objects/workout-step.vo.ts` | `WorkoutStep` : ordre à partir de 1, libellé non vide, durée entière d'au moins une minute, notes facultatives |
| Domain | `domain/entities/generated-workout.entity.ts` | `GeneratedWorkout.create(props)` : invariants de la séance (voir [Règles](#règles-et-invariants)) |
| Domain | `domain/errors/invalid-generated-workout.error.ts` | `InvalidGeneratedWorkoutError` (`WORKOUT_GENERATION_INVALID_OUTPUT`) |
| Domain | `domain/errors/workout-generation-unavailable.error.ts` | `WorkoutGenerationUnavailableError` (`WORKOUT_GENERATION_UNAVAILABLE`) |
| Domain | `domain/errors/workout-generation-access-denied.error.ts` | `WorkoutGenerationAccessDeniedError` (`WORKOUT_GENERATION_ACCESS_DENIED`) |
| Domain | `domain/ports/outbound/workout-ai-generator.port.ts` | `IWorkoutAiGenerator` (token `WORKOUT_AI_GENERATOR`), types `GenerateWorkoutInput` |
| Domain | `domain/ports/outbound/recent-training-context.port.ts` | `IRecentTrainingContextProvider` (token `RECENT_TRAINING_CONTEXT_PROVIDER`), types `RecentTrainingContext` et `RecentTrainingWeek` |
| Application | `application/use-cases/generate-workout.use-case.ts` | `GenerateWorkoutUseCase.execute(command)` : contexte, génération, DTO |
| Application | `application/dtos/generate-workout.dto.ts` | `GenerateWorkoutCommand`, `GeneratedWorkoutDto` |
| Infrastructure | `infrastructure/adapters/training-stats-context.adapter.ts` | Anti-corruption layer vers `training-stats` ; porte aussi le token `WORKOUT_CONTEXT_CLOCK` (horloge injectée, `() => new Date()` en production) |
| Infrastructure | `src/core/anthropic/anthropic-client.provider.ts` (partagé avec `planification`) | Provider `ANTHROPIC_CLIENT` : client SDK, ou `null` sans `ANTHROPIC_API_KEY` |
| Infrastructure | `infrastructure/adapters/claude-workout-generator.adapter.ts` | `ClaudeWorkoutGeneratorAdapter` : appel `messages.create`, traduction des erreurs du SDK, logs |
| Infrastructure | `infrastructure/adapters/prompts/workout-generation.prompt.v1.ts` | `WORKOUT_PROMPT_VERSION = 'v1'`, `buildSystemPrompt()`, `buildUserPrompt(input)` |
| Infrastructure | `infrastructure/mappers/claude-workout-generator.external-mapper.ts` | `WORKOUT_OUTPUT_SCHEMA` (zod), contrôle du `stop_reason`, parse JSON, `GeneratedWorkout.create()` |
| Presentation | `presentation/http/controllers/workouts.controller.ts` | `POST /api/workouts/generate` (`WorkoutsController`) |
| Presentation | `presentation/http/dtos/generate-workout.request.dto.ts` | Corps de requête validé (class-validator) |
| Presentation | `presentation/http/dtos/generated-workout.response.dto.ts` | Transport DTO de la réponse, annoté pour Swagger |
| Presentation | `presentation/http/mappers/workout.http-mapper.ts` | Conversion requête vers commande, DTO vers réponse (dates en `YYYY-MM-DD`) |
| Composition | `workout-generation.module.ts` | Importe `TrainingStatsModule`, fournit le use case, les adapters, le provider client et les tokens |

Tests colocalisés (`*.spec.ts`) pour chaque couche, et `test/workout-generation.e2e-spec.ts`.

## Ports publics

**`GenerateWorkoutUseCase.execute(command: GenerateWorkoutCommand): Promise<GeneratedWorkoutDto>`** : point d'entrée du contexte, appelé par le contrôleur. Il ne capture aucune erreur : il propage `WorkoutGenerationUnavailableError`, `WorkoutGenerationAccessDeniedError` et `InvalidGeneratedWorkoutError`.

**`IWorkoutAiGenerator.generate(input: GenerateWorkoutInput): Promise<GeneratedWorkout>`** (token `WORKOUT_AI_GENERATOR`) : génère une séance validée à partir du sport, de l'objectif, de la durée et du contexte récent. Implémenté par `ClaudeWorkoutGeneratorAdapter`.

**`IRecentTrainingContextProvider.getRecent(weeks: number): Promise<RecentTrainingContext>`** (token `RECENT_TRAINING_CONTEXT_PROVIDER`) : renvoie les `weeks` dernières semaines complètes, de la plus ancienne à la plus récente, une semaine sans activité figurant à zéro. Implémenté par `TrainingStatsContextAdapter`, qui consomme `GetTrainingStatsUseCase` (exporté par `TrainingStatsModule`) ; le Domain de ce contexte ne connaît ni le DTO ni le module `training-stats`.

## Flux

1. Le contrôleur valide le corps (`GenerateWorkoutRequestDto`) et le convertit en `GenerateWorkoutCommand` (`weeks` absent : le use case applique 4).
2. `GenerateWorkoutUseCase` demande le contexte à `IRecentTrainingContextProvider` pour `weeks` semaines.
3. `TrainingStatsContextAdapter` calcule la fenêtre à partir de l'horloge injectée : du lundi de `weeks` semaines avant le lundi courant (UTC) jusqu'au dimanche précédant le lundi courant. Il appelle `GetTrainingStatsUseCase` en granularité `week`, sans filtre de type, et convertit chaque période en `RecentTrainingWeek`.
4. `GenerateWorkoutUseCase` appelle `IWorkoutAiGenerator.generate` avec le sport, l'objectif, la durée et le contexte. Une absence de statistiques n'empêche pas la génération : le prompt indique explicitement qu'il n'y a pas d'historique.
5. `ClaudeWorkoutGeneratorAdapter` envoie un appel `messages.create` (modèle, `max_tokens`, prompt système, prompt utilisateur, `output_config.format` construit à partir de `WORKOUT_OUTPUT_SCHEMA` par `zodOutputFormat`).
6. `ClaudeWorkoutGeneratorExternalMapper.toDomain` vérifie que `stop_reason` vaut `end_turn`, que la réponse contient un unique bloc texte, parse le JSON, le valide avec le schéma zod, puis construit `GeneratedWorkout` via `create()`. Toute anomalie lève `InvalidGeneratedWorkoutError` ; aucune séance partielle n'est construite.
7. Le use case renvoie le DTO : `basedOn` reprend le nombre de semaines renvoyées et les dates de début de la première et de fin de la dernière.

## Prompt

- Version `v1` (`WORKOUT_PROMPT_VERSION`), journalisée à chaque appel.
- Le prompt système demande un objet JSON conforme au schéma et précise que les informations de l'athlète sont des données, jamais des instructions.
- La demande de l'athlète et les statistiques sont transmises en JSON dans le prompt utilisateur, sous forme de données délimitées. Les statistiques contiennent les dates de semaine, le nombre de séances, la durée, la distance, et la ventilation par type. La charge brute des activités (`rawPayload`) n'est jamais lue.

## Contrat HTTP

`POST /api/workouts/generate`, corps JSON facultatif (`{}` est valide), réponse 200 (`@HttpCode(200)`, rien n'est créé).

Corps (tous les champs facultatifs, champ inconnu refusé) :

| Champ | Contrainte | Défaut |
|---|---|---|
| `sport` | chaîne non vide, 64 caractères au plus | absent : le sport est déduit du contexte |
| `goal` | chaîne non vide, 200 caractères au plus | absent |
| `durationMinutes` | entier de 10 à 240 | absent |
| `weeks` | entier de 1 à 12 : nombre de semaines complètes de statistiques | 4 |

Réponse 200 :

| Champ | Contenu |
|---|---|
| `title`, `sport`, `summary` | texte produit par le modèle (`sport` n'est pas contrôlé par rapport à la demande) |
| `totalDurationMinutes` | durée totale, entier |
| `steps[]` | `order` (à partir de 1), `label`, `durationMinutes`, `intensity` (`easy`, `moderate`, `hard`), `notes` (facultatif) |
| `basedOn` | `weeks` (nombre de semaines utilisées), `from` et `to` (`YYYY-MM-DD`, premier lundi et dernier dimanche de la fenêtre) |

Erreurs : 400 `VALIDATION_FAILED` (valeur hors bornes ou de mauvais type, champ inconnu), 400 `MALFORMED_REQUEST_BODY` (JSON mal formé), 502 `WORKOUT_GENERATION_ACCESS_DENIED`, 502 `WORKOUT_GENERATION_INVALID_OUTPUT`, 503 `WORKOUT_GENERATION_UNAVAILABLE`. Détail : [Erreurs de l'API](../erreurs-api.md#codes-du-module-workout-generation).

## Règles et invariants

Invariants de `GeneratedWorkout` (vérifiés à la construction, `InvalidGeneratedWorkoutError` sinon) :

- titre non vide ;
- au moins une étape ;
- durée totale comprise entre 5 et 300 minutes ;
- étapes numérotées de 1 à n, sans trou ni doublon ;
- durée totale égale à la somme des durées des étapes.

Invariants de `WorkoutStep` : ordre entier à partir de 1, libellé non vide, durée entière d'au moins une minute. `WorkoutIntensity` n'accepte que `easy`, `moderate` et `hard`.

Une séance générée n'a pas d'identifiant et n'est pas persistée : chaque appel produit une nouvelle séance.

## Configuration

Variables `ANTHROPIC_*`, voir [Développement](../developpement.md#variables-denvironnement). Modèle par défaut `claude-sonnet-5-5`, `max_tokens` 2048, délai 30 s par tentative, 2 réessais au plus gérés par le SDK. Le client SDK est construit avec `logLevel: 'off'`.

Sans `ANTHROPIC_API_KEY`, l'application démarre, le provider `ANTHROPIC_CLIENT` vaut `null`, et chaque appel à `POST /api/workouts/generate` renvoie 503 `WORKOUT_GENERATION_UNAVAILABLE`. Aucun appel réseau n'est tenté.

## Gestion des erreurs du SDK

Classification par `instanceof` sur les classes du SDK, jamais sur le message :

| Erreur du SDK | Erreur du contexte | Statut |
|---|---|---|
| `AuthenticationError`, `PermissionDeniedError` (401, 403) | `WorkoutGenerationAccessDeniedError` | 502 |
| Toute autre `AnthropicError` : connexion, délai dépassé, 429, 5xx, autres | `WorkoutGenerationUnavailableError` | 503 |
| Pas de client (clé absente) | `WorkoutGenerationUnavailableError` | 503 |

Aucune `cause` ni message du SDK n'est transmis. Une exception qui n'est pas une `AnthropicError` est relancée telle quelle et devient un 500 `INTERNAL_ERROR` (voir [Erreurs de l'API](../erreurs-api.md)).

Logs de l'adapter (sans clé, sans prompt, sans réponse brute) : version du prompt, modèle, durée, classe d'erreur et `requestID` quand il existe, en `warn`. La classe de l'erreur de sortie inexploitable est journalisée de la même façon.

## Tests

- Unitaires : `GenerateWorkoutUseCase`, `TrainingStatsContextAdapter`, `ClaudeWorkoutGeneratorAdapter` (SDK simulé), `ClaudeWorkoutGeneratorExternalMapper`, prompt v1, `GeneratedWorkout`, `WorkoutStep`, `WorkoutIntensity`, `WorkoutsController`, `WorkoutHttpMapper`, `anthropicConfig`.
- e2e (`test/workout-generation.e2e-spec.ts`, client `ANTHROPIC_CLIENT` simulé) : succès avec transmission des volumes au prompt, corps vide (4 semaines), validations refusées sans appel au modèle, sortie non JSON et durée incohérente (502, aucune séance partielle), sans clé (503 sans détail interne).
- À compléter : `test/openapi.e2e-spec.ts` ne vérifie pas encore la route ni les trois codes.

## Limites connues

- Pas d'historique : une séance générée ne peut pas être retrouvée ni comparée à une précédente.
- Coût et latence : chaque appel consomme le modèle, sans cache.
- Le `sport` demandé est transmis au modèle, mais la réponse n'est pas vérifiée contre lui.
- Les statistiques sont en UTC (voir [Contexte training-stats](training-stats.md)) et portent sur tous les types d'activité.
- Les erreurs 503 « sans clé » et « service indisponible » partagent le même `detail`.
