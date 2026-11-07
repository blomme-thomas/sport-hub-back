# Contexte garmin-sync

Bounded Context de synchronisation des activités Garmin dans la base locale. Code : `src/modules/garmin-sync/`. Usage mono-utilisateur.

Périmètre livré : déclenchement manuel de la synchronisation (issue #8) et consultation de la liste des activités (issue #10). Hors périmètre à ce jour : synchronisation planifiée (story #9), autres données Garmin que les activités.

## Rôle

Importer dans la table `activities` les activités Garmin nouvelles ou modifiées, sans doublon, et renvoyer le décompte de l'exécution. L'authentification auprès de l'API Garmin Personal (clé, jeton) est décrite dans [API Garmin Personal](../garmin-personal-api.md).

## Structure

| Couche | Fichier | Rôle |
|---|---|---|
| Domain | `domain/entities/activity.entity.ts` | Entity `Activity` (`create` vérifie les invariants, `reconstitute` relit le stockage, `hasSameContentAs` compare le contenu) |
| Domain | `domain/value-objects/garmin-activity-id.vo.ts` | `GarminActivityId` : identifiant Garmin, texte non vide après retrait des espaces |
| Domain | `domain/value-objects/sync-window.vo.ts` | `SyncWindow.resumingFrom(latest)` : début de la fenêtre de synchronisation |
| Domain | `domain/errors/` | `GarminAccessDeniedError` (`GARMIN_ACCESS_DENIED`), `GarminUnavailableError` (`GARMIN_UNAVAILABLE`), `InvalidActivityError` (`ACTIVITY_INVALID`) |
| Domain | `domain/ports/outbound/` | `IGarminConnectClient` (token `GARMIN_CONNECT_CLIENT`), `IActivityRepository` (token `ACTIVITY_REPOSITORY`), `IActivityListReadModel` (token `ACTIVITY_LIST_READ_MODEL`, fichier `activity-list.read-model.port.ts`) |
| Application | `application/use-cases/sync-garmin-activities.use-case.ts` | `SyncGarminActivitiesUseCase.execute()` |
| Application | `application/use-cases/list-activities.use-case.ts` | `ListActivitiesUseCase.execute(query)` : page d'activités et total |
| Application | `application/dtos/sync-garmin-activities-result.dto.ts` | `SyncGarminActivitiesResultDto` (`created`, `updated`, `ignored`) |
| Application | `application/dtos/activity-list.dto.ts` | `ActivityListQuery`, `ActivityListDto`, `ActivitySummaryDto` |
| Infrastructure | `infrastructure/adapters/garmin-connect.adapter.ts` | Adapter `GarminConnectAdapter`, anti-corruption layer vers l'API Garmin |
| Infrastructure | `infrastructure/adapters/garmin-personal-api-token.provider.ts` | Obtention et cache du jeton d'accès |
| Infrastructure | `infrastructure/persistence/prisma/` | `PrismaActivityRepositoryAdapter`, `ActivityMapper`, read model `PrismaActivityListReadModel` |
| Presentation | `presentation/http/controllers/garmin-sync.controller.ts` | `POST /api/garmin-sync/run` |
| Presentation | `presentation/http/controllers/activities.controller.ts` | `GET /api/activities` |
| Presentation | `presentation/http/dtos/sync-garmin-activities.response.dto.ts` | Transport DTO de la réponse de synchronisation |
| Presentation | `presentation/http/dtos/list-activities.request.dto.ts`, `activity-list.response.dto.ts` | Transport DTOs de la liste (paramètres de requête validés, page de résumés) |
| Composition | `garmin-sync.module.ts` | Câblage des tokens et du contrôleur |

## Ports publics

**`IGarminConnectClient.fetchActivitiesSince(since: Date | null): Promise<Activity[]>`** : renvoie les activités démarrées à partir de `since`, ou, si `since` est nul, des 365 derniers jours au plus. Lève `GarminAccessDeniedError` ou `GarminUnavailableError`. Le port n'a pas d'`athleteId` : l'application est mono-utilisateur (écart avec la description de l'issue #8, voir le plan).

**`IActivityRepository`** :
- `findLatestStartedAt(): Promise<Date | null>` : date de début la plus récente, `null` si la table est vide ;
- `findByGarminActivityIds(ids: GarminActivityId[]): Promise<Activity[]>` : activités déjà connues parmi les identifiants fournis ;
- `save(activities: Activity[]): Promise<void>` : crée ou met à jour les activités dans une seule transaction Prisma.

**`IActivityListReadModel.list(criteria): Promise<ActivityListPage>`** (port de lecture, token `ACTIVITY_LIST_READ_MODEL`) : une page de résumés et le total correspondant aux filtres. Consommé uniquement par `ListActivitiesUseCase`.

## Lecture des activités

Le use case `ListActivitiesUseCase` s'appuie sur le port de lecture `IActivityListReadModel.list(criteria)`, implémenté par `PrismaActivityListReadModel` : une requête Prisma directe (`findMany` + `count` dans une même `$transaction`), sans passer par le Repository d'Aggregate. Ce read model ne sert qu'à la consultation : il ne reconstitue jamais une `Activity` et ne sert à aucune écriture.

- Tri : `startedAt` décroissant, puis `id` décroissant (ordre stable entre pages).
- Pagination : `page` (défaut 1, max 1 000 000) et `pageSize` (défaut 20, entre 1 et 100), `skip`/`take`.
- Filtres : `from` et `to` inclusifs sur `startedAt`, ISO 8601 stricte (validé dans le transport DTO, pas dans le read model) ; `type` en correspondance exacte, après retrait des espaces en bordure, 64 caractères au plus.
- Projection : seuls les champs du résumé sont lus (`select` explicite) ; `rawPayload` n'est ni lu ni renvoyé.

Route `GET /api/activities` : voir [Consulter les activités](../../fonctionnel/parcours/consulter-activites.md).

| Statut | Code | Cas |
|---|---|---|
| 200 | | Page renvoyée (liste vide possible, `total` à zéro) |
| 400 | `VALIDATION_FAILED` | Paramètre inconnu, `page` hors 1 à 1 000 000, `pageSize` hors 1 à 100, date ISO 8601 invalide (`IS_ISO8601`, `IS_PARSABLE_DATE`), `to` antérieur à `from` (`IS_NOT_BEFORE_FROM`), `type` vide ou de plus de 64 caractères |

## Route

`POST /api/garmin-sync/run` : sans corps, réponse 200 avec le décompte de l'exécution.

```json
{ "created": 3, "updated": 1, "ignored": 12 }
```

| Statut | Code | Cas |
|---|---|---|
| 200 | | Synchronisation exécutée (y compris si aucune activité n'est à écrire) |
| 502 | `GARMIN_ACCESS_DENIED` | clé absente, clé refusée, ou jeton refusé par Garmin après un renouvellement |
| 503 | `GARMIN_UNAVAILABLE` | Garmin en panne, délai dépassé, réponse inattendue |
| 500 | `INTERNAL_ERROR` | erreur non prévue (par exemple la base) |

Détail des codes et du format des erreurs : [Erreurs de l'API](../erreurs-api.md#codes-du-module-garmin-sync) et [ADR 0004](decisions/0004-erreurs-techniques-garmin-en-domain-error.md).

## Flux de synchronisation

1. `findLatestStartedAt()` lit la date de début la plus récente de la table `activities`.
2. `SyncWindow.resumingFrom(latest)` calcule le début de la fenêtre : la dernière activité connue moins **7 jours** (fenêtre de recouvrement, pour rattraper les modifications récentes côté Garmin). Sans activité connue, la borne est nulle.
3. `fetchActivitiesSince(since)` interroge Garmin (format et endpoint non vérifiés, voir la section « Hypothèses non vérifiées » plus bas). Si `since` est nul, l'historique démarre 365 jours avant maintenant.
4. Les activités reçues sont dédoublonnées par identifiant Garmin dans l'exécution (la dernière occurrence l'emporte).
5. `findByGarminActivityIds` lit les activités déjà en base pour ces identifiants.
6. Classement de chaque activité :
   - **créée** (`created`) : identifiant inconnu en base ;
   - **mise à jour** (`updated`) : identifiant connu, contenu différent ;
   - **ignorée** (`ignored`) : identifiant connu, contenu identique.
7. `save()` écrit les créées et les mises à jour dans une seule transaction. Les ignorées ne sont pas réécrites.
8. Le use case renvoie les trois compteurs.

Le contenu est comparé sur le type, la date de début, la durée, la distance et le payload Garmin source complet (égalité profonde). Une modification de n'importe quel champ du payload, même hors de ces quatre champs, compte donc comme `updated`.

Les activités sont écrites par upsert sur `garminActivityId` : l'identifiant interne `id` et `createdAt` ne changent pas, `updatedAt` est mis à jour par Prisma. Voir [Données](../donnees.md).

Les compteurs : `created + updated` activités sont écrites, `ignored` activités sont lues et laissées telles quelles. Une activité invalide n'est comptée nulle part (voir ci-dessous).

## Règles et invariants

- `GarminActivityId` : non vide après `trim()`.
- `Activity` : type non vide, date de début valide, durée finie et positive ou nulle, distance nulle ou finie et positive ou nulle. Une violation lève `InvalidActivityError` (`ACTIVITY_INVALID`).
- Fenêtre : `since` = dernière activité connue − 7 jours (`SyncWindow`).
- Historique initial : 365 jours quand aucune activité n'est connue (hypothèse du plan, voir ci-dessous).

## Traitement des erreurs (adapter)

L'adapter traduit les erreurs techniques en erreurs du module, sans transmettre de `cause` ni de détail interne :

| Situation | Erreur levée | Statut |
|---|---|---|
| Clé absente (`KEY_MISSING`) ou refusée (`KEY_REJECTED`) | `GarminAccessDeniedError` | 502 |
| 401 ou 403 sur l'activité, après un nouveau jeton et un seul nouvel essai | `GarminAccessDeniedError` | 502 |
| Réponse de jeton inattendue (`UNEXPECTED_RESPONSE`) | `GarminUnavailableError` | 503 |
| Réponse d'activités qui n'est pas un tableau | `GarminUnavailableError` | 503 |
| Autre échec du client HTTP (délai, réseau, 5xx, redirection) | `GarminUnavailableError` | 503 |

- Un 401 ou 403 invalide le jeton en cache (`invalidate()`) puis une seule nouvelle tentative est faite ; un second refus remonte en `GarminAccessDeniedError`.
- Les requêtes d'activités étant des GET, le client HTTP peut réessayer les erreurs réseau, les délais et les 5xx (voir [Architecture](../architecture.md)). Le POST du jeton n'est jamais réessayé.
- Une activité Garmin invalide (format non conforme au schéma zod, ou valeurs refusées par `Activity.create`) est **sautée** : un `warn` est journalisé avec son seul identifiant, et elle n'est ni écrite ni comptée. La synchronisation continue.
- Le use case ne capture aucune erreur : ce qui remonte est traduit par le filtre global.

Messages renvoyés (`detail`, fixes, sans donnée interne) :
- `GARMIN_ACCESS_DENIED` : « L'accès à Garmin a été refusé : vérifiez la clé de l'API Garmin Personal. »
- `GARMIN_UNAVAILABLE` : « Garmin est momentanément indisponible. Réessayez plus tard. »

La clé et le jeton n'apparaissent ni dans les réponses, ni dans les erreurs, ni dans les logs.

## Hypothèses non vérifiées sur l'API Garmin

Ces points sont isolés dans `garmin-connect.adapter.ts` (constantes et schéma zod `garminActivitySchema`). Ils n'ont pas été confirmés sur la documentation Garmin : à vérifier avant de s'y fier en production.

- **Endpoint** : `GET {GARMIN_PERSONAL_API_BASE_URL}/activitylist-service/activities/search/activities` (constante `ACTIVITIES_PATH`).
- **Paramètres** : `startDate` (date seule `AAAA-MM-JJ`, en UTC), `start` (offset) et `limit`. Comme `startDate` est une date et non un instant, la fenêtre réelle couvre entre 7 et 8 jours selon l'heure.
- **Pagination** : pages de 100 éléments (`PAGE_SIZE`), arrêt quand une page en contient moins. Plafond de 50 pages (`MAX_PAGES`, soit 5 000 activités) ; au-delà, un `warn` est journalisé et les activités suivantes ne sont pas récupérées.
- **Format d'un élément** : `activityId` (nombre ou texte), `activityType.typeKey` (type), `startTimeGMT` au format `AAAA-MM-JJ HH:MM:SS` lu comme UTC, `duration` (secondes), `distance` (mètres, optionnel ou nul). Le reste de l'objet est conservé tel quel comme `sourcePayload`.
- **Historique initial** : 365 jours quand aucune activité n'est connue (`DEFAULT_HISTORY_DAYS`), hypothèse du plan.
- **Statuts de refus** : 401 et 403 sont traités comme un refus de la clé ou du jeton.

Le format réel (JSON ou FIT, quotas, profondeur de l'historique) reste à confirmer. Voir la liste des points non vérifiés dans [API Garmin Personal](../garmin-personal-api.md).

## Limites connues

- **Fenêtre de mise à jour** : seules les activités comprises dans la fenêtre sont relues. Une activité plus ancienne que la dernière activité connue moins 7 jours, modifiée côté Garmin, n'est pas mise à jour.
- **Pas de suppression** : une activité supprimée côté Garmin reste en base.
- **Pas de verrou** : deux déclenchements simultanés ne sont pas sérialisés. La contrainte unique sur `garmin_activity_id` protège des doublons ; le comportement en cas de conflit concurrent n'est pas testé. Le traitement est prévu avec la synchronisation planifiée (#9).
- **Payload opaque** : le Domain stocke `sourcePayload` comme `unknown`. Le format n'est pas versionné ; un changement de format Garmin change le contenu comparé.
- **Activités invalides** : sautées et journalisées, sans compteur dédié.

## Tests

- Unitaires (colocalisés) : `Activity`, `GarminActivityId`, `SyncWindow`, `SyncGarminActivitiesUseCase` (fakes des ports), `GarminConnectAdapter` (serveur HTTP local `node:http`), `GarminPersonalApiTokenProvider`, `ActivityMapper`, `GarminSyncController`.
- Unitaires (colocalisés) complémentaires : `ListActivitiesUseCase` (fake du read model), `ActivitiesController` (use case substitué).
- e2e (`test/`) : `activity-repository.e2e-spec.ts` (upsert sans doublon, `findLatestStartedAt`, `findByGarminActivityIds`, aller-retour du mapping) ; `garmin-sync.e2e-spec.ts` (Garmin simulé : première exécution, rejeu, payload modifié, fenêtre de 7 jours, activité invalide sautée, 502 et 503, absence de clé dans le corps) ; `activities.e2e-spec.ts` (liste vide, tri et pagination, filtres seuls et combinés, bornes incluses, pas de fuite de `rawPayload`, 400 `VALIDATION_FAILED` par champ).
- `openapi.e2e-spec.ts` vérifie que les deux codes figurent dans l'enum `ProblemCode`, que la route de synchronisation documente 200, 502 et 503, et que `GET /api/activities` documente ses paramètres et son 400.
