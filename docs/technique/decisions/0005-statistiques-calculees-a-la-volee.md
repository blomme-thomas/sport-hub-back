# ADR 0005 : statistiques calculées à la volée depuis la table `activities`

Statut : accepté (issue #11).

## Contexte
L'issue #11 demande des statistiques d'entraînement par période. Elle prévoit un modèle Prisma de statistiques seulement si les calculs à la volée sont trop coûteux. Le module `garmin-sync` possède la table `activities`, mais un module ne doit pas importer le Domain d'un autre module sans contrat explicite (`11`, §Arborescence).

## Décision
- Pas de table ni de migration de statistiques : `GET /api/stats` lit les activités de la plage (plus la période précédente la plus ancienne) et calcule les volumes en mémoire.
- Le module `training-stats` lit la table `activities` par un port de lecture `ITrainingActivityReadModel` (`TRAINING_ACTIVITY_READ_MODEL`), implémenté par une requête Prisma directe dans `infrastructure/persistence/prisma/`. Il n'importe rien de `garmin-sync`, et ne reconstitue aucune `Activity`.
- Les règles de calcul (périodes, volume, variation) sont dans le Domain, sans Prisma ni NestJS, et ne lisent que les faits renvoyés par le port (`TrainingActivityFact`).
- Périodes en UTC : semaine ISO (lundi 00:00:00.000 au dimanche 23:59:59.999) et mois calendaire.
- La plage est bornée à 104 périodes : au-delà, `STATS_RANGE_TOO_LARGE` (400), pour borner le volume lu et calculé.

## Conséquences
- Chaque requête relit les activités de la plage. Acceptable pour un usage mono-utilisateur ; à réexaminer si le volume ou la latence le justifient, ce qui ouvrirait la voie à un modèle de projection.
- Le module dépend de la structure de la table `activities` (couplage de lecture). Un changement de schéma de cette table doit être répercuté dans le read model.
- Les activités sont regroupées selon `startedAt` en UTC : une séance proche de minuit local peut changer de jour, de semaine ou de mois.
- Le DTO applicatif `TrainingStatsDto` sert de contrat à la génération de séances (story #12) : il ne doit pas être renommé.

Détail : [Contexte training-stats](../contextes/training-stats.md), [Parcours consulter les statistiques](../../fonctionnel/parcours/consulter-statistiques.md).
