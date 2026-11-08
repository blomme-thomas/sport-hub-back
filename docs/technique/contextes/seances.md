# Contexte seances

Bounded Context des séances planifiées : une séance a une date, une discipline, une durée totale et une liste ordonnée de modules (échauffement, éducatifs, séries, retour au calme, autre). Elle peut être créée à la main et modifiée librement ; chaque modification faite par l'utilisateur est journalisée. Code : `src/modules/seances/`. Usage mono-utilisateur. Issue #37.

Périmètre livré : création, consultation, liste par période, modification, remplacement ordonné des modules et suppression. Hors périmètre : génération de séances par l'IA (epic planning-ia) et rapprochement avec une activité Garmin (epic activites-suivi).

## Rôle

Tenir les séances planifiées (tables `sessions`, `session_modules` et `session_change_logs`, voir [Données](../donnees.md#modèles-session-session-module-et-session-change-log)). La discipline n'est qu'une clé du référentiel : elle est vérifiée à la création et à chaque changement de clé, via le port `IDisciplineCatalog`. Le module ne lit ni n'écrit les tables `disciplines` ou `activities`.

## Structure

| Couche | Fichier | Rôle |
|---|---|---|
| Domain | `domain/entities/session.entity.ts` | Aggregate root `Session` : `create`, `reconstitute`, `change`, `replaceModules` |
| Domain | `domain/value-objects/session-module.vo.ts` | `SessionModule` : position, type, durée, consigne, zones cibles, effort perçu |
| Domain | `domain/value-objects/session-status.vo.ts` | `SessionStatus` : `planifiee`, `realisee`, `manquee` (`SESSION_STATUSES`) |
| Domain | `domain/value-objects/module-type.vo.ts` | `ModuleType` : `echauffement`, `educatifs`, `series`, `retour_au_calme`, `autre` (`MODULE_TYPES`) |
| Domain | `domain/value-objects/target-zones.vo.ts` | `TargetZones` : fréquence cardiaque, allure ou puissance (plages `min`/`max`) |
| Domain | `domain/value-objects/perceived-effort.vo.ts` | `PerceivedEffort` : entier de 1 à 10 |
| Domain | `domain/value-objects/session-id.vo.ts` | `SessionId` (UUID) |
| Domain | `domain/errors/` | `InvalidSessionError` (`SESSION_INVALID`), `InvalidSessionModuleError` (`SESSION_MODULE_INVALID`), `SessionNotFoundError` (`SESSION_NOT_FOUND`), `SessionAlreadyCompletedError` (`SESSION_ALREADY_COMPLETED`), `UnknownSessionDisciplineError` (`SESSION_DISCIPLINE_UNKNOWN`) |
| Domain | `domain/ports/outbound/session.repository.port.ts` | `ISessionRepository` (token `SESSION_REPOSITORY`) |
| Domain | `domain/ports/outbound/discipline-catalog.port.ts` | `IDisciplineCatalog` (token `DISCIPLINE_CATALOG`) : `exists(typeKey)` |
| Domain | `domain/ports/outbound/seances-clock.port.ts` | Horloge `SeancesClock` (token `SEANCES_CLOCK`) : instant des entrées de journal |
| Application | `application/use-cases/` | `CreateSessionUseCase`, `ListSessionsUseCase`, `GetSessionUseCase`, `UpdateSessionUseCase`, `ReplaceSessionModulesUseCase`, `DeleteSessionUseCase` |
| Application | `application/dtos/session.dto.ts` | `SessionDto` et commandes |
| Infrastructure | `infrastructure/persistence/prisma/session.repository.adapter.ts` | `PrismaSessionRepositoryAdapter` (sauvegarde en transaction) |
| Infrastructure | `infrastructure/persistence/prisma/session.mapper.ts` | `SessionMapper` : `toDomain`, `toPersistence` |
| Infrastructure | `infrastructure/adapters/disciplines-catalog.adapter.ts` | `DisciplinesCatalogAdapter` : ACL vers `DisciplineExistsUseCase` du module `disciplines` |
| Presentation | `presentation/http/controllers/sessions.controller.ts` | `SessionsController` : `/api/sessions`, tag `seances` |
| Presentation | `presentation/http/dtos/`, `mappers/`, `validators/` | Requêtes, réponses, mapping HTTP et validateur de date calendaire |
| Composition | `seances.module.ts` | `SeancesModule` : importe `DisciplinesModule`, fournit les ports |

## Routes

| Méthode | Chemin | Effet | Erreurs |
|---|---|---|---|
| `POST` | `/api/sessions` | Crée une séance, éventuellement avec ses modules (201) | 400 |
| `GET` | `/api/sessions?from&to` | Liste les séances dont la date est dans la période, triées par date croissante | 400 |
| `GET` | `/api/sessions/:id` | Renvoie la séance avec ses modules et son journal | 400, 404 |
| `PATCH` | `/api/sessions/:id` | Modifie les champs fournis ; `null` efface description, matériel ou points d'attention | 400, 404, 409 |
| `PUT` | `/api/sessions/:id/modules` | Remplace la liste ordonnée des modules et renumérote les positions de 1 à n | 400, 404, 409 |
| `DELETE` | `/api/sessions/:id` | Supprime la séance, réalisée ou non (204) | 400, 404 |

Le journal est renvoyé avec la séance (`changeLog`) : chaque entrée porte `changedAt`, `field` et `previousValue`.

## Règles

- **Champs** : date calendaire `YYYY-MM-DD` ; discipline de 1 à 100 caractères, présente dans le référentiel ; durée entière de 1 à 1440 minutes ; description 2000 caractères au plus, matériel et points d'attention 1000 au plus. Un texte vide après retrait des espaces devient `null`.
- **Modules** : 30 au plus par séance. Les positions sont données par l'ordre de la liste (1 à n) ; aucune position n'est saisie par le client. Une durée de module suit les mêmes bornes que la séance.
- **Statut** : une séance est créée `planifiee`. Le statut peut être changé par `PATCH` vers `realisee` ou `manquee`.
- **Modification manuelle** : toute modification réelle (champ ou liste de modules différente) positionne `modifiedManually` à vrai et ajoute une entrée au journal. Une valeur identique ne journalise rien. Le journal est en ajout seul.
- **Journal** : les champs journalisés sont `date`, `disciplineTypeKey`, `durationMinutes`, `status`, `description`, `equipment`, `attentionPoints` et `modules`. Pour `modules`, `previousValue` contient la liste précédente sérialisée en JSON.
- **Séance réalisée** : elle ne peut plus être modifiée ni recevoir un nouveau remplacement de modules (409 `SESSION_ALREADY_COMPLETED`). Elle reste supprimable.
- **Période** : `from` et `to` sont inclus ; la période compte au plus 366 jours.

## Décisions

- La discipline est une clé du référentiel et non une entité partagée : le module `seances` ne porte pas le libellé, il dépend d'un port (`IDisciplineCatalog`) implémenté par une ACL vers `disciplines`. Le garde-fou `deps:check` signale cette dépendance en avertissement `modules-isolated`, comme pour les autres ACL du dépôt.
- Les modules sont remplacés en bloc (`PUT`) plutôt qu'ajoutés ou supprimés un par un : l'ordre reste ainsi toujours cohérent, positions comprises.

## Tests

- Domaine : `session.entity.spec.ts`, value objects et `session-module.vo.spec.ts`.
- Use cases : un spec par use case, avec des doubles des ports.
- Presentation : specs des DTO, du mapper HTTP et du contrôleur.
- Persistance : `session.mapper.spec.ts` (unitaire) et `test/session-repository.e2e-spec.ts` (aller-retour Prisma, remplacement des modules, journal, suppression en cascade).
- HTTP : `test/sessions.e2e-spec.ts` (création, liste, modification, réordonnancement, 409, 404, suppression).
