# Changelog

Toutes les évolutions notables de `sport-hub-back` sont listées ici.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; versions au sens [SemVer](https://semver.org/lang/fr/).

## [0.1.0]

Première version de l'API sport-hub.

### Socle

- Socle NestJS, modèle de données et première migration Prisma.
- Erreurs uniformes au format Problem Details (RFC 9457).
- Client HTTP sortant fiable, vérification de santé de la base.
- Contrat OpenAPI versionné, généré sans base et vérifié en CI.
- Base de test e2e via Docker Compose.

### Garmin

- Authentification auprès de l'API Garmin Personal officielle.
- Synchronisation des activités dans la base, planifiée automatiquement.
- Liste paginée des activités, avec FC moyenne, détail et série de FC décodée depuis le fichier FIT d'origine.
- Exposition de l'effort perçu (RPE), du ressenti, des seuils de zones cardiaques, des données de récupération journalières, du nom affiché du compte et des calories journalières.

### Séances et planification

- Séances planifiées composées de modules ordonnés, avec titre, famille de sport (course, vélo, natation) et objectifs de séance.
- Récurrence hebdomadaire, liste des occurrences par période, déplacement, annulation et restauration d'une occurrence.
- Import d'un plan de séances en JSON (ajout uniquement), modèle d'import publié.
- Export d'une semaine, d'un mois ou d'une séance avec son réalisé en JSON.
- Rapprochement des activités Garmin réalisées avec les séances planifiées.
- Créneaux de disponibilité libres et occupés, calcul de la durée restante.
- Pauses qui suspendent la planification, export ICS en lecture seule.
- Référentiel des disciplines alimenté par la synchronisation Garmin, avec famille de sport.

### Objectifs et statistiques

- Objectifs et événements (format, date, temps cible), cible hebdomadaire et réalisé de la semaine.
- Volume d'entraînement par semaine et par mois, indicateurs agrégés du tableau de bord.
- Répartition par type et par famille de sport.

### Conseils (IA)

- Génération d'une séance d'entraînement via Claude.
- Génération du planning d'une période dans les créneaux libres.
- Commentaire généré par activité réalisée, bilan hebdomadaire d'une semaine ISO, conseil du tableau de bord.
- Modification manuelle du commentaire d'une activité.

### Corrections notables

- La FC à zéro est traitée comme l'absence de capteur.
- L'import accepte le titre, la distance et les zones cibles d'une séance.
- Les diagnostics Garmin temporaires ont été retirés.
