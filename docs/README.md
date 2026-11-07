# Documentation sport-hub-back

État : socle technique livré (NestJS, configuration validée, Prisma avec le modèle `Activity` et sa première migration, route de santé, erreurs au format Problem Details, CI, garde-fou d'architecture), plus le module `garmin-sync` : authentification auprès de l'API Garmin Personal et synchronisation manuelle des activités (story #8). Les sections sans contenu vérifié sont marquées « à compléter ».

## Technique
- [Architecture](technique/architecture.md)
- [Workflow Git](technique/workflow-git.md)
- [Données](technique/donnees.md) (modèle `Activity`, migrations)
- [Développement](technique/developpement.md)
- [Erreurs de l'API](technique/erreurs-api.md) (RFC 9457, codes, correlation id)
- [API Garmin Personal](technique/garmin-personal-api.md) (authentification, points non vérifiés)
- Contextes (`technique/contextes/<nom>.md`) :
  - [garmin-sync](technique/contextes/garmin-sync.md) (synchronisation des activités, ports, route, erreurs, hypothèses Garmin)
- Décisions (`technique/decisions/`) :
  - [0001 : table centralisée code vers statut HTTP](technique/decisions/0001-table-centralisee-code-statut.md)
  - [0002 : correlation id par middleware et AsyncLocalStorage](technique/decisions/0002-correlation-id-middleware-als.md)
  - [0003 : connexion à la base au démarrage et dans le health check](technique/decisions/0003-connexion-base-au-demarrage.md)
  - [0004 : erreurs techniques Garmin modélisées en DomainError](technique/decisions/0004-erreurs-techniques-garmin-en-domain-error.md)

## Fonctionnel
- [Fonctionnalités](fonctionnel/fonctionnalites.md)
- [Glossaire](fonctionnel/glossaire.md)
- Parcours (`fonctionnel/parcours/<nom>.md`) :
  - [Synchroniser les activités Garmin](fonctionnel/parcours/synchroniser-activites-garmin.md)
