# Contexte disciplines

Bounded Context du référentiel des disciplines : chaque type d'activité Garmin connu (clé brute, `typeKey`) a un libellé lisible, que l'utilisateur peut modifier, et deux dates d'apparition. Code : `src/modules/disciplines/`. Usage mono-utilisateur. Issue #45.

Périmètre livré : enregistrement des disciplines pendant la synchronisation Garmin (ACL depuis `garmin-sync`), liste (`GET /api/disciplines`) et renommage (`PATCH /api/disciplines/:typeKey`). Hors périmètre : création manuelle, suppression, fusion de disciplines, pagination, affichage du libellé dans les autres routes.

## Rôle

Tenir le référentiel des disciplines (table `disciplines`, voir [Données](../donnees.md#modèle-discipline-table-disciplines)). Une discipline est créée par la synchronisation Garmin dès qu'une clé de type inconnue apparaît ; elle est ensuite consultée et renommée par l'API. Le module ne lit ni n'écrit la table `activities` et ignore tout de Garmin : il reçoit des clés brutes (`string[]`).

## Structure

| Couche | Fichier | Rôle |
|---|---|---|
| Domain | `domain/entities/discipline.entity.ts` | Entity `Discipline` : `firstSeen`, `reconstitute`, `rename`, `markSeen` |
| Domain | `domain/value-objects/discipline-type-key.vo.ts` | `DisciplineTypeKey` : clé de type, non vide après retrait des espaces, 100 caractères au plus |
| Domain | `domain/value-objects/discipline-label.vo.ts` | `DisciplineLabel` : libellé saisi (1 à 60 caractères après retrait des espaces) ; `fromTypeKey` pour le libellé provisoire |
| Domain | `domain/errors/` | `InvalidDisciplineError` (`DISCIPLINE_INVALID`), `InvalidDisciplineLabelError` (`DISCIPLINE_LABEL_INVALID`), `DisciplineNotFoundError` (`DISCIPLINE_NOT_FOUND`) |
| Domain | `domain/ports/outbound/discipline.repository.port.ts` | `IDisciplineRepository` (token `DISCIPLINE_REPOSITORY`) |
| Domain | `domain/ports/outbound/disciplines-clock.port.ts` | Horloge `DisciplinesClock` (token `DISCIPLINES_CLOCK`) : instant de synchronisation |
| Application | `application/use-cases/record-discipline-appearances.use-case.ts` | `RecordDisciplineAppearancesUseCase.execute(typeKeys)` |
| Application | `application/use-cases/list-disciplines.use-case.ts` | `ListDisciplinesUseCase.execute()` |
| Application | `application/use-cases/rename-discipline.use-case.ts` | `RenameDisciplineUseCase.execute({ typeKey, label })` |
| Application | `application/dtos/discipline.dto.ts` | `DisciplineDto`, `RenameDisciplineCommand` |
| Infrastructure | `infrastructure/persistence/prisma/discipline.repository.adapter.ts` | `PrismaDisciplineRepositoryAdapter` |
| Infrastructure | `infrastructure/persistence/prisma/discipline.mapper.ts` | `DisciplineMapper` : `toDomain`, `toPersistence` |
| Presentation | `presentation/http/controllers/disciplines.controller.ts` | `DisciplinesController` : `/api/disciplines`, tag `disciplines` |
| Presentation | `presentation/http/dtos/` | Requête (`update-discipline.request`), paramètre (`discipline-type-key.param`) et réponses (`discipline.response`, `discipline-list.response`) |
| Presentation | `presentation/http/mappers/discipline.http-mapper.ts` | `DisciplineHttpMapper` |
| Composition | `disciplines.module.ts` | `DisciplinesModule` : use cases, repository, horloge ; exporte `RecordDisciplineAppearancesUseCase` |

## Ports publics

Le seul point d'entrée consommé par un autre module est **`RecordDisciplineAppearancesUseCase.execute(typeKeys: string[]): Promise<void>`**, exporté par `DisciplinesModule` et appelé par `garmin-sync` via son adapter ACL (voir [Enregistrement depuis garmin-sync](#enregistrement-depuis-garmin-sync)). `ListDisciplinesUseCase` et `RenameDisciplineUseCase` ne sont pas exportés : ils ne servent que les routes HTTP.

Port de persistance `IDisciplineRepository` :

- `findAll()` : toutes les disciplines, triées par libellé croissant puis clé croissante (tri exécuté par PostgreSQL, donc selon la collation de la base) ;
- `findByTypeKey(key)` : `null` si la clé est inconnue ;
- `findByTypeKeys(keys)` : les disciplines connues parmi les clés ; liste vide sans requête si aucune clé ;
- `saveAppearances(disciplines)` : une transaction ; crée les nouvelles (`createMany` avec `skipDuplicates`) et avance `lastSeenAt` des connues (`updateMany`, seulement si la nouvelle date est postérieure). N'écrit jamais `label` ; liste vide sans requête ;
- `saveLabel(discipline)` : n'écrit que `label` et `updatedAt`, sur la clé de type.

## Modèle et règles

**Champs d'une discipline**

- `typeKey` : clé de type telle que Garmin la fournit (`activityType.typeKey`), après retrait des espaces en bordure, 1 à 100 caractères. Unique. Elle n'est jamais modifiée.
- `label` : libellé affiché.
- `firstSeenAt` : instant de la première synchronisation qui a reçu ce type.
- `lastSeenAt` : instant de la dernière synchronisation qui a reçu ce type.

**Règles**

- **Libellé provisoire.** À la création, le libellé est égal à la clé de type (`DisciplineLabel.fromTypeKey`), sans la borne de 60 caractères : il peut donc aller jusqu'à 100 caractères.
- **Libellé saisi.** Après retrait des espaces en bordure, il fait de 1 à 60 caractères. Le transport (`UpdateDisciplineRequestDto`) applique la même règle avant le Domain.
- **Libellé jamais écrasé par la synchronisation.** `saveAppearances` n'écrit jamais le libellé ; un renommage survit donc à toutes les synchronisations suivantes.
- **Dates = instant de synchronisation.** `firstSeenAt` et `lastSeenAt` sont l'instant lu sur l'horloge (`DISCIPLINES_CLOCK`, `new Date()` en production), et non la date de début (`startedAt`) des activités. Une discipline créée à une synchronisation a donc `firstSeenAt` égal à `lastSeenAt`.
- **`lastSeenAt` ne recule jamais.** `markSeen` garde la plus grande des deux dates.
- **Sens de `lastSeenAt`.** Il avance à chaque synchronisation qui reçoit au moins une activité de ce type depuis Garmin, y compris une activité déjà connue et inchangée. La fenêtre de recouvrement de 7 jours (voir [garmin-sync](garmin-sync.md#flux-de-synchronisation)) fait donc avancer la date pour les types récents. Ce n'est pas la date d'une activité.
- **Clés ignorées sans erreur à l'enregistrement.** Une clé vide, de plus de 100 caractères, ou répétée (après retrait des espaces) n'est pas enregistrée et ne fait pas échouer la synchronisation. Une liste vide ne fait rien.
- **Renommage.** `PATCH` ne change que `label` (et `updatedAt`). La clé et les deux dates restent inchangées.

## Enregistrement depuis garmin-sync

Sens de dépendance : `garmin-sync` dépend de `disciplines`, jamais l'inverse (ACL).

- Le port `IDisciplineRegistry` (`garmin-sync/domain/ports/outbound/discipline-registry.port.ts`, token `DISCIPLINE_REGISTRY`) est implémenté par `DisciplinesRegistryAdapter` (`garmin-sync/infrastructure/adapters/disciplines-registry.adapter.ts`), qui appelle `RecordDisciplineAppearancesUseCase`. Le module `disciplines` ne voit ni Garmin ni `Activity`.
- `SyncGarminActivitiesUseCase` appelle `recordAppearances` avec les types distincts de toutes les activités reçues de Garmin (y compris les ignorées), **avant** `activities.save`, même si aucune activité n'est à écrire. Voir [garmin-sync](garmin-sync.md#flux-de-synchronisation).
- Une erreur du référentiel n'est pas traduite par l'adapter : elle remonte en 500 `INTERNAL_ERROR`, et aucune activité de la synchronisation n'est écrite (l'enregistrement précède l'écriture).

## Routes

| Méthode et chemin | Entrée | Succès | Erreurs documentées |
|---|---|---|---|
| `GET /api/disciplines` | aucune | 200, `{ items }` (liste vide possible) | aucune |
| `PATCH /api/disciplines/:typeKey` | corps `{ label }` | 200, `DisciplineResponseDto` | 400, 404 |

- Chaque élément : `typeKey`, `label`, `firstSeenAt`, `lastSeenAt` (dates au format ISO 8601).
- `GET` : pas de pagination (volume attendu faible, usage mono-utilisateur).
- `PATCH` : la clé de l'URL est recherchée après retrait des espaces. Le corps est validé (`label` : chaîne, 1 à 60 caractères après retrait des espaces) ; un champ inconnu est refusé (`VALIDATION_FAILED`).
- `PATCH` n'est pas une route demandée par l'issue #45 : elle a été ajoutée pour satisfaire « libellé modifiable » (voir le plan, « Décisions / hypothèses »).
- Le schéma exact est généré par Swagger et versionné dans `docs/api/openapi.json` (voir [Contrat OpenAPI](openapi.md)).

Codes d'erreur : voir [Erreurs de l'API](../erreurs-api.md#codes-du-module-disciplines).

## Bornes

| Donnée | Borne | Où elle est contrôlée |
|---|---|---|
| Clé de type (`typeKey`) | 1 à 100 caractères après retrait des espaces | Enregistrement : clé hors bornes ignorée. Route `PATCH` : le paramètre brut est limité à 1 à 100 caractères (transport), puis revalidé après retrait des espaces (Domain) |
| Libellé saisi | 1 à 60 caractères après retrait des espaces | Transport (`UpdateDisciplineRequestDto`) et Domain (`DisciplineLabel.create`) |
| Libellé provisoire | égal à la clé, donc jusqu'à 100 caractères | Aucune (`fromTypeKey`) |
| Liste | pas de pagination | Aucune |

## Tests

- Unitaires (colocalisés) : `DisciplineTypeKey`, `DisciplineLabel`, `Discipline` (entity), `RecordDisciplineAppearancesUseCase`, `ListDisciplinesUseCase`, `RenameDisciplineUseCase` (fakes mémoire), `DisciplineMapper`, `DisciplinesController`, `DisciplineHttpMapper`, `UpdateDisciplineRequestDto`.
- Côté garmin-sync : `DisciplinesRegistryAdapter` (spec colocalisée) et `SyncGarminActivitiesUseCase` (types distincts enregistrés, registre rejeté).
- e2e : `test/discipline-repository.e2e-spec.ts` (adapter Prisma sur la base de test) et `test/disciplines.e2e-spec.ts` (routes). `test/garmin-sync.e2e-spec.ts` couvre le parcours de synchronisation (voir [garmin-sync](garmin-sync.md#tests)).

## Limites connues

- **Backfill sans borne de longueur.** La migration initiale insère les types déjà présents dans `activities` sans contrôler 100 caractères (voir [Données](../donnees.md#backfill-à-la-migration)). Si un type dépasse 100 caractères, `DisciplineMapper.toDomain` lève `DISCIPLINE_INVALID` à la lecture, et `GET /api/disciplines` renvoie 400 pour toute la liste. Non vérifié sur des données réelles.
- **Pas de suppression ni de fusion.** Une discipline créée par erreur ou par une clé Garmin mal formée reste en base.
- **Renommage local.** Le libellé n'est utilisé par aucune autre route : `GET /api/activities` et `GET /api/stats` renvoient toujours la clé brute (`type`).
- **Pas de création manuelle.** Une discipline n'existe que si Garmin l'a fournie.
- **Ordre de tri** : libellé puis clé, selon la collation de la base ; non testé sur des libellés accentués.
- **Espaces.** Le retrait des espaces du backfill utilise `\s` de PostgreSQL, alors que le Domain utilise `String.prototype.trim()` : certains espaces Unicode peuvent être traités différemment. Non vérifié.
- **Couplage.** L'ACL importe le use case `RecordDisciplineAppearancesUseCase` depuis le module `disciplines` ; l'import passe par la façade `disciplines/index.ts`, seule autorisée par `deps:check` (`modules-public-api-only`).

## Voir aussi

- [ADR 0010 : référentiel des disciplines, ACL et dates de synchronisation](../decisions/0010-referentiel-disciplines-acl-dates-de-synchronisation.md)
- [Contexte garmin-sync](garmin-sync.md)
- [Données](../donnees.md)
