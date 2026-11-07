# Fonctionnalités

Périmètre visé (d'après `CLAUDE.md`) : synchronisation Garmin Connect, calcul des statistiques d'entraînement, génération de séances par IA. Les statuts ci-dessous sont ceux du code à la date de la mise à jour.

| Domaine | Fonctionnalité | Statut |
|---|---|---|
| Garmin | Authentification auprès de l'API Garmin Personal (clé, jeton) | Livrée (issue #7) ; format de réponse du jeton vérifié, format des activités non vérifié |
| Synchronisation Garmin | Synchronisation manuelle des activités dans la base (`POST /api/garmin-sync/run`), sans doublon, avec fenêtre de recouvrement de 7 jours | Livrée (issue #8). Parcours : [Synchroniser les activités Garmin](parcours/synchroniser-activites-garmin.md) |
| Synchronisation Garmin | Synchronisation automatique planifiée | Non livrée (story #9) |
| Synchronisation Garmin | Consultation des activités | Non livrée (story #10) |
| Statistiques d'entraînement | Calcul des statistiques | Non livrée |
| Séances | Génération de séances par IA | Non livrée |
