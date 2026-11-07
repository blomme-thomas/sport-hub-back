# Parcours : consulter les activités synchronisées

Issu de l'issue #10. Pas d'interface utilisateur à ce jour : le parcours est exécuté par un appel HTTP à l'API locale.

## Prérequis

- La base PostgreSQL est joignable et les migrations sont appliquées.
- Des activités ont été synchronisées (voir [Synchroniser les activités Garmin](synchroniser-activites-garmin.md)) ; sinon la liste est vide.

## Déroulé

1. L'utilisateur appelle `GET /api/activities`, avec les paramètres optionnels suivants :

   | Paramètre | Défaut | Règle |
   |---|---|---|
   | `page` | `1` | Entier entre 1 et 1 000 000 |
   | `pageSize` | `20` | Entier entre 1 et 100 |
   | `from` | aucun | Date ISO 8601 stricte ; activités démarrées à cette date ou après (borne incluse) |
   | `to` | aucun | Date ISO 8601 stricte ; activités démarrées à cette date ou avant (borne incluse), postérieure ou égale à `from` |
   | `type` | aucun | Type d'activité, espaces en bordure retirés, 64 caractères au plus, non vide ; correspondance exacte et sensible à la casse (`running`, `cycling`...) |

   Dates (`from`, `to`) : le format doit être ISO 8601 strict (erreur `IS_ISO8601`), puis la valeur doit être interprétable comme une date (erreur `IS_PARSABLE_DATE`, par exemple une semaine ISO comme `2026-W18-1`). `to` est inclusif : `to=2026-05-10T06:30:00.000Z` retient l'activité démarrée à cette milliseconde. Une date sans heure (`2026-05-10`) est lue à minuit UTC : `to=2026-05-10` exclut les activités de ce jour démarrées après minuit UTC (comportement lu dans le code, non couvert par les tests).

2. L'API renvoie 200 avec une page d'activités, de la plus récente à la plus ancienne (à date égale, par identifiant interne décroissant) :

   ```json
   {
     "items": [
       {
         "id": "3f2c9a4e-8b1d-4c7a-9e2f-6a5b4c3d2e1f",
         "garminActivityId": "12345678901",
         "type": "running",
         "startedAt": "2026-05-01T06:30:00.000Z",
         "durationSeconds": 3600.5,
         "distanceMeters": 10250.75
       }
     ],
     "page": 1,
     "pageSize": 20,
     "total": 45
   }
   ```

3. `total` est le nombre d'activités correspondant aux filtres, toutes pages confondues. Une page au-delà de la fin renvoie `items` vide et le `total`.

Chaque élément ne contient que le résumé : la charge brute Garmin n'est jamais renvoyée. `distanceMeters` vaut `null` quand Garmin ne fournit pas la distance.

## Cas d'erreur

| Situation | Réponse | Code |
|---|---|---|
| Paramètre inconnu, valeur hors bornes, date mal formée, `to` antérieur à `from`, `type` vide ou de plus de 64 caractères | 400 | `VALIDATION_FAILED`, détail par champ dans `errors` |

Codes de `errors[].code` par cas (champ `field` entre parenthèses) : `MIN` (`page`, `pageSize` inférieurs au minimum), `MAX` (`page` au-delà de 1 000 000, `pageSize` au-delà de 100), `IS_INT` (`page` non entier), `IS_ISO8601` (`from`, `to` : format non strict), `IS_PARSABLE_DATE` (`from`, `to` : format valide mais date non interprétable), `IS_NOT_BEFORE_FROM` (`to`, antérieur à `from`), `IS_NOT_EMPTY` (`type` vide ou blanc), `MAX_LENGTH` (`type` de plus de 64 caractères), `PROPERTY_NOT_ALLOWED` (paramètre inconnu).

## Critères d'acceptation (issue #10)

Statut vérifié sur les noms des tests ; à relancer pour confirmer.

| Critère | Couverture |
|---|---|
| Liste vide renvoie une page vide et un total à zéro | e2e `sans_activite_renvoie_une_page_vide_avec_total_zero` |
| Tri de la plus récente à la plus ancienne, pagination | e2e `trie_de_la_plus_recente_a_la_plus_ancienne_et_pagine` |
| Filtres de date, seuls et combinés, bornes incluses | e2e `filtre_from_seul_inclut_la_borne`, `filtre_to_seul_inclut_la_borne`, `filtres_from_et_to_combines_bornent_la_liste` |
| Filtre de type exact et sensible à la casse | e2e `filtre_type_correspond_exactement_et_sensible_a_la_casse` |
| Pas de fuite de la charge brute | e2e `ne_renvoie_que_le_resume_jamais_la_charge_brute` |
| Validation par champ, 400 `VALIDATION_FAILED` | e2e `*_repond_400_VALIDATION_FAILED_avec_le_champ_en_erreur` |
| Route documentée dans OpenAPI | `openapi.e2e-spec.ts` `documente_la_route_GET_api_activities_avec_pagination_et_filtres` |
