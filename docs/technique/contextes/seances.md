# Contexte seances

Bounded Context des séances planifiées : une séance a une date, une discipline, une durée totale et une liste ordonnée de modules (échauffement, éducatifs, séries, retour au calme, autre). Elle peut être créée à la main et modifiée librement ; chaque modification faite par l'utilisateur est journalisée. Code : `src/modules/seances/`. Usage mono-utilisateur. Issue #37.

Périmètre livré : création, consultation, liste par période, séances hebdomadaires et liste des occurrences (issue #75), déplacement, annulation et restauration d'une occurrence (issue #76), modification, remplacement ordonné des modules, suppression, et rapprochement avec les activités Garmin réalisées (issue #40). Hors périmètre : génération de séances par l'IA (epic planning-ia), affichage côte à côte (dépôt front) et commentaire sur l'activité (epic conseils-bilans).

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
| `GET` | `/api/sessions?from&to` | Liste les **occurrences** des séances dans la période (bornes incluses), triées par date, heure puis identifiant (voir [Récurrence](#récurrence)) | 400 |
| `GET` | `/api/sessions/:id` | Renvoie la séance avec ses modules et son journal | 400, 404 |
| `PATCH` | `/api/sessions/:id` | Modifie les champs fournis ; `null` efface description, matériel ou points d'attention | 400, 404, 409 |
| `PUT` | `/api/sessions/:id/modules` | Remplace la liste ordonnée des modules et renumérote les positions de 1 à n | 400, 404, 409 |
| `DELETE` | `/api/sessions/:id` | Supprime la séance, réalisée ou non (204) | 400, 404 |
| `POST` | `/api/sessions/reconcile?from&to` | Rapproche automatiquement les séances planifiées de la période avec les activités du même jour et de la même discipline ; renvoie les couples créés (`items`) | 400 |
| `PUT` | `/api/sessions/:id/activity` | Associe manuellement une activité du même jour, en remplaçant le lien précédent | 400, 404, 409 |
| `DELETE` | `/api/sessions/:id/activity` | Dissocie l'activité liée (204) ; sans effet s'il n'y a pas de lien | 400, 404 |
| `PUT` | `/api/sessions/:id/occurrences/:date` | Déplace une occurrence vers une autre date, heure facultative (voir [Occurrences](#occurrences-déplacées-annulées-et-restaurées)) | 400, 404 |
| `POST` | `/api/sessions/:id/occurrences/:date/cancel` | Annule une occurrence, qui reste listée avec le statut `annulee` | 400, 404 |
| `DELETE` | `/api/sessions/:id/occurrences/:date/exception` | Restaure une occurrence à sa programmation initiale (204) ; sans effet si non modifiée | 400, 404 |

## Récurrence

- Une séance a une récurrence : `aucune` (défaut) ou `hebdomadaire` (issue #75). Elle se choisit à la création (`POST /api/sessions`) et se modifie par `PATCH` ; une modification vaut pour toute la série.
- Une séance hebdomadaire se répète chaque semaine, à la même heure, sans date de fin.
- `GET /api/sessions?from&to` renvoie les occurrences : chacune porte `sessionId`, `date`, `startTime`, `durationMinutes`, `disciplineTypeKey`, `recurrence` et `status`. Une occurrence reprend le statut de la série.
- Le calcul est un service de domaine pur (`session-occurrences.ts`) ; le repository renvoie les séances candidates (datées avant `to` et dans la période, ou hebdomadaires).
- Hors périmètre à ce jour : les autres routes de lecture (`GET /api/sessions/:id`, calendrier, planification, conseils et réconciliation) ne voient que la date de base de la série.

## Occurrences déplacées, annulées et restaurées

- `:date` est la date de programmation de l'occurrence dans la série, avant tout déplacement. Une date qui n'en est pas une renvoie 404 `SESSION_OCCURRENCE_NOT_FOUND`.
- Une exception (table `session_occurrence_exceptions`, une par occurrence, supprimée avec la série) porte la nouvelle date, une heure facultative et l'annulation. Elle est séparée de la séance : les modifications de la série la gardent.
- Déplacer : `PUT` avec `date` et `startTime` facultatif (absent = heure de la série). Aucune règle de chevauchement. Déplacer une occurrence annulée la réactive (hypothèse).
- Annuler : `POST …/cancel`. L'occurrence reste listée avec le statut `annulee`, à sa date ou à sa date déplacée.
- Restaurer : `DELETE …/exception` supprime l'exception (204).
- La liste applique les exceptions : une occurrence déplacée apparaît à sa nouvelle date, même si la date de programmation est hors période, et disparaît de l'ancienne.

Le journal est renvoyé avec la séance (`changeLog`) : chaque entrée porte `changedAt`, `field` et `previousValue`. L'activité liée est renvoyée dans `activity` (`id`, `origin`, `linkedAt`), ou `null`.

## Rapprochement avec les activités

Le lien entre une séance et une activité Garmin est persisté dans `session_activity_links` (voir [Données](../donnees.md#modèles-session-session-module-et-session-change-log)). Une activité ne peut être liée qu'à une seule séance, et une séance qu'à une seule activité.

- **Rapprochement automatique** (`POST /api/sessions/reconcile`) : pour chaque couple (jour local de Paris, discipline), lie la séance à l'activité seulement s'il existe exactement une séance candidate et exactement une activité candidate. Candidates : séances `planifiee` sans lien, activités sans lien. Un cas ambigu (deux activités ou deux séances) reste en attente. Lien d'origine `automatique`.
- **Choix manuel** (`PUT /activity`) : l'activité doit être du même jour que la séance, sinon 404 `SESSION_ACTIVITY_NOT_FOUND` ; une activité liée à une autre séance donne 409 `SESSION_ACTIVITY_ALREADY_LINKED`. Remplace le lien précédent. Lien d'origine `manuel`.
- **Effet sur le statut** : lier une séance `planifiee` ou `manquee` la passe à `realisee`. Dissocier ne modifie pas le statut. Le lien ne journalise rien et ne positionne pas `modifiedManually`.
- **Lecture des activités** : l'ACL `GarminActivityCatalogAdapter` appelle `ListActivitiesUseCase` du module `garmin-sync` et convertit chaque date de début en jour de Paris. Le module ne lit pas la table `activities`.

Hypothèse : le rapprochement n'est pas déclenché par la synchronisation Garmin ; il se lance par l'appel de `POST /api/sessions/reconcile`.

## Règles

- **Champs** : date calendaire `YYYY-MM-DD` ; récurrence `aucune` ou `hebdomadaire` ; discipline de 1 à 100 caractères, présente dans le référentiel ; durée entière de 1 à 1440 minutes ; description 2000 caractères au plus, matériel et points d'attention 1000 au plus. Un texte vide après retrait des espaces devient `null`.
- **Modules** : 30 au plus par séance. Les positions sont données par l'ordre de la liste (1 à n) ; aucune position n'est saisie par le client. Une durée de module suit les mêmes bornes que la séance.
- **Statut** : une séance est créée `planifiee`. Le statut peut être changé par `PATCH` vers `realisee` ou `manquee`.
- **Modification manuelle** : toute modification réelle (champ ou liste de modules différente) positionne `modifiedManually` à vrai et ajoute une entrée au journal. Une valeur identique ne journalise rien. Le journal est en ajout seul.
- **Journal** : les champs journalisés sont `date`, `disciplineTypeKey`, `durationMinutes`, `recurrence`, `status`, `description`, `equipment`, `attentionPoints` et `modules`. Pour `modules`, `previousValue` contient la liste précédente sérialisée en JSON.
- **Séance réalisée** : elle ne peut plus être modifiée ni recevoir un nouveau remplacement de modules (409 `SESSION_ALREADY_COMPLETED`). Elle reste supprimable.
- **Période** : `from` et `to` sont inclus ; la période compte au plus 366 jours.

## Décisions

- La discipline est une clé du référentiel et non une entité partagée : le module `seances` ne porte pas le libellé, il dépend d'un port (`IDisciplineCatalog`) implémenté par une ACL vers `disciplines`. Le garde-fou `deps:check` (`modules-public-api-only`) n'accepte cette dépendance que via la façade `disciplines/index.ts`.
- Les modules sont remplacés en bloc (`PUT`) plutôt qu'ajoutés ou supprimés un par un : l'ordre reste ainsi toujours cohérent, positions comprises.

## Tests

- Domaine : `session.entity.spec.ts`, value objects et `session-module.vo.spec.ts`.
- Use cases : un spec par use case, avec des doubles des ports.
- Presentation : specs des DTO, du mapper HTTP et du contrôleur.
- Persistance : `session.mapper.spec.ts` (unitaire) et `test/session-repository.e2e-spec.ts` (aller-retour Prisma, remplacement des modules, journal, suppression en cascade).
- HTTP : `test/sessions.e2e-spec.ts` (création, liste, modification, réordonnancement, 409, 404, suppression).

## Objectifs et réalisation (issue #86)

- Une séance porte une **répartition cible par zone de FC** (`targetHrZonePercentages`, Z1 à Z5, entiers de 0 à 100 qui totalisent 100), obligatoire à la création (400 `VALIDATION_FAILED`), modifiable par `PATCH`. Les séances existantes gardent `null`.
- Une **distance visée** (`targetDistanceMeters`, strictement positive) est facultative ; `null` l'efface à la modification.
- La durée visée est `durationMinutes`, déjà obligatoire : la règle « distance ou durée » est donc toujours satisfaite.
- `GET /api/sessions/:id` renvoie `achievement` si la séance a un objectif et une activité liée : `distanceRate` (distance réelle / visée, plafonné à 100), `durationRate` (durée réelle / visée, plafonné à 100) et `zoneGapsPoints` (écart réel − visé par zone, en points, signé, non plafonné). Les valeurs sont lues en base via l'ACL `GarminSessionActivityMetricsAdapter`, sans appel à Garmin.
- `hrTimeInZone` est supposé en secondes (non confirmé par la spécification).
- Non réalisé : la réalisation dans la liste des occurrences. Une série n'a qu'une seule activité liée ; la réalisation par occurrence reste à décider.

## Heure de début (issue #44)

- Une séance peut porter une heure de début `startTime` au format `HH:MM` (00:00 à 23:59), facultative. `null` ou absente : la séance n'a pas d'heure.
- La fin n'est pas stockée : elle vaut début + `durationMinutes`.
- Création : `POST /api/sessions` accepte `startTime`. Modification : `PATCH /api/sessions/:id` accepte `startTime` ; `null` efface l'heure.
- Une modification d'heure est journalisée (champ `startTime`) et positionne `modifiedManually`, comme les autres champs.
- L'heure est exportée par le calendrier ICS (`GET /api/calendar.ics`, voir [calendrier](calendrier.md)).
