# Fonctionnalités

Périmètre visé (d'après `CLAUDE.md`) : synchronisation Garmin Connect, calcul des statistiques d'entraînement, génération de séances par IA. Les statuts ci-dessous sont ceux du code à la date de la mise à jour.

| Domaine | Fonctionnalité | Statut |
|---|---|---|
| Garmin | Authentification auprès de l'API Garmin Personal (clé, jeton) | Livrée (issue #7) ; format de réponse du jeton vérifié, format des activités non vérifié |
| Synchronisation Garmin | Synchronisation manuelle des activités dans la base (`POST /api/garmin-sync/run`), sans doublon, avec fenêtre de recouvrement de 7 jours | Livrée (issue #8). Parcours : [Synchroniser les activités Garmin](parcours/synchroniser-activites-garmin.md) |
| Synchronisation Garmin | Synchronisation automatique planifiée | Non livrée (story #9) |
| Synchronisation Garmin | Consultation des activités (liste paginée, filtres par date et par type, `GET /api/activities`) | Livrée (issue #10). Parcours : [Consulter les activités synchronisées](parcours/consulter-activites.md) |
| Statistiques d'entraînement | Volume par semaine ISO ou par mois UTC (nombre de séances, durée, distance), total et par type, avec période précédente et variation (`GET /api/stats`). Métriques de volume uniquement. | Livrée (issue #11). Parcours : [Consulter les statistiques d'entraînement](parcours/consulter-statistiques.md) |
| Statistiques d'entraînement | Métriques physiologiques (VO2max estimée, charge d'entraînement) | Hors périmètre (issue #11) |
| Séances | Génération de séance d'entraînement par IA à partir des statistiques des dernières semaines (`POST /api/workouts/generate`), sans enregistrement de la séance | Livrée (issue #12). Parcours : à compléter (critères d'acceptation de l'issue non disponibles dans le dépôt) |
| Séances | Historique et enregistrement des séances générées | Non livrée (hypothèse du plan, voir [ADR 0006](../technique/decisions/0006-generation-seances-sans-persistance-et-acl-stats.md)) |
