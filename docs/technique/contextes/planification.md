# Contexte planification

Bounded Context de la planification : il calcule, à partir des créneaux et des séances, la durée disponible restante de chaque créneau libre. Ce calcul est local, sans appel à l'IA. Code : `src/modules/planification/`. Usage mono-utilisateur. Issue #38.

Périmètre livré : le calcul de placement (`ComputeFreeSlotCapacityUseCase`), exporté par `PlanificationModule`. Aucune route HTTP à ce stade. Hors périmètre : génération du contenu des séances par l'IA (story #39) et pauses (epic pauses).

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

Le module n'a pas de route HTTP. Son point d'entrée est `ComputeFreeSlotCapacityUseCase.execute(query: { from: string; to: string }): Promise<FreeSlotCapacityDto[]>`, exporté par `PlanificationModule`. Les bornes `from` et `to` sont des jours `YYYY-MM-DD` inclus, validés par les modules `creneaux` et `seances` (période inversée ou de plus de 366 jours : erreurs de ces modules).

## Tests

- `domain/services/free-slot-capacity.calculator.spec.ts` : séance fixe et séance planifiée, statuts fixes, occupation, chevauchements entre occupations, adjacence, dates passées, répartition entre créneaux, plancher à zéro, autre jour.
- `domain/value-objects/day-interval.vo.spec.ts` : validation et calcul des minutes couvertes.
- `application/use-cases/compute-free-slot-capacity.use-case.spec.ts` : transmission de la période aux deux sources et horloge.

Pas de test e2e à ce stade : aucune route n'est exposée.
