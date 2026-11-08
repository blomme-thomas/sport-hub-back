# Contexte planification

Bounded Context de la planification : il calcule, à partir des créneaux et des séances, la durée disponible restante de chaque créneau libre. Ce calcul est local, sans appel à l'IA. Code : `src/modules/planification/`. Usage mono-utilisateur. Issues #38 et #39.

Périmètre livré : le calcul de placement (`ComputeFreeSlotCapacityUseCase`, issue #38) et la génération de planning par l'IA (`GeneratePlanningUseCase`, route `POST /api/planning/generate`, issue #39, voir la section dédiée). Hors périmètre : pauses (epic pauses), affichage du planning (dépôt front).

## Rôle

Répondre à la question « combien de temps reste-t-il dans chaque créneau libre pour placer des séances ? ». Le module ne stocke rien : il lit les occurrences des créneaux (module `creneaux`) et les séances (module `seances`) par période, puis calcule. Il ne lit ni n'écrit les tables des autres modules.

## Structure

| Couche | Fichier | Rôle |
|---|---|---|
| Domain | `domain/services/free-slot-capacity.calculator.ts` | `computeFreeSlotCapacity(input)` : fonction pure qui calcule la capacité restante |
| Domain | `domain/value-objects/day-interval.vo.ts` | `DayInterval` : intervalle d'un jour, validé, avec `durationMinutes` et `coveredMinutesBy` (minutes couvertes sans double compte) |
| Domain | `domain/errors/invalid-planning-interval.error.ts` | `InvalidPlanningIntervalError` (`PLANNING_INTERVAL_INVALID`) |
| Domain | `domain/ports/outbound/slot-occurrences.provider.port.ts` | `ISlotOccurrencesProvider` (token `SLOT_OCCURRENCES_PROVIDER`), type `PlanningPeriod` |
| Domain | `domain/ports/outbound/sessions.provider.port.ts` | `ISessionsProvider` (token `SESSIONS_PROVIDER`) |
| Domain | `domain/ports/outbound/planning-clock.port.ts` | `PlanningClock` (token `PLANNING_CLOCK`) : jour courant `YYYY-MM-DD` |
| Application | `application/use-cases/compute-free-slot-capacity.use-case.ts` | `ComputeFreeSlotCapacityUseCase.execute({ from, to })` |
| Application | `application/dtos/free-slot-capacity.dto.ts` | `ComputeFreeSlotCapacityQuery`, `FreeSlotCapacityDto` |
| Infrastructure | `infrastructure/adapters/slot-occurrences.adapter.ts` | `CreneauxOccurrencesAdapter` (ACL) : appelle `ListSlotOccurrencesUseCase` du module `creneaux` |
| Infrastructure | `infrastructure/adapters/sessions.adapter.ts` | `SeancesSessionsAdapter` (ACL) : appelle `ListSessionsUseCase` du module `seances` |
| Infrastructure | `infrastructure/clock/paris-planning-clock.ts` | `parisToday()` : jour courant à Paris (fuseau par défaut des créneaux) |
| Composition | `planification.module.ts` | `PlanificationModule` : importe `CreneauxModule` et `SeancesModule`, lie les ports, exporte le use case |

Les deux modules sources exportent désormais leur use case de lecture (`CreneauxModule` exporte `ListSlotOccurrencesUseCase`, `SeancesModule` exporte `ListSessionsUseCase`).

## Règles de calcul

Entrées : les occurrences de la période, les séances de la période, et le jour courant (`today`).

1. **Dates passées** : les occurrences dont la date est antérieure à `today` sont ignorées. Le jour même est inclus.
2. **Créneaux occupés** : ils ne sont jamais renvoyés. Ils retirent leur temps du créneau libre qu'ils chevauchent. Une minute couverte par plusieurs créneaux occupés n'est retirée qu'une fois. Un créneau seulement adjacent (fin égale au début) ne perd rien.
3. **Séances fixes** : une séance est fixe si son statut n'est pas `planifiee`, ou si elle a été modifiée manuellement. Une séance fixe consomme la capacité des créneaux libres **du même jour**, dans l'ordre de début (puis identifiant). Une séance planifiée non modifiée ne consomme rien : elle reste déplaçable.
4. **Plancher** : la capacité restante ne descend jamais sous zéro.
5. **Tri de la sortie** : date, puis heure de début, puis identifiant du créneau. Chaque créneau libre renvoyé a une `availableMinutes` entière, éventuellement nulle.

Les séances n'ayant pas d'heure de début, une séance fixe est comptée comme une durée à retrancher du jour, et non comme un intervalle horaire précis. Un créneau de 2 h contenant une séance fixe d'1 h laisse 60 minutes.

## Ports publics

Le calcul n'a pas de route HTTP ; la génération est exposée par `POST /api/planning/generate`. Le point d'entrée du calcul est `ComputeFreeSlotCapacityUseCase.execute(query: { from: string; to: string }): Promise<FreeSlotCapacityDto[]>`, exporté par `PlanificationModule`. Les bornes `from` et `to` sont des jours `YYYY-MM-DD` inclus, validés par les modules `creneaux` et `seances` (période inversée ou de plus de 366 jours : erreurs de ces modules).

## Tests

- `domain/services/free-slot-capacity.calculator.spec.ts` : séance fixe et séance planifiée, statuts fixes, occupation, chevauchements entre occupations, adjacence, dates passées, répartition entre créneaux, plancher à zéro, autre jour.
- `domain/value-objects/day-interval.vo.spec.ts` : validation et calcul des minutes couvertes.
- `application/use-cases/compute-free-slot-capacity.use-case.spec.ts` : transmission de la période aux deux sources et horloge.

Tests e2e : `test/planning.e2e-spec.ts` (génération) ; le calcul seul n'a pas de route.

## Génération de planning (issue #39)

Route : `POST /api/planning/generate`, corps `{ from, to?, goalId? }`, dates `YYYY-MM-DD`. Réponse `{ from, to, items }` : les séances créées (`id`, `date`, `disciplineTypeKey`, `durationMinutes`).

### Flux

1. Si `goalId` est fourni, la fin de période est la date cible de l'objectif (ACL `GetGoalUseCase` du module `objectifs`). Sans objectif, `to` est obligatoire.
2. Période refusée (400 `PLANNING_PERIOD_INVALID`) si elle est inversée, entièrement passée, de plus de 366 jours, ou si l'objectif n'a pas de date cible. Une période partiellement passée commence à aujourd'hui (Paris).
3. Les créneaux libres et les séances de la période sont lus, puis la capacité est calculée avec `reserveAllSessions` : toutes les séances existantes réservent leur temps, planifiées comprises, car elles ne sont jamais déplacées.
4. Aucun créneau libre : pas d'appel au modèle, réponse vide.
5. **Un seul appel** au modèle (`IPlanningAiGenerator`, adapter `ClaudePlanningGeneratorAdapter`). Le contenu envoyé ne contient que la période, les créneaux libres (date, heures, minutes disponibles), les séances existantes (date, discipline, durée, statut), le référentiel des disciplines et l'objectif. Aucune donnée Garmin brute (`rawPayload`, identifiant Garmin).
6. Le planning reçu est contrôlé par `validatePlanning` avant toute écriture : jours dans la période, disciplines du référentiel, modules qui tiennent dans la séance, total par jour inférieur ou égal à la capacité du jour, 60 séances au plus. Une anomalie lève 502 `PLANNING_INVALID_OUTPUT` et rien n'est créé.
7. Les séances sont créées une à une par `CreateSessionUseCase` du module `seances` (`SeancesPlanningScheduler`).

### Règles

- Les séances existantes ne sont ni déplacées, ni modifiées, ni supprimées. Leur temps reste réservé.
- Une période entièrement passée n'appelle jamais le modèle.
- La réponse du modèle doit être un unique bloc texte JSON, complet (`stop_reason` = `end_turn`), conforme au schéma zod `PLANNING_OUTPUT_SCHEMA`.

### Erreurs

| Code | Statut | Cause |
|---|---|---|
| `PLANNING_PERIOD_INVALID` | 400 | Période invalide, passée, trop longue, ou objectif sans date |
| `PLANNING_INVALID_OUTPUT` | 502 | Réponse du modèle tronquée, hors schéma, ou planning non conforme au contrôle |
| `PLANNING_GENERATION_UNAVAILABLE` | 503 | Aucune clé `ANTHROPIC_API_KEY`, ou service injoignable |
| `PLANNING_GENERATION_ACCESS_DENIED` | 502 | Clé refusée par le service |
| `GOAL_NOT_FOUND` | 404 | `goalId` inconnu (erreur du module `objectifs`) |

### Structure ajoutée

| Couche | Fichier | Rôle |
|---|---|---|
| Domain | `domain/services/planning-validator.ts` | `validatePlanning` : contrôle du planning proposé |
| Domain | `domain/value-objects/planned-session.vo.ts` | `PlannedSession`, `PlannedModule` |
| Domain | `domain/ports/outbound/planning-ai-generator.port.ts` | `IPlanningAiGenerator` (token `PLANNING_AI_GENERATOR`) |
| Domain | `domain/ports/outbound/discipline-referential.port.ts` | `IDisciplineReferential` (token `DISCIPLINE_REFERENTIAL`) |
| Domain | `domain/ports/outbound/goal-provider.port.ts` | `IGoalProvider` (token `GOAL_PROVIDER`) |
| Domain | `domain/ports/outbound/planning-scheduler.port.ts` | `IPlanningScheduler` (token `PLANNING_SCHEDULER`) |
| Domain | `domain/errors/planning-*.error.ts` | Quatre erreurs, voir le tableau ci-dessus |
| Application | `application/use-cases/generate-planning.use-case.ts` | `GeneratePlanningUseCase` |
| Infrastructure | `infrastructure/adapters/claude-planning-generator.adapter.ts` | Appel unique à Claude, traduction des erreurs du SDK |
| Infrastructure | `infrastructure/mappers/claude-planning.external-mapper.ts` | Schéma zod et lecture de la réponse |
| Infrastructure | `infrastructure/adapters/prompts/planning-generation.prompt.v1.ts` | Prompt système et prompt utilisateur (version `v1`) |
| Infrastructure | `infrastructure/adapters/{discipline-referential,goal-provider,session-scheduler}.adapter.ts` | ACL vers `disciplines`, `objectifs` et `seances` |
| Presentation | `presentation/http/controllers/planning.controller.ts` | `POST /api/planning/generate` |

### Hypothèses et écarts

- **Volume récent non transmis** : la description de l'issue prévoit le volume par discipline des dernières semaines. Il n'est pas envoyé dans cette version ; le modèle ne voit que le temps libre, les séances existantes et l'objectif.
- **Client Anthropic partagé** : le provider `ANTHROPIC_CLIENT` vit dans `src/core/anthropic/` et est utilisé par `workout-generation` et `planification`.
- **Pas d'atomicité au-delà du contrôle** : les séances sont créées une à une. Si une création échoue après les premières, les précédentes restent. Le contrôle préalable rend cet échec peu probable.
- **Fin par événement** : `goalId` utilise la date cible de l'objectif, sans le format ni le temps cible dans le planning.
