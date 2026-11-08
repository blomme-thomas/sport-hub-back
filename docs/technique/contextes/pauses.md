# Contexte pauses

Bounded Context des pauses : une période (blessure, vacances, autre) pendant laquelle la planification ne propose aucune séance (issue #43). Code : `src/modules/pauses/`. Usage mono-utilisateur.

Périmètre livré : création, liste, modification et suppression d'une pause, et prise en compte par la génération de planning. Hors périmètre : affichage sur le calendrier (dépôt front).

## Routes

| Méthode | Chemin | Effet | Erreurs |
|---|---|---|---|
| `POST` | `/api/pauses` | Crée une pause (201) | 400 |
| `GET` | `/api/pauses` | Liste les pauses par date de début ; `from` et `to` ne gardent que celles qui chevauchent la période | 400 |
| `PATCH` | `/api/pauses/:id` | Modifie une pause ; les champs absents sont inchangés | 400, 404 |
| `DELETE` | `/api/pauses/:id` | Supprime une pause (204) ; les séances existantes sont conservées | 400, 404 |

## Règles

- **Dates** : `startDate` et `endDate` sont des jours calendaires (AAAA-MM-JJ), bornes incluses. Une date inexistante (ex. `2026-02-30`) est refusée.
- **Fin** : `endDate` ne peut pas précéder `startDate` (400 `PAUSE_INVALID`). Une pause d'un seul jour est acceptée.
- **Motif** : `blessure`, `vacances` ou `autre`, sinon 400 `PAUSE_INVALID`.
- **Génération** : `POST /api/planning/generate` retire de la période les occurrences de créneaux tombant dans une pause. Une période entièrement en pause ne fait aucun appel au modèle et renvoie un planning vide. Une période partiellement en pause ne place rien dans sa partie en pause.
- **Séances existantes** : une pause ne modifie ni ne supprime aucune séance. Le temps d'une séance existante reste réservé pour la génération.

## Structure

| Couche | Fichier | Rôle |
|---|---|---|
| Domain | `domain/entities/pause.entity.ts` | `Pause` : création, reconstitution, `change()`, invariants (dates, ordre, motif) |
| Domain | `domain/value-objects/calendar-date.vo.ts`, `pause-reason.vo.ts` | Date calendaire réelle, motifs autorisés |
| Domain | `domain/ports/outbound/pause.repository.port.ts` | `IPauseRepository`, filtre par période, token `PAUSE_REPOSITORY` |
| Domain | `domain/errors/` | `PauseInvalidError` (`PAUSE_INVALID`), `PauseNotFoundError` (`PAUSE_NOT_FOUND`) |
| Application | `application/use-cases/` | `CreatePauseUseCase`, `ListPausesUseCase` (exposé), `UpdatePauseUseCase`, `DeletePauseUseCase` |
| Infrastructure | `infrastructure/persistence/prisma/` | Table `pauses`, mapper et adaptateur Prisma |
| Presentation | `presentation/http/controllers/pauses.controller.ts` | Routes `/api/pauses` |
| Composition | `pauses.module.ts`, `index.ts` | Façade `ListPausesUseCase` consommée par `planification` |

Côté `planification` : port `IPauseProvider` (`PAUSE_PROVIDER`), adaptateur `PausesPauseProvider` qui appelle la façade, et filtre pur `removePausedOccurrences` (`domain/services/paused-occurrences.filter.ts`), appliqué avant le calcul de capacité.

## Tests

- Unitaires : `domain/entities/pause.entity.spec.ts`, `application/use-cases/list-pauses.use-case.spec.ts`, `planification/domain/services/paused-occurrences.filter.spec.ts`, `planification/application/use-cases/generate-planning.pauses.use-case.spec.ts`.
- e2e : `test/pauses.e2e-spec.ts` (routes, puis génération avec un modèle factice et séances existantes).
