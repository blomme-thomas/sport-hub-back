# Contexte objectifs

Bounded Context des objectifs sportifs : l'utilisateur prépare un objectif (un événement à une date donnée avec un format et un temps cible, un volume ou une régularité) qu'il crée, consulte, modifie et supprime à tout moment. Code : `src/modules/objectifs/`. Usage mono-utilisateur.

Périmètre livré : issue #36 (création, consultation, liste avec filtre `upcoming`, modification, suppression ; `/api/goals`). Hors périmètre : calcul de la progression vers l'objectif, génération de planning à partir de l'objectif, arbitrage entre plusieurs objectifs simultanés (question ouverte dans [la vision produit](../../fonctionnel/vision.md)).

## Rôle

Persister les objectifs (table `goals`, voir [Données](../donnees.md#modèle-goal-table-goals)) et appliquer leurs règles de forme et de cohérence. Les règles de cohérence (format et temps cible réservés aux événements, temps cible entier positif) sont portées par l'Aggregate Root `Goal`, dans le Domain.

## Structure

| Couche | Fichier | Rôle |
|---|---|---|
| Domain | `domain/entities/goal.entity.ts` | Aggregate Root `Goal` : `create`, `reconstitute`, `change` (fusion et revalidation), `isUpcoming` |
| Domain | `domain/value-objects/goal-id.vo.ts` | `GoalId` : UUID, `generate()` (`node:crypto`), `create(text)` |
| Domain | `domain/value-objects/goal-type.vo.ts` | `GOAL_TYPES` (`evenement`, `volume`, `regularite`), type `GoalType`, garde `isGoalType` |
| Domain | `domain/value-objects/event-format.vo.ts` | `EVENT_FORMATS` (`sprint`, `olympique`, `half`, `full`, `autre`), type `EventFormat`, garde `isEventFormat` |
| Domain | `domain/value-objects/target-time.vo.ts` | `TargetTime` : entier de secondes de 1 à `MAX_TARGET_TIME_SECONDS` (2147483647) |
| Domain | `domain/errors/` | Trois Business Errors, voir [Erreurs de l'API](../erreurs-api.md#codes-du-module-objectifs) |
| Domain | `domain/ports/outbound/goal.repository.port.ts` | `IGoalRepository` (token `GOAL_REPOSITORY`) |
| Application | `application/use-cases/create-goal.use-case.ts` | `CreateGoalUseCase` |
| Application | `application/use-cases/list-goals.use-case.ts` | `ListGoalsUseCase` (filtre `upcoming`, jour UTC) |
| Application | `application/use-cases/get-goal.use-case.ts` | `GetGoalUseCase` |
| Application | `application/use-cases/update-goal.use-case.ts` | `UpdateGoalUseCase` |
| Application | `application/use-cases/delete-goal.use-case.ts` | `DeleteGoalUseCase` |
| Application | `application/dtos/goal.dto.ts` | Commandes et requête (`CreateGoalCommand`, `UpdateGoalCommand`, `ListGoalsQuery`), DTO de sortie (`GoalDto`) |
| Infrastructure | `infrastructure/persistence/prisma/goal.repository.adapter.ts` | `PrismaGoalRepositoryAdapter` |
| Infrastructure | `infrastructure/persistence/prisma/goal.mapper.ts` | `GoalMapper` : `toDomain`, `toPersistence` |
| Presentation | `presentation/http/controllers/goals.controller.ts` | `GoalsController` : `/api/goals`, tag `objectifs` |
| Presentation | `presentation/http/dtos/` | Requêtes validées (`create-goal`, `update-goal`, `list-goals`, `goal-id.param`) et DTO de réponse (`goal.response`, `goal-list.response`) |
| Presentation | `presentation/http/validators/goal.validators.ts` | Validateurs class-validator : `IsCalendarDate`, `IsTargetTimeSeconds` |
| Presentation | `presentation/http/mappers/goal.http-mapper.ts` | `GoalHttpMapper` : requêtes HTTP vers commandes, `GoalDto` vers réponses HTTP |
| Composition | `objectifs.module.ts` | `ObjectifsModule` : contrôleur, cinq use cases, `GOAL_REPOSITORY` lié à `PrismaGoalRepositoryAdapter` |

Les tests unitaires sont colocalisés (`*.spec.ts`). Les tests d'intégration sont `test/goal-repository.e2e-spec.ts` (adapter) et `test/goals.e2e-spec.ts` (routes).

## Ports publics

Le module n'exporte rien (`ObjectifsModule` n'a pas de `exports`) : aucun autre module ne le consomme à ce jour. Les points d'entrée sont les routes HTTP, qui appellent les use cases :

- `CreateGoalUseCase.execute(command: CreateGoalCommand): Promise<GoalDto>` ;
- `ListGoalsUseCase.execute(query: ListGoalsQuery): Promise<GoalDto[]>` ;
- `GetGoalUseCase.execute(id: string): Promise<GoalDto>` : lève `GoalNotFoundError` si l'identifiant est inconnu ;
- `UpdateGoalUseCase.execute(command: UpdateGoalCommand): Promise<GoalDto>` : lève `GoalNotFoundError` si l'identifiant est inconnu ;
- `DeleteGoalUseCase.execute(id: string): Promise<void>` : lève `GoalNotFoundError` si l'identifiant est inconnu.

Port de persistance `IGoalRepository` (`domain/ports/outbound/goal.repository.port.ts`) :

- `findById(id): Promise<Goal | null>` ;
- `findAll(filter: { upcomingFrom? }): Promise<Goal[]>` : tri par date cible croissante, sans date en dernier ; avec `upcomingFrom`, ne renvoie que les objectifs dont la date est postérieure ou égale à cette date ;
- `save(goal): Promise<void>` : crée ou met à jour (même identifiant) ;
- `delete(id): Promise<void>` : sans effet si l'identifiant n'existe pas.

## Route

| Méthode et chemin | Entrée | Succès | Erreurs documentées |
|---|---|---|---|
| `POST /api/goals` | corps `{ title, type, targetDate?, eventFormat?, targetTimeSeconds? }` | 201, `GoalResponseDto` | 400 |
| `GET /api/goals` | `upcoming` facultatif (`true`, `false` ou absent) | 200, `{ items }` | 400 |
| `GET /api/goals/:id` | aucune | 200, `GoalResponseDto` | 400, 404 |
| `PATCH /api/goals/:id` | champs optionnels, fusionnés avec l'état courant | 200, `GoalResponseDto` | 400, 404 |
| `DELETE /api/goals/:id` | aucune | 204 | 400, 404 |

- `GoalResponseDto` : `id`, `title`, `type`, `targetDate` (`YYYY-MM-DD` ou `null`), `eventFormat` (ou `null`), `targetTimeSeconds` (ou `null`).
- `upcoming` n'accepte que `true` ou `false` (parsing explicite des chaînes de la requête) ; toute autre valeur renvoie 400 `VALIDATION_FAILED`.
- Pas de pagination : le volume attendu est faible (usage mono-utilisateur).
- Le schéma exact est généré par Swagger (`/swagger`) et versionné dans `docs/api/openapi.json` : il n'est pas recopié ici.

## Modèle et règles

**Champs d'un objectif**

- `title` : texte, non vide après retrait des espaces en début et fin, 200 caractères au plus.
- `type` : `evenement`, `volume` ou `regularite`. Le type est modifiable.
- `targetDate` : date cible au format `YYYY-MM-DD`, sans heure, réelle au sens du calendrier. Facultative (`null` = pas de date). Aucune contrainte de passé.
- `eventFormat` : `sprint`, `olympique`, `half`, `full` ou `autre`. Réservé au type `evenement`.
- `targetTimeSeconds` : temps cible en secondes, entier de 1 à 2147483647 (borne de la colonne `INTEGER`). Réservé au type `evenement`, facultatif.

**Modélisation.** Un seul type d'objectif et une seule table : les champs propres à l'événement (`eventFormat`, `targetTimeSeconds`) sont des colonnes nullables, et leur présence est contrôlée par le Domain et par deux contraintes SQL. Il n'existe pas d'agrégat `Event` séparé. Voir [Données](../donnees.md#modèle-goal-table-goals).

**Invariants** (vérifiés à la création, à la reconstitution et après chaque fusion par `Goal`) :

- le titre, après retrait des espaces, est non vide et compte 200 caractères au plus ;
- le type appartient à `GOAL_TYPES` ;
- la date, si elle est fournie, est une date valide ;
- le format et le temps cible ne sont posés que si le type est `evenement` ;
- le format appartient à `EVENT_FORMATS` ;
- le temps cible est un entier compris entre 1 et 2147483647.

**Règle « à venir »** (`upcoming=true`) : un objectif est à venir si sa date cible est aujourd'hui (jour UTC) ou postérieure. Sans date cible, il n'est jamais à venir. La comparaison se fait sur le jour calendaire UTC (minuit UTC du jour courant, calculé dans `ListGoalsUseCase`) ; le filtre est appliqué en base (`target_date >= ...`). `Goal.isUpcoming(today)` porte la même règle au Domain.

**Tri de la liste** : date cible croissante, sans date en dernier, puis date de création, puis identifiant.

**Modification (PATCH)** :

- un champ absent garde sa valeur ;
- `null` efface la date, le format ou le temps cible ;
- la fusion avec l'état courant est revalidée : passer à un type autre que `evenement` alors qu'un format ou un temps cible reste posé est refusé (400 `GOAL_INVALID`). Si le même PATCH efface le format et le temps cible, le passage est accepté ;
- un PATCH vide renvoie 200 avec l'état inchangé.

**Suppression.** `DELETE` supprime l'objectif et renvoie 204. Un identifiant inconnu renvoie 404 `GOAL_NOT_FOUND`.

**Validation.** Les erreurs de forme (titre absent, titre de plus de 200 caractères, type ou format hors valeurs, date mal formée ou inexistante, temps cible non entier, nul, négatif ou au-delà de 2147483647, identifiant non UUID, `upcoming` non booléen, champ inconnu) sont renvoyées en `VALIDATION_FAILED` avec `errors[]`. Les erreurs métier sont décrites dans [Erreurs de l'API](../erreurs-api.md#codes-du-module-objectifs).

## Persistance

Table `goals`, adapter `PrismaGoalRepositoryAdapter` : `findById` utilise `findUnique` ; `findAll` applique le filtre `target_date >= upcomingFrom` et le tri décrit ci-dessus ; `save` est un upsert sur l'identifiant ; `delete` est un `deleteMany`. Voir [Données](../donnees.md#modèle-goal-table-goals).

## Limites connues

- **Pas de cible pour les volumes et les régularités** : un objectif `volume` ou `regularite` n'a ni format ni temps cible, et aucune autre grandeur de cible n'est modélisée.
- **Une date cible unique** : pas de période ni de date de fin.
- **Pas d'arbitrage** : plusieurs objectifs peuvent être à venir en même temps, sans règle de priorité (question ouverte dans la vision produit).
- **Pas de progression** : aucun calcul de l'avancement vers l'objectif.
- **Erreur de domaine sur le temps cible non atteignable en HTTP** : `GOAL_TARGET_TIME_INVALID` est un filet du Domain. La validation du transport applique la même règle (`IsTargetTimeSeconds`) et renvoie `VALIDATION_FAILED` avant le Domain : ce code n'est pas renvoyé par les routes à ce jour.
- **Validation de date et de temps cible dupliquée** : la forme est vérifiée au transport (`IsCalendarDate`, `IsTargetTimeSeconds`) et dans le Domain (`Goal`, `TargetTime`). Les deux contrôles sont identiques à ce jour ; ils devront rester alignés.

## Tests

- Unitaires (colocalisés) : `GoalId`, `GoalType`, `EventFormat`, `TargetTime`, `Goal` (`domain/entities/goal.entity.spec.ts`), `CreateGoalUseCase`, `ListGoalsUseCase`, `GetGoalUseCase`, `UpdateGoalUseCase`, `DeleteGoalUseCase` (repository en mémoire), `GoalMapper`, `PrismaGoalRepositoryAdapter` (spec colocalisée).
- Adapter (`test/goal-repository.e2e-spec.ts`) : création, mise à jour sous le même identifiant, volume sans date ni format ni temps cible, `findById` inconnu et relecture, tri par date sans date en dernier, filtre `upcomingFrom`, suppression et suppression d'un identifiant inconnu.
- Routes (`test/goals.e2e-spec.ts`) : création d'un événement, modification du format et du temps cible, effacement par `null`, PATCH vide, 404 `GOAL_NOT_FOUND`, liste et filtre `upcoming`, valeur non booléenne de `upcoming`, suppression, identifiant non UUID, validations par champ (temps cible négatif, nul, hors bornes ou non entier, date inexistante ou mal formée, format et type inconnus, titre absent), `GOAL_INVALID` sur format posé pour un volume et sur passage à `volume` sans effacer le format, champ inconnu.
- `src/openapi/generate-openapi-document.spec.ts` vérifie la présence du tag `objectifs`.
