# Documentation sport-hub-back

État : socle technique livré (NestJS, configuration validée, Prisma avec les modèles `Activity`, `Slot`, `Goal`, `Discipline` et `Session` et leurs migrations, route de santé, erreurs au format Problem Details, CI, garde-fou d'architecture), plus le module `garmin-sync` : authentification auprès de l'API Garmin Personal, synchronisation manuelle des activités (story #8), synchronisation planifiée (story #9) et consultation paginée de la liste (story #10), le module `training-stats` : statistiques de volume par semaine ou par mois (story #11), et le module `workout-generation` : génération de séance par Claude, sans persistance (story #12), le module `creneaux` : créneaux libres ou occupés, ponctuels ou hebdomadaires, et leurs occurrences par période (issue #35), le module `objectifs` : objectifs événement, volume ou régularité, avec filtre des objectifs à venir (issue #36), le module `disciplines` : référentiel des disciplines alimenté par la synchronisation Garmin, libellé modifiable (issue #45), le module `seances` : séances planifiées composées de modules ordonnés, modifiables et journalisées (issue #37), le module `planification` : durée disponible restante des créneaux libres (issue #38) et génération de planning par l'IA dans les créneaux libres (issue #39), et le contrat OpenAPI versionné dans `docs/api/openapi.json`, généré sans base et vérifié en CI (story #22). Les sections sans contenu vérifié sont marquées « à compléter ».

## Technique
- [Architecture](technique/architecture.md)
- [Workflow Git](technique/workflow-git.md)
- [Données](technique/donnees.md) (modèles `Activity`, `Slot`, `Goal`, `Discipline` et `Session`, migrations, backfill des disciplines)
- [Développement](technique/developpement.md)
- [Contrat OpenAPI](technique/openapi.md) (`docs/api/openapi.json`, génération, garde-fou CI, import dans Apidog)
- [Erreurs de l'API](technique/erreurs-api.md) (RFC 9457, codes, correlation id)
- [API Garmin Personal](technique/garmin-personal-api.md) (authentification, points non vérifiés)
- [Catalogue des endpoints Garmin Personal](technique/garmin-personal-api-endpoints.md) (26 opérations de la spécification officielle, utilité pour les stories #11 et #12)
- Contextes (`technique/contextes/<nom>.md`) :
  - [garmin-sync](technique/contextes/garmin-sync.md) (synchronisation des activités, ports, route, erreurs, hypothèses Garmin)
  - [training-stats](technique/contextes/training-stats.md) (statistiques de volume, calcul à la demande, route `GET /api/stats`, règles de période)
  - [workout-generation](technique/contextes/workout-generation.md) (génération de séance par Claude, route `POST /api/workouts/generate`, sans persistance, erreurs IA)
  - [creneaux](technique/contextes/creneaux.md) (créneaux de disponibilité, récurrence hebdomadaire, occurrences par période, route `/api/slots`, heure murale locale)
  - [objectifs](technique/contextes/objectifs.md) (objectifs événement, volume ou régularité, règle « à venir », route `/api/goals`, bornes et erreurs)
  - [disciplines](technique/contextes/disciplines.md) (référentiel des disciplines, enregistrement par ACL depuis garmin-sync, routes `/api/disciplines`, libellé modifiable, bornes)
  - [seances](technique/contextes/seances.md) (séances planifiées composées de modules ordonnés, modifiables et journalisées, routes `/api/sessions`, règles et erreurs)
  - [planification](technique/contextes/planification.md) (durée disponible restante, génération de planning par l'IA, route `/api/planning/generate`, règles et erreurs)
- Décisions (`technique/decisions/`) :
  - [0001 : table centralisée code vers statut HTTP](technique/decisions/0001-table-centralisee-code-statut.md)
  - [0002 : correlation id par middleware et AsyncLocalStorage](technique/decisions/0002-correlation-id-middleware-als.md)
  - [0003 : connexion à la base au démarrage et dans le health check](technique/decisions/0003-connexion-base-au-demarrage.md)
  - [0004 : erreurs techniques Garmin modélisées en DomainError](technique/decisions/0004-erreurs-techniques-garmin-en-domain-error.md)
  - [0005 : statistiques calculées à la volée depuis la table activities](technique/decisions/0005-statistiques-calculees-a-la-volee.md)
  - [0006 : génération de séances sans persistance, statistiques lues par ACL, erreurs IA en DomainError](technique/decisions/0006-generation-seances-sans-persistance-et-acl-stats.md)
  - [0007 : planification de la synchronisation Garmin par CronJob et SchedulerRegistry](technique/decisions/0007-planification-cronjob-via-scheduler-registry.md)
  - [0008 : contrat OpenAPI généré en mode preview, sans base](technique/decisions/0008-contrat-openapi-genere-en-mode-preview.md)
  - [0009 : créneaux en heure murale locale, sans conversion UTC](technique/decisions/0009-creneaux-heure-murale-locale.md)
  - [0010 : référentiel des disciplines, ACL depuis garmin-sync et dates de synchronisation](technique/decisions/0010-referentiel-disciplines-acl-dates-de-synchronisation.md)

## Fonctionnel
- [Fonctionnalités](fonctionnel/fonctionnalites.md)
- [Glossaire](fonctionnel/glossaire.md)
- Parcours (`fonctionnel/parcours/<nom>.md`) :
  - [Synchroniser les activités Garmin](fonctionnel/parcours/synchroniser-activites-garmin.md)
  - [Consulter les activités synchronisées](fonctionnel/parcours/consulter-activites.md)
  - [Consulter les statistiques d'entraînement](fonctionnel/parcours/consulter-statistiques.md)
