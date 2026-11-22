# Parcours : synchroniser les activités Garmin

Issu de l'issue #8. Pas d'interface utilisateur à ce jour : le parcours est exécuté par un appel HTTP à l'API locale.

## Prérequis

- La base PostgreSQL est joignable et les migrations sont appliquées.
- La clé de l'API Garmin Personal est renseignée dans `.env` (`GARMIN_PERSONAL_API_KEY`). Sans elle, la synchronisation échoue en 502.

## Déroulé

1. L'utilisateur appelle `POST /api/garmin-sync/run`, sans corps.
2. L'API reprend la synchronisation à partir de sa dernière activité connue, moins 7 jours. Si aucune activité n'est connue, elle récupère l'historique des 365 derniers jours.
3. Les activités nouvelles sont enregistrées, les activités connues modifiées côté Garmin sont mises à jour, les autres sont laissées telles quelles.
4. L'API répond 200 avec le résumé : `created` (créées), `updated` (mises à jour), `ignored` (ignorées, inchangées).

Relancer le parcours ne crée aucun doublon.

## Déclenchement automatique

Sans appel manuel, la synchronisation s'exécute selon `GARMIN_SYNC_CRON_EXPRESSION` (par défaut `0 */3 * * *`, toutes les 3 heures) ; `GARMIN_SYNC_CRON_ENABLED=false` la désactive. La planification démarre avec l'API et s'arrête avec elle. Elle suit l'heure locale du processus.

- Chaque déclenchement exécute la même synchronisation que `POST /api/garmin-sync/run` et journalise son résumé (créées, mises à jour, ignorées, durée).
- Un déclenchement arrivé pendant une synchronisation planifiée en cours est ignoré et journalisé.
- Une erreur (clé refusée, Garmin indisponible) est journalisée sans détail sensible ; le déclenchement suivant a lieu normalement.
- Pas de réponse HTTP pour ce déclenchement : le suivi se fait dans les logs.
- La synchronisation manuelle n'est pas sérialisée avec la planifiée : les deux peuvent se chevaucher (les doublons restent évités par la base).

## Cas d'erreur

| Situation | Réponse | Code |
|---|---|---|
| Clé absente ou refusée par Garmin, ou jeton refusé après renouvellement | 502 | `GARMIN_ACCESS_DENIED` |
| Garmin en panne, délai dépassé, réponse inattendue | 503 | `GARMIN_UNAVAILABLE` |

Les réponses d'erreur ne contiennent ni la clé, ni le jeton, ni détail interne. Une activité Garmin au format inattendu est ignorée sans faire échouer la synchronisation.

## Critères d'acceptation (issue #8)

Statut vérifié sur le code et les noms des tests ; les tests n'ont pas été exécutés par cette mise à jour de la doc.

| Critère | Couverture |
|---|---|
| Un appel enregistre les nouvelles activités | e2e `premiere_execution_cree_les_activites_et_renvoie_le_resume` |
| Relancer ne crée aucun doublon | e2e `rejeu_ne_cree_aucun_doublon_et_ignore_les_activites_connues` |
| Une activité modifiée côté Garmin est mise à jour | e2e `payload_modifie_met_a_jour_l_activite_existante` (limité à la fenêtre, voir le contexte) |
| La route renvoie le résumé | e2e `premiere_execution_cree_les_activites_et_renvoie_le_resume` |
| Clé invalide ou panne : erreur propre, sans détail | e2e `cle_refusee_repond_502_GARMIN_ACCESS_DENIED`, `panne_garmin_repond_503_GARMIN_UNAVAILABLE` |

Le format des activités Garmin n'est pas vérifié (voir la section « Reste une hypothèse » de [Contexte garmin-sync](../../technique/contextes/garmin-sync.md)) : le parcours est validé contre un Garmin simulé uniquement.
