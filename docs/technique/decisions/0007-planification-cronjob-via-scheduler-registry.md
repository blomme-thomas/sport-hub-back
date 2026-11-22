# ADR 0007 : planification de la synchronisation Garmin par CronJob et SchedulerRegistry

Statut : accepté (story #9).

## Contexte
La story #9 demande une synchronisation Garmin automatique dont la fréquence est configurable. Le décorateur `@Cron` de `@nestjs/schedule` reçoit son expression à la compilation : il ne peut pas la lire depuis la configuration validée au démarrage (`GARMIN_SYNC_CRON_EXPRESSION`). L'activation doit aussi pouvoir être coupée (`GARMIN_SYNC_CRON_ENABLED`), notamment en e2e.

## Décision
- `GarminSyncScheduler` (Inbound Adapter, `infrastructure/scheduler/`) crée au démarrage un `CronJob` de la bibliothèque `cron` (version exacte 4.4.0, dépendance directe du `package.json`) avec `CronJob.from`, puis l'enregistre dans `SchedulerRegistry` sous le nom `garmin-sync`.
- Si la planification est désactivée, aucun job n'est créé.
- Le job est retiré du registre à l'arrêt de l'application.
- Le scheduler ne contient aucune logique métier : il appelle `SyncGarminActivitiesUseCase`. Un verrou en mémoire évite le chevauchement de deux exécutions planifiées, et les erreurs sont journalisées sans être relancées.
- `ScheduleModule.forRoot()` est importé dans `GarminSyncModule`, seul consommateur à ce jour.

## Conséquences
- La fréquence et l'activation sont configurables sans recompilation, validées par zod au démarrage.
- `cron` est importé directement : la dépendance est explicite pour `deps:check` et ne dépend pas d'une dépendance transitive de `@nestjs/schedule`. Sa version est à garder alignée avec celle de `@nestjs/schedule`.
- Le code manipule un objet `CronJob` (API de la bibliothèque) plutôt qu'un décorateur : c'est un écart avec la forme habituelle de NestJS, assumé.
- Le verrou est en mémoire, donc valable pour un seul processus. Il ne couvre pas `POST /api/garmin-sync/run`.
- Le fuseau horaire est celui du processus Node.

Détail : [Contexte garmin-sync](../contextes/garmin-sync.md#synchronisation-planifiee), [ADR 0004](0004-erreurs-techniques-garmin-en-domain-error.md).
