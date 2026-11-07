# Parcours : consulter les statistiques d'entraînement

Issu de l'issue #11. Pas d'interface utilisateur à ce jour : le parcours est exécuté par un appel HTTP à l'API locale.

## Prérequis

- La base PostgreSQL est joignable et les migrations sont appliquées.
- Des activités ont été synchronisées (voir [Synchroniser les activités Garmin](synchroniser-activites-garmin.md)) ; sinon toutes les périodes ont des valeurs à zéro.

## Déroulé

1. L'utilisateur appelle `GET /api/stats` avec les paramètres suivants :

   | Paramètre | Obligatoire | Règle |
   |---|---|---|
   | `granularity` | oui | `week` (semaine ISO) ou `month` (mois calendaire) |
   | `from` | oui | Date `YYYY-MM-DD`, date calendaire réelle, interprétée en UTC |
   | `to` | oui | Date `YYYY-MM-DD`, date calendaire réelle, UTC, postérieure ou égale à `from` |
   | `type` | non | Type d'activité (`running`, `cycling`...), espaces en bordure retirés, 64 caractères au plus, non vide ; correspondance exacte et sensible à la casse. Absent : tous les types |

   Il n'y a pas de valeur par défaut : `granularity`, `from` et `to` doivent être fournis.

2. L'API renvoie 200 avec les périodes complètes de la plage, en ordre chronologique. Exemple (première semaine du jeu de test e2e, `granularity=week`, `from=2026-05-04`, `to=2026-05-24`, tronqué à une période) :

   ```json
   {
     "granularity": "week",
     "from": "2026-05-04",
     "to": "2026-05-24",
     "type": null,
     "periods": [
       {
         "start": "2026-05-04T00:00:00.000Z",
         "end": "2026-05-10T23:59:59.999Z",
         "totals": { "count": 1, "durationSeconds": 1800, "distanceMeters": 5000 },
         "byType": [
           { "type": "running", "count": 1, "durationSeconds": 1800, "distanceMeters": 5000 }
         ],
         "previous": {
           "start": "2026-04-27T00:00:00.000Z",
           "end": "2026-05-03T23:59:59.999Z",
           "totals": { "count": 0, "durationSeconds": 0, "distanceMeters": 0 },
           "byType": []
         },
         "variation": {
           "totals": {
             "count": { "absolute": 1, "percent": null },
             "durationSeconds": { "absolute": 1800, "percent": null },
             "distanceMeters": { "absolute": 5000, "percent": null }
           },
           "byType": [
             {
               "type": "running",
               "count": { "absolute": 1, "percent": null },
               "durationSeconds": { "absolute": 1800, "percent": null },
               "distanceMeters": { "absolute": 5000, "percent": null }
             }
           ]
         }
       }
     ]
   }
   ```

3. Lecture d'une période :
   - `totals` : `count`, `durationSeconds` et `distanceMeters` de la période ; `byType` : les mêmes mesures par type, triés par type (ordre alphabétique) ; `byType` est un tableau vide si la période est vide.
   - `previous` : la période de même granularité immédiatement avant, avec ses propres `totals` et `byType`.
   - `variation` : pour chaque mesure, `absolute` (courant moins précédent) et `percent` (écart relatif arrondi à une décimale). `percent` vaut `null` quand la période précédente vaut zéro. `variation.byType` couvre les types présents dans la période courante ou dans la précédente ; un type seulement présent dans la précédente apparaît avec une valeur courante à zéro.

## Règles de calcul

- **Périodes** : `week` est une semaine ISO, du lundi 00:00:00.000 UTC au dimanche 23:59:59.999 UTC ; `month` est un mois calendaire UTC. Une période est toujours renvoyée en entier.
- **Dates de la plage** : `from` et `to` ne découpent pas les périodes. La plage renvoie chaque période qui contient `from` ou `to` ou qui se trouve entre les deux. Ainsi `from=2026-05-13` avec `granularity=week` renvoie la semaine du 11 au 17 mai en entier.
- **`start` et `end`** : `start` est inclus ; `end` est inclusif et vaut la dernière milliseconde de la période (`23:59:59.999Z`), pas le début de la période suivante.
- **Champs `from` et `to` de la réponse** : ils reprennent les dates demandées, telles quelles. Ils ne sont pas étendus aux périodes complètes : ce sont les périodes de `periods` qui le sont.
- **Date de début** : une activité compte dans la période qui contient sa date de début (`startedAt`), en UTC. Une séance proche de minuit local peut donc changer de semaine ou de mois selon le fuseau.
- **Distance absente** : une activité sans distance compte pour une séance et sa durée, et pour zéro mètre.
- **Période précédente** : pour janvier, c'est décembre de l'année précédente ; pour la première semaine de l'année, c'est la dernière semaine de l'année précédente (semaine 52 ou 53).
- **Période en cours** : la période courante est comparée à la précédente complète ; une période en cours (non terminée) peut donc afficher une variation négative mécanique. Hors périmètre actuel.
- **Plage maximale** : 104 périodes au plus. Au-delà, la requête est refusée (voir ci-dessous).

