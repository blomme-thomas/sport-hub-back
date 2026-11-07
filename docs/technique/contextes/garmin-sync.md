# Contexte garmin-sync

Bounded Context de synchronisation des activités Garmin dans la base locale. Code : `src/modules/garmin-sync/`. Usage mono-utilisateur.

Périmètre livré : déclenchement manuel de la synchronisation (issue #8), consultation de la liste des activités (issue #10) et synchronisation planifiée (story #9, voir [Synchronisation planifiée](#synchronisation-planifiée)). Hors périmètre à ce jour : autres données Garmin que les activités.

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
| Infrastructure | `infrastructure/scheduler/garmin-sync.scheduler.ts` | `GarminSyncScheduler` : déclenchement planifié de la synchronisation (`SchedulerRegistry` et `CronJob`), verrou en mémoire |
| Presentation | `presentation/http/controllers/garmin-sync.controller.ts` | `POST /api/garmin-sync/run` |
| Presentation | `presentation/http/controllers/activities.controller.ts` | `GET /api/activities` |
| Presentation | `presentation/http/dtos/sync-garmin-activities.response.dto.ts` | Transport DTO de la réponse de synchronisation |
| Presentation | `presentation/http/dtos/list-activities.request.dto.ts`, `activity-list.response.dto.ts` | Transport DTOs de la liste (paramètres de requête validés, page de résumés) |
| Composition | `garmin-sync.module.ts` | Câblage des tokens, du contrôleur et du scheduler, import de `ScheduleModule.forRoot()` |

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

## Synchronisation planifiée

`GarminSyncScheduler` (Inbound Adapter, `infrastructure/scheduler/garmin-sync.scheduler.ts`) déclenche `SyncGarminActivitiesUseCase.execute()` selon une expression cron. Il ne contient aucune logique métier. Choix d'implémentation : `SchedulerRegistry` et `CronJob` (bibliothèque `cron` 4.4.0, dépendance directe) plutôt que `@Cron`, parce que `@Cron` est figé à la compilation alors que la fréquence est configurable (voir [ADR 0007](decisions/0007-planification-cronjob-via-scheduler-registry.md)).

Variables (validées au démarrage, voir [Développement](../developpement.md#variables-denvironnement)) :

| Variable | Défaut | Contrainte |
|---|---|---|
| `GARMIN_SYNC_CRON_ENABLED` | `true` | exactement `true` ou `false` ; une autre valeur fait échouer le démarrage |
| `GARMIN_SYNC_CRON_EXPRESSION` | `0 */3 * * *` (toutes les 3 heures) | expression acceptée par `validateCronExpression` de la bibliothèque `cron` ; invalide, le démarrage échoue et la valeur n'est pas affichée |

Cycle de vie :

- **Démarrage** (`onApplicationBootstrap`) : si `GARMIN_SYNC_CRON_ENABLED` vaut `false`, aucun job n'est créé et le log « Synchronisation Garmin planifiée désactivée » est écrit. Sinon un `CronJob` nommé `garmin-sync` est démarré et enregistré dans `SchedulerRegistry`, et le log indique l'expression.
- **Arrêt** (`onApplicationShutdown`) : le job est retiré du registre.
- **Fuseau horaire** : celui du processus Node (aucun fuseau configuré). Une expression comme `0 8 * * *` s'exécute donc à 8 h heure locale de la machine.
- **Défaut** : sans `GARMIN_PERSONAL_API_KEY`, la planification active (valeur par défaut) fait échouer chaque déclenchement en `GARMIN_ACCESS_DENIED`, journalisé. Le démarrage n'est pas affecté.

Exécution (`runScheduledSync()`, à chaque déclenchement) :

- Succès : log de niveau `log` avec les compteurs `created`, `updated`, `ignored` et la durée en millisecondes.
- Échec : log de niveau `error` avec le nom de la classe d'erreur et, pour une `DomainError`, son code (par exemple `GarminUnavailableError (GARMIN_UNAVAILABLE)`). Ni la clé, ni le jeton, ni le message brut ne sont journalisés. L'erreur n'est pas relancée : le déclenchement suivant reste possible.
- Verrou en mémoire (processus unique) : un déclenchement reçu pendant une exécution planifiée en cours est ignoré, avec un log `warn`. Le verrou ne couvre que les exécutions planifiées : `POST /api/garmin-sync/run` n'y est pas soumis et peut donc chevaucher une exécution planifiée. La contrainte unique sur `garmin_activity_id` protège des doublons.

Tests : e2e avec `GARMIN_SYNC_CRON_ENABLED=false` (`vitest.config.e2e.ts`), donc aucun job ne démarre pendant les tests. Unitaires : `garmin-sync.scheduler.spec.ts`, avec `SchedulerRegistry` et use case simulés et fake timers, sans `CronJob` réel.

## Flux de synchronisation

1. `findLatestStartedAt()` lit la date de début la plus récente de la table `activities`.
2. `SyncWindow.resumingFrom(latest)` calcule le début de la fenêtre : la dernière activité connue moins **7 jours** (fenêtre de recouvrement, pour rattraper les modifications récentes côté Garmin). Sans activité connue, la borne est nulle.
3. `fetchActivitiesSince(since)` interroge Garmin (voir « Vérifié par la spécification » et « Reste une hypothèse » plus bas). Le paramètre `startDate` envoyé est la date UTC de `since` moins un jour. Si `since` est nul, l'historique démarre 365 jours avant maintenant.
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
- Fenêtre : `since` = dernière activité connue − 7 jours (`SyncWindow`). Côté Garmin, `startDate` est envoyé à la date UTC de `since` moins un jour (voir ci-dessous).
- Historique initial : 365 jours quand aucune activité n'est connue (non vérifié, voir ci-dessous).

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

## Vérifié par la spécification

Ces points sont isolés dans `garmin-connect.adapter.ts` (constantes) et `garmin-connect.external-mapper.ts` (schéma zod `garminActivitySchema`). Source : `docs/technique/garmin/swagger.json`, opération E03 (`GET /activitylist-service/activities/search/activities`) et schémas `SummarizedActivityDTO` et `ActivityTypeDTO`. Le catalogue [API Garmin Personal, endpoints](../garmin-personal-api-endpoints.md) détaille les écarts.

- **Endpoint** : `GET {GARMIN_PERSONAL_API_BASE_URL}/activitylist-service/activities/search/activities` (constante `ACTIVITIES_PATH`).
- **Taille de page** : `limit` est envoyé à 99 (`PAGE_SIZE`), valeur par défaut documentée par la spécification. Aucun maximum n'est documenté.
- **Date de début** : `startDate` est une date `AAAA-MM-JJ`, inclusive, basée sur l'**heure locale** de l'activité (et non UTC). L'adapter envoie la date UTC de `since` moins un jour, pour absorber l'écart entre heure locale et UTC. La fenêtre réellement interrogée commence donc entre 7 et 9 jours environ avant la dernière activité connue, selon le fuseau. Les activités déjà connues sont absorbées par l'upsert (pas de doublon).
- **`activityId`** : entier int64. Accepté seulement s'il est un entier positif ou nul, dans la plage sûre de JavaScript (au plus 2^53 − 1) ; une chaîne ou un entier plus grand est ignoré (voir « Éléments invalides »).
- **`startTimeGMT`** : `AAAA-MM-JJ HH:MM:SS`, sans suffixe, en GMT, lu comme UTC. Le pattern de la spécification ne comporte pas de fraction de seconde : un élément qui en porte une est ignoré avec un `warn`.
- **`duration`** : nombre réel en secondes. **`distance`** : nombre réel en mètres, optionnel (absent ou `null` donne `null`).
- **`activityType.typeKey`** : chaîne, lue depuis `ActivityTypeDTO`.
- **Champs non lus** : `activityName`, `startTimeLocal` et les autres champs restent dans `sourcePayload`. `activityName` n'est pas mappé sur le Domain.
- **Optionnalité** : la spécification ne déclare aucun champ `required` dans `SummarizedActivityDTO`. L'adapter exige `activityId`, `activityType.typeKey`, `startTimeGMT` et `duration`, parce que le Domain (`Activity`) en a besoin ; un élément qui les omet est ignoré. Écart justifié par l'exigence du Domain, non par la spécification.
- **Format de réponse** : tableau JSON de `SummarizedActivityDTO` (enveloppe non tableau traitée comme indisponibilité).

## Reste une hypothèse

- **Plafond de `limit`** : la spécification ne documente aucun maximum. Si Garmin renvoie moins de 99 éléments par page, l'arrêt sur page incomplète (`items.length < PAGE_SIZE`) interrompt la pagination à tort. Vérification réelle nécessaire.
- **Plafond de pagination** : 50 pages (`MAX_PAGES`, soit 4 950 activités avec des pages de 99). Au-delà, un `warn` est journalisé et les activités suivantes ne sont pas récupérées. Non documenté par la spécification.
- **Fraction de seconde dans `startTimeGMT`** : la spécification ne l'autorise pas ; si Garmin en renvoie une, l'élément est ignoré. À vérifier sur de vraies réponses.
- **Ids au-delà de 2^53** : rejetés par la validation (`safe()`), signalés par un `warn`. Si Garmin émet de tels ids, il faudra les lire sans passer par un nombre JavaScript dans le mapper.
- **Fuseau de `startDate`** : la spécification indique l'heure locale de l'activité, sans préciser le fuseau de référence si l'activité n'en a pas.
- **Historique initial** : 365 jours quand aucune activité n'est connue (`DEFAULT_HISTORY_DAYS`). La spécification ne donne aucune profondeur pour E03 : non vérifié.
- **Tri et enfants** : la spécification fixe `sortBy` à `startLocal`, `sortOrder` à `desc` et `excludeChildren` à `true` par défaut. Sans `excludeChildren=false`, les activités enfants (jambes d'un multisport) sont exclues. L'adapter n'envoie pas ces paramètres : écart à décider, hors périmètre de #25.
- **Statuts de refus** : 401 et 403 sont traités comme un refus de la clé ou du jeton. La spécification les décrit pour les endpoints de données ; le point d'échange du jeton n'est pas dans la spécification.
- **Format** : JSON confirmé pour la liste. Le téléchargement de fichier (E04) renvoie une archive dont le contenu n'est pas décrit : le format FIT n'est pas confirmé. Quotas non décrits. Voir la liste des points non vérifiés dans [API Garmin Personal](../garmin-personal-api.md).
- **Comportement réel** : aucun appel réel à l'API Garmin n'a été fait ; les tests utilisent un serveur simulé.

## Limites connues

- **Fenêtre de mise à jour** : seules les activités comprises dans la fenêtre sont relues. Une activité plus ancienne que la dernière activité connue moins 7 jours, modifiée côté Garmin, n'est pas mise à jour.
- **Pas de suppression** : une activité supprimée côté Garmin reste en base.
- **Verrou partiel** : le verrou du scheduler ne sérialise que les exécutions planifiées (voir [Synchronisation planifiée](#synchronisation-planifiée)). `POST /api/garmin-sync/run` n'est pas sérialisé avec elles : deux exécutions simultanées sont possibles. La contrainte unique sur `garmin_activity_id` protège des doublons ; le comportement en cas de conflit concurrent n'est pas testé.
- **Payload opaque** : le Domain stocke `sourcePayload` comme `unknown`. Le format n'est pas versionné ; un changement de format Garmin change le contenu comparé.
- **Activités invalides** : sautées et journalisées, sans compteur dédié.

## Tests

- Unitaires (colocalisés) : `Activity`, `GarminActivityId`, `SyncWindow`, `SyncGarminActivitiesUseCase` (fakes des ports), `GarminConnectAdapter` (serveur HTTP local `node:http`), `GarminPersonalApiTokenProvider`, `ActivityMapper`, `GarminSyncController`.
- Unitaires (colocalisés) complémentaires : `ListActivitiesUseCase` (fake du read model), `ActivitiesController` (use case substitué), `GarminSyncScheduler` (planification, verrou, journalisation des échecs).
- e2e (`test/`) : `activity-repository.e2e-spec.ts` (upsert sans doublon, `findLatestStartedAt`, `findByGarminActivityIds`, aller-retour du mapping) ; `garmin-sync.e2e-spec.ts` (Garmin simulé : première exécution, rejeu, payload modifié, fenêtre de 7 jours décalée d'un jour (`startDate`), activité invalide sautée, 502 et 503, absence de clé dans le corps) ; `activities.e2e-spec.ts` (liste vide, tri et pagination, filtres seuls et combinés, bornes incluses, pas de fuite de `rawPayload`, 400 `VALIDATION_FAILED` par champ).
- `openapi.e2e-spec.ts` vérifie que les deux codes figurent dans l'enum `ProblemCode`, que la route de synchronisation documente 200, 502 et 503, et que `GET /api/activities` documente ses paramètres et son 400.
