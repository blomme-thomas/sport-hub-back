# Fonctionnalités

Périmètre visé (d'après `CLAUDE.md`) : synchronisation Garmin Connect, calcul des statistiques d'entraînement, génération de séances par IA. Les statuts ci-dessous sont ceux du code à la date de la mise à jour.

| Domaine | Fonctionnalité | Statut |
|---|---|---|
| Garmin | Authentification auprès de l'API Garmin Personal (clé, jeton) | Livrée (issue #7) ; format de réponse du jeton vérifié, format des activités non vérifié |
| Synchronisation Garmin | Synchronisation manuelle des activités dans la base (`POST /api/garmin-sync/run`), sans doublon, avec fenêtre de recouvrement de 7 jours | Livrée (issue #8). Parcours : [Synchroniser les activités Garmin](parcours/synchroniser-activites-garmin.md) |
| Synchronisation Garmin | Synchronisation automatique planifiée (toutes les 3 heures par défaut, expression et activation configurables, verrou contre le chevauchement des exécutions planifiées) | Livrée (story #9). Parcours : [Synchroniser les activités Garmin](parcours/synchroniser-activites-garmin.md#déclenchement-automatique) |
| Synchronisation Garmin | Consultation des activités (liste paginée, filtres par date et par type, `GET /api/activities`) | Livrée (issue #10). Parcours : [Consulter les activités synchronisées](parcours/consulter-activites.md) |
| Statistiques d'entraînement | Volume par semaine ISO ou par mois UTC (nombre de séances, durée, distance), total et par type, avec période précédente et variation (`GET /api/stats`). Métriques de volume uniquement. | Livrée (issue #11). Parcours : [Consulter les statistiques d'entraînement](parcours/consulter-statistiques.md) |
| Statistiques d'entraînement | Métriques physiologiques (VO2max estimée, charge d'entraînement) | Hors périmètre (issue #11) |
| Séances | Génération de séance d'entraînement par IA à partir des statistiques des dernières semaines (`POST /api/workouts/generate`), sans enregistrement de la séance | Livrée (issue #12). Parcours : à compléter (critères d'acceptation de l'issue non disponibles dans le dépôt) |
| Séances | Historique et enregistrement des séances générées | Non livrée (hypothèse du plan, voir [ADR 0006](../technique/decisions/0006-generation-seances-sans-persistance-et-acl-stats.md)) |
| Créneaux | Saisie, consultation par période, modification et suppression de créneaux libres ou occupés, ponctuels ou hebdomadaires (`/api/slots`), en heure murale locale, avec occurrences développées sur la période | Livrée (issue #35). Contexte : [creneaux](../technique/contextes/creneaux.md). Parcours : à compléter |
| Créneaux | Règle de résolution des chevauchements entre créneaux | Non livrée (reportée à la story de génération : les chevauchements sont acceptés et renvoyés tous deux) |
| Créneaux | Génération de séance tenant compte des créneaux libres et occupés | Non livrée (story à venir) |
| Créneaux | Fuseau horaire utilisé pour les calculs | Non livré : le fuseau est une métadonnée, les heures restent murales ([ADR 0009](../technique/decisions/0009-creneaux-heure-murale-locale.md)) |
| Objectifs | Création, consultation, modification et suppression d'un objectif (`/api/goals`) : événement avec titre, date cible, format et temps cible, ou volume et régularité ; modifiable à tout moment, sans contrainte de date | Livrée (issue #36). Contexte : [objectifs](../technique/contextes/objectifs.md). Parcours : à compléter |
| Objectifs | Liste des objectifs à venir (`GET /api/goals?upcoming=true` : date cible aujourd'hui ou postérieure, jour UTC ; sans date, jamais à venir) | Livrée (issue #36) |
| Objectifs | Calcul de la progression vers l'objectif | Non livré (hors périmètre de l'issue #36) |
| Objectifs | Génération de planning à partir de l'objectif | Non livré (hors périmètre de l'issue #36) |
| Objectifs | Arbitrage entre plusieurs objectifs simultanés | Non livré (question ouverte dans [la vision produit](vision.md)) |