## Cas d'erreur

| Situation | Réponse | Code |
|---|---|---|
| `granularity` absente ou différente de `week` et `month` | 400 | `VALIDATION_FAILED`, `errors[].field` = `granularity` |
| `from` ou `to` absent, mal formé, ou date impossible (ex. `2026-02-30`, `2026-13-01`) | 400 | `VALIDATION_FAILED`, `errors[].field` = `from` ou `to` |
| `to` antérieur à `from` | 400 | `VALIDATION_FAILED`, `errors[].field` = `to` |
| `type` vide ou blanc, ou de plus de 64 caractères | 400 | `VALIDATION_FAILED`, `errors[].field` = `type` |
| Paramètre inconnu | 400 | `VALIDATION_FAILED`, `errors[].field` = nom du paramètre |
| Plage de plus de 104 périodes | 400 | `STATS_RANGE_TOO_LARGE` |

Codes de `errors[].code` par cas : `IS_IN` (`granularity`), `IS_CALENDAR_DATE` (`from`, `to` : format ou date non réelle), `IS_NOT_BEFORE_FROM` (`to`), `IS_NOT_EMPTY` et `MAX_LENGTH` (`type`), `PROPERTY_NOT_ALLOWED` (paramètre inconnu).

Une période sans activité n'est pas une erreur : elle renvoie 200 avec des zéros et `byType` vide.

## Critères d'acceptation (issue #11)

Statut vérifié sur les noms des tests ; à relancer pour confirmer.

| Critère | Couverture |
|---|---|
| Totaux, ventilation par type, période précédente et variation par semaine | e2e `renvoie_les_totaux_la_ventilation_la_periode_precedente_et_la_variation_par_semaine` |
| Périodes mensuelles avec changement d'année, activité à `2026-12-31T23:59:59.999Z` | e2e `renvoie_une_periode_mensuelle_avec_changement_d_annee_et_fin_a_la_milliseconde` |
| Période sans activité : zéros, pas d'erreur | e2e `periode_sans_activite_renvoie_des_zeros_et_pas_une_erreur` |
| Filtre de type sur totaux, ventilation et période précédente | e2e `filtre_type_restreint_totaux_ventilation_et_periode_precedente` |
| Filtre de type exact et sensible à la casse | e2e `filtre_type_sensible_a_la_casse_renvoie_zero_si_aucune_correspondance` |
| Distance absente comptée pour zéro mètre | e2e `distance_absente_compte_la_seance_et_sa_duree_sans_distance` |
| Pas de fuite de la charge brute | e2e `ne_renvoie_jamais_la_charge_brute` |
| Validation par champ, 400 `VALIDATION_FAILED` | e2e `*_repond_400_VALIDATION_FAILED_avec_le_champ_en_erreur` (granularité, dates, `to` antérieur à `from`, `type`, paramètre inconnu) |
| Plage de plus de 104 périodes, 400 `STATS_RANGE_TOO_LARGE` | e2e `plage_de_plus_de_104_periodes_repond_400_STATS_RANGE_TOO_LARGE` |
| Route documentée dans OpenAPI | `openapi.e2e-spec.ts` `documente_la_route_GET_api_stats_avec_granularity_from_to_type_et_400` |
| Calculs de période, de plage, de volume et de variation (cas limites) | tests unitaires colocalisés (`*.spec.ts` du module `training-stats`) |

Les règles de calcul sont dans le Domain du module (voir [Contexte training-stats](../../technique/contextes/training-stats.md)).
