# Contexte creneaux

Bounded Context des créneaux de disponibilité : l'utilisateur saisit des plages horaires libres ou occupées, ponctuelles ou hebdomadaires, et les consulte par période sous forme d'occurrences. Code : `src/modules/creneaux/`. Usage mono-utilisateur.

Périmètre livré : issue #35 (création, consultation par période, modification, suppression ; `/api/slots`). Hors périmètre : génération de séances qui consommera les créneaux (story à venir), règle de résolution des chevauchements, interface de calendrier (dépôt front), fuseau horaire utilisé pour les calculs (voir [ADR 0009](../decisions/0009-creneaux-heure-murale-locale.md)).

## Rôle

Persister les créneaux (table `slots`, voir [Données](../donnees.md#modèle-slot-table-slots)) et les développer à la demande en occurrences sur une période. Aucune occurrence n'est stockée : l'expansion est une méthode de l'Entity `Slot` (`Slot.occurrencesIn(period)`), donc une règle du Domain.

## Structure

| Couche | Fichier | Rôle |
|---|---|---|
| Domain | `domain/entities/slot.entity.ts` | Aggregate Root `Slot` : `create`, `reconstitute`, `change` (fusion et revalidation), `occurrencesIn` |
| Domain | `domain/value-objects/slot-id.vo.ts` | `SlotId` : UUID, `generate()` (`node:crypto`), `create(text)` |
| Domain | `domain/value-objects/local-time.vo.ts` | `LocalTime` : heure `HH:mm` stockée en minutes depuis minuit |
| Domain | `domain/value-objects/calendar-day.vo.ts` | `CalendarDay` : date `YYYY-MM-DD` réelle, convertie en minuit UTC (étiquette de jour) |
| Domain | `domain/value-objects/slot-type.vo.ts` | `SLOT_TYPES` (`libre`, `occupe`), type `SlotType`, garde `isSlotType` |
| Domain | `domain/value-objects/slot-recurrence.vo.ts` | `SLOT_RECURRENCES` (`aucune`, `hebdomadaire`), type `SlotRecurrence`, garde `isSlotRecurrence` |
| Domain | `domain/value-objects/slot-time-zone.vo.ts` | `SlotTimeZone` : fuseau IANA reconnu par `Intl`, métadonnée |
| Domain | `domain/value-objects/slot-period.vo.ts` | `SlotPeriod` : période de jours bornes incluses, 366 jours au plus (`MAX_SLOT_PERIOD_DAYS`), `contains`, `days` |
| Domain | `domain/value-objects/slot-occurrence.vo.ts` | `SlotOccurrence` : occurrence en lecture seule |
| Domain | `domain/errors/` | Cinq Business Errors, voir [Erreurs de l'API](../erreurs-api.md#codes-du-module-creneaux) |
| Domain | `domain/ports/outbound/slot.repository.port.ts` | `ISlotRepository` (token `SLOT_REPOSITORY`) |
| Application | `application/use-cases/create-slot.use-case.ts` | `CreateSlotUseCase` |
| Application | `application/use-cases/update-slot.use-case.ts` | `UpdateSlotUseCase` |
| Application | `application/use-cases/delete-slot.use-case.ts` | `DeleteSlotUseCase` |
| Application | `application/use-cases/list-slot-occurrences.use-case.ts` | `ListSlotOccurrencesUseCase` |
| Application | `application/dtos/slot.dto.ts` | Commandes et requête (`CreateSlotCommand`, `UpdateSlotCommand`, `ListSlotOccurrencesQuery`), DTO de sortie (`SlotDto`, `SlotOccurrenceDto`, `SlotOccurrencesDto`) |
| Infrastructure | `infrastructure/persistence/prisma/slot.repository.adapter.ts` | `PrismaSlotRepositoryAdapter` |
| Infrastructure | `infrastructure/persistence/prisma/slot.mapper.ts` | `SlotMapper` : `toDomain`, `toPersistence` |
| Presentation | `presentation/http/controllers/slots.controller.ts` | `SlotsController` : `/api/slots`, tag `creneaux` |
| Presentation | `presentation/http/dtos/` | Requêtes validées (`create-slot`, `update-slot`, `list-slots`, `slot-id.param`) et DTO de réponse (`slot.response`, `slot-occurrences.response`) |
| Presentation | `presentation/http/validators/slot.validators.ts` | Validateurs class-validator partagés par les DTO : `IsCalendarDate`, `IsSlotTime`, `IsIanaTimeZone` |
| Presentation | `presentation/http/mappers/slot.http-mapper.ts` | `SlotHttpMapper` : DTO applicatifs vers réponses HTTP |
| Composition | `creneaux.module.ts` | `CreneauxModule` : contrôleur, quatre use cases, `SLOT_REPOSITORY` lié à `PrismaSlotRepositoryAdapter` |

Les tests unitaires sont colocalisés (`*.spec.ts`). Les tests d'intégration sont `test/slot-repository.e2e-spec.ts` (adapter) et `test/slots.e2e-spec.ts` (routes).

## Ports publics

Le module n'exporte rien (`CreneauxModule` n'a pas de `exports`) : aucun autre module ne le consomme à ce jour. Les points d'entrée sont les routes HTTP, qui appellent les use cases :

- `CreateSlotUseCase.execute(command: CreateSlotCommand): Promise<SlotDto>` ;
- `UpdateSlotUseCase.execute(command: UpdateSlotCommand): Promise<SlotDto>` : lève `SlotNotFoundError` si l'identifiant est inconnu ;
- `DeleteSlotUseCase.execute(id: string): Promise<void>` : lève `SlotNotFoundError` si l'identifiant est inconnu ;
- `ListSlotOccurrencesUseCase.execute(query: ListSlotOccurrencesQuery): Promise<SlotOccurrencesDto>`.

Port de persistance `ISlotRepository` (`domain/ports/outbound/slot.repository.port.ts`) :

- `findById(id): Promise<Slot | null>` ;
- `findIntersecting(period): Promise<Slot[]>` : les créneaux ponctuels dont la date est dans la période et les créneaux hebdomadaires dont la date d'ancrage est antérieure ou égale à la fin de la période. Le filtrage fin est fait par `Slot.occurrencesIn` ;
- `save(slot): Promise<void>` : crée ou met à jour (même identifiant) ;
- `delete(id): Promise<void>` : sans effet si l'identifiant n'existe pas.

## Route

| Méthode et chemin | Entrée | Succès | Erreurs documentées |
|---|---|---|---|
| `POST /api/slots` | corps `{ type, date, startTime, endTime, recurrence?, timeZone? }` | 201, `SlotResponseDto` | 400 |
| `GET /api/slots?from=YYYY-MM-DD&to=YYYY-MM-DD` | `from` et `to` obligatoires | 200, `{ from, to, items }` (`items` : occurrences) | 400 |
| `PATCH /api/slots/:id` | champs optionnels, fusionnés avec l'état courant | 200, `SlotResponseDto` | 400, 404 |
| `DELETE /api/slots/:id` | aucune | 204 | 400, 404 |

- `SlotResponseDto` : `id`, `type`, `date`, `startTime`, `endTime`, `recurrence`, `timeZone`.
- Chaque élément de `items` : `slotId`, `type`, `date`, `startTime`, `endTime`, `recurrence`, `timeZone`.
- Il n'existe pas de `GET /api/slots/:id`.
- Le schéma exact est généré par Swagger (`/swagger`) et versionné dans `docs/api/openapi.json` : il n'est pas recopié ici.

## Modèle et règles

**Champs d'un créneau**

- `type` : `libre` (disponible) ou `occupe` (indisponible). Valeurs de contrat en français, sans accent pour `occupe`.
- `date` : jour calendaire `YYYY-MM-DD`. Pour une récurrence hebdomadaire, c'est la date d'ancrage de la série.
- `startTime`, `endTime` : heures `HH:mm` sur 24 heures, de `00:00` à `23:59`.
- `recurrence` : `aucune` (ponctuel, valeur par défaut) ou `hebdomadaire`.
- `timeZone` : fuseau IANA, facultatif à la création, `Europe/Paris` par défaut.

**Heure murale locale.** Les heures et la date sont interprétées telles qu'elles sont saisies. Aucun instant UTC n'est calculé ni stocké, et aucune librairie de dates n'est utilisée. `timeZone` est validé, stocké et renvoyé, mais il ne sert jamais à calculer. Voir [ADR 0009](../decisions/0009-creneaux-heure-murale-locale.md).

**Invariants** (vérifiés à la création, à la reconstitution et après chaque fusion par `Slot`) :

- le type appartient à `SLOT_TYPES` et la récurrence à `SLOT_RECURRENCES` ;
- la date est une date réelle ;
- la fin est strictement postérieure au début (comparaison en minutes depuis minuit) ;
- un créneau tient dans une seule journée (pas de fin à `24:00`, pas de passage à minuit).

**Chevauchements.** Les créneaux peuvent se chevaucher, sans règle de résolution. Deux créneaux qui se chevauchent sont tous deux acceptés et renvoyés.

**Période de lecture.** `from` et `to` sont des jours calendaires inclusifs. `to` doit être postérieur ou égal à `from`, et la période compte au plus 366 jours (une période de 366 jours est acceptée). Les contrôles sont faits dans `SlotPeriod`, à l'appel du use case.

**Expansion** (`Slot.occurrencesIn`) :

- `aucune` : une occurrence si la date du créneau est dans la période ;
- `hebdomadaire` : une occurrence pour chaque jour `d` de la période tel que `d` est postérieur ou égal à la date d'ancrage et que `d` − ancrage est un multiple de 7 jours. Avant l'ancrage, rien ; l'ancrage est inclus si la période le contient.

Le calcul se fait en jours calendaires (minuit UTC sert uniquement d'étiquette de jour) : passages d'année et 29 février sont couverts par les tests.

**Tri de la liste** : date, puis heure de début, puis identifiant du créneau.

**Modification et suppression.** Elles valent pour toute la série : il n'existe pas d'exception par occurrence.

- `PATCH` : les champs absents gardent leur valeur. La fusion avec l'état courant est revalidée, donc une fin ramenée au début est refusée (400 `SLOT_END_NOT_AFTER_START`). Un corps vide renvoie 200 avec l'état inchangé.
- Changer la `date` d'un créneau hebdomadaire déplace l'ancrage, donc toute la série.
- Passer de `hebdomadaire` à `aucune` ne garde que l'occurrence ponctuelle à la date d'ancrage.
- Un champ inconnu est refusé (`PROPERTY_NOT_ALLOWED`).
- `DELETE` supprime la série entière. Il renvoie 204 ; un identifiant inconnu renvoie 404.

**Validation.** Les erreurs de forme (type ou récurrence hors valeurs, date ou heure mal formée, fuseau inconnu, `from` ou `to` absent, identifiant non UUID) sont renvoyées en `VALIDATION_FAILED` avec `errors[]`. Les erreurs métier sont décrites dans [Erreurs de l'API](../erreurs-api.md#codes-du-module-creneaux).

## Persistance

Table `slots`, adapter `PrismaSlotRepositoryAdapter` : `findIntersecting` filtre par `recurrence` et `date` ; `save` est un upsert sur l'identifiant ; `delete` est un `deleteMany`. Voir [Données](../donnees.md#modèle-slot-table-slots).

## Limites connues

- **Pas d'exception ni de fin de récurrence** : une série hebdomadaire dure indéfiniment, et une occurrence ne peut pas être modifiée seule.
- **Un créneau par journée** : pas de créneau à cheval sur minuit, fin au plus tard à `23:59`.
- **Fuseau informatif** : aucune conversion, aucune gestion des changements d'heure. `timeZone` ne change aucune heure.
- **Chevauchements acceptés sans règle** : la résolution est reportée à la story de génération.
- **Lecture des séries** : `findIntersecting` lit toutes les séries hebdomadaires ancrées avant la fin de la période, y compris celles qui commencent bien avant la période demandée.
- **Plafond de 366 jours** : choix arbitraire de la story, à réviser si l'interface en a besoin.
- **Validation de date dupliquée** : la date est vérifiée au transport (`IsCalendarDate`) et dans `CalendarDay` (Domain, qui n'importe pas la Presentation). Les deux contrôles sont identiques à ce jour ; ils devront rester alignés.

## Tests

- Unitaires (colocalisés) : `LocalTime`, `CalendarDay`, `SlotPeriod`, `SlotTimeZone`, `Slot` (dont `occurrencesIn`, `change`), `CreateSlotUseCase`, `UpdateSlotUseCase`, `DeleteSlotUseCase`, `ListSlotOccurrencesUseCase` (repository simulé), `SlotsController`, `SlotHttpMapper`, `SlotMapper`, les DTO de requête (`CreateSlotRequestDto`, `UpdateSlotRequestDto`, `ListSlotsRequestDto`, `SlotIdParamDto`).
- Adapter (`test/slot-repository.e2e-spec.ts`) : création, mise à jour sous le même identifiant, heures en minutes, `findById` inconnu, relecture, filtre `findIntersecting` (ponctuels, hebdomadaires, date d'ancrage), suppression d'un identifiant inconnu.
- Routes (`test/slots.e2e-spec.ts`) : création par défaut et lecture par période, fuseau fourni, occurrences hebdomadaires sur quatre semaines, période antérieure à l'ancrage, 29 février, modification (heure, passage à `aucune`, corps vide), fin ramenée au début, suppression, 404, identifiant non UUID, validations par champ, champ inconnu, chevauchement, `SLOT_PERIOD_INVALID`, `SLOT_PERIOD_TOO_LARGE`, période de 366 jours acceptée.
- `src/openapi/generate-openapi-document.spec.ts` vérifie la présence du tag `creneaux` et des chemins `/api/slots`.
