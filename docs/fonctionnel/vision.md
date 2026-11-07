# Vision du produit

Document de vision, rédigé pour cadrer les prochaines stories. Il décrit ce que l'application doit faire, et non ce qui est déjà livré : pour les statuts réels, voir [Fonctionnalités](fonctionnalites.md). Ce document est à valider avant tout découpage en stories.

## Objectif

Une application personnelle de suivi d'entraînement, pour un utilisateur unique. Elle sert à préparer un objectif sportif, un triathlon dans le cas initial, mais la structure doit permettre d'autres objectifs.

L'application :
- importe les activités réalisées depuis Garmin Connect ;
- aide à planifier les entraînements à venir, en tenant compte du temps disponible et de l'objectif ;
- suit l'écart entre ce qui était prévu et ce qui a été fait ;
- conserve un historique qui permet à l'IA de proposer des séances de mieux en mieux adaptées.

Usage strictement local, sans authentification.

## Utilisateur

Une seule personne. Le tableau de bord est personnel. Aucune fonction de partage.

## Contextes métier

| Contexte | Rôle |
|---|---|
| **Activités** (livré) | Activités réalisées, importées depuis Garmin Connect |
| **Statistiques** (livré) | Agrégations de volume pour les graphiques du tableau de bord |
| **Créneaux** | Plages de temps libres ou occupées, ponctuelles ou récurrentes, saisies dans un calendrier interactif |
| **Objectifs** | Événements et objectifs personnels, avec leur format, leur date, leur temps cible et leur progression |
| **Planification** | Séances planifiées dans le calendrier, générées par l'IA ou saisies à la main |
| **Pauses** | Périodes pendant lesquelles aucune séance n'est planifiée |
| **Conseils** | Commentaires stockés sur les séances réalisées et bilans hebdomadaires |
| **Tableau de bord** | Vue d'ensemble, calculée à partir des contextes ci-dessus |

## Calendrier

Le calendrier est la vue centrale de l'application.

- **Créneaux libres ou occupés** : l'utilisateur les saisit, en ponctuel ou en récurrence (par exemple chaque mardi de 18 h à 20 h).
- **Séances planifiées** : chaque jour affiche la séance prévue et, s'il y en a une, l'activité réalisée correspondante, côte à côte.
- **Glisser-déposer** : une séance peut être déplacée d'un jour à l'autre, sans appel à l'IA.
- **Modification manuelle** : date, durée, description et modules d'une séance sont modifiables à tout moment.
- **Pauses** : une plage de dates qui suspend la planification, sans supprimer les séances existantes.

## Séance

Une séance est une suite de **modules** ordonnés. Exemple : une séance de natation comporte un échauffement, des exercices éducatifs, des séries, et un retour au calme.

Chaque module contient :
- sa durée ;
- sa consigne ;
- ses zones cibles (fréquence cardiaque, allure, puissance selon la discipline) ;
- son effort perçu visé, si pertinent.

La séance indique aussi sa discipline, son matériel et ses points d'attention. Ouvrir une séance affiche sa fiche complète, sans appel à l'IA.

## Génération de planning par l'IA

L'IA génère un planning sur une période choisie : **la semaine**, **le mois**, ou **jusqu'à un événement**.

Règles :
- l'IA ne travaille que sur les **dates futures** ;
- elle prend en compte les séances existantes de la période et remplit les créneaux libres autour ;
- elle **ne modifie, ne déplace et ne supprime jamais** une séance réalisée ;
- elle **ne modifie, ne déplace et ne supprime jamais** une séance modifiée à la main ;
- le planning généré est **appliqué directement**, sans étape de validation ;
- une génération est un seul appel à l'IA, quel que soit le nombre de séances produites.

Le placement dans les créneaux, les durées et les contraintes de temps sont calculés localement. L'IA n'intervient que pour le contenu des séances : type, modules, consignes, zones.

L'IA reçoit des **résumés** calculés en amont, et non les données brutes des activités. Une activité Garmin contient plus de deux cents champs, dont la plupart ne servent pas à la planification.

## Objectifs

Un objectif comporte :
- un **type** : événement sportif, volume cible, régularité ;
- une **date** ;
- un **format** et un **temps cible**, modifiables à tout moment ;
- une **progression**, calculée à partir des activités réalisées.

Un événement sportif est un objectif avec une date précise. La génération « jusqu'à l'événement » s'appuie sur cette date.

Plusieurs objectifs peuvent coexister. L'arbitrage entre eux n'est pas défini à ce stade.

## Activités réalisées sur le calendrier

Une activité Garmin réalisée est affichée à côté de la séance prévue du même jour et de la même discipline.

Un clic sur l'activité ouvre un **commentaire** sur ce qui a été bien ou mal fait. Le commentaire est généré une fois par activité, puis stocké : il n'est pas regénéré à chaque consultation.

Quand plusieurs activités ont lieu le même jour, ou quand une séance a été déplacée, le rapprochement n'est pas automatique : l'utilisateur choisit la correspondance.

Aucune génération n'est possible sur une date passée. Les séances passées restent telles qu'elles ont été réalisées.

## Historique

La base conserve durablement :
- les activités réalisées ;
- les séances planifiées, avec leur statut et leurs modifications ;
- les plannings générés ;
- les commentaires sur les activités ;
- les bilans hebdomadaires ;
- les ressentis saisis après une séance, lorsque l'utilisateur les renseigne.

Cet historique alimente les générations futures. Il est résumé avant d'être transmis à l'IA, pour rester compact.

## Tableau de bord

Le tableau de bord est personnel. Il affiche :
- la durée et le nombre d'entraînements, par période ;
- la répartition du volume par discipline ;
- un compte à rebours jusqu'au prochain événement ;
- la progression vers l'objectif ;
- le bilan de la semaine.

Les graphiques sont calculés localement, sans appel à l'IA.

### Bilan hebdomadaire

Un bilan est généré par semaine, puis stocké. Il comporte :
- le suivi : séances prévues contre séances réalisées, volume par rapport à la semaine précédente ;
- un point d'attention : une séance manquée, une surcharge, une discipline négligée ;
- un conseil général pour la semaine suivante.

Il est régénéré seulement à la demande.

## Intégration Garmin

L'application lit les activités depuis Garmin Connect. Elle n'écrit rien dans Garmin : les accès sont en lecture seule. Le calendrier de séances reste donc dans l'application.

Une exportation du calendrier au format ICS, en lecture seule, peut permettre de le consulter depuis l'agenda du téléphone.

## Hors périmètre à ce stade

- Authentification et partage.
- Écriture de séances vers Garmin.
- Entraînement automatique du modèle d'IA : l'amélioration passe par l'historique transmis à chaque génération, non par un entraînement.
- Arbitrage automatique entre plusieurs objectifs.

## Questions ouvertes

- Arbitrage entre plusieurs objectifs simultanés.
- Format de la fiche d'une séance pour les disciplines autres que le triathlon.
- Fréquence de régénération des bilans hebdomadaires : à la demande seulement, ou aussi automatique en fin de semaine.

## Ordre de découpage proposé

1. Tableau de bord sur les statistiques existantes.
2. Créneaux et calendrier interactif.
3. Objectifs et événements.
4. Génération de planning par l'IA, avec séances modulaires.
5. Activités réalisées affichées sur le calendrier, avec rapprochement.
6. Commentaires sur les activités et bilan hebdomadaire.
7. Pauses.
8. Export ICS.
