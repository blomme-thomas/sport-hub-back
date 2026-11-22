# ADR 0009 : créneaux en heure murale locale, sans conversion UTC

Statut : accepté (issue #35). L'hypothèse de fuseau reste à valider par l'utilisateur (issue #35, plan §11).

## Contexte
Un créneau est une plage que l'utilisateur voit sur son calendrier (par exemple « chaque mardi de 18 h à 20 h »). Le stocker comme instant UTC imposerait une conversion depuis le fuseau de l'utilisateur, et donc une gestion des changements d'heure, avec une librairie de dates ou une logique manuelle. L'issue laisse le fuseau « à trancher avant implémentation ».

## Décision
- La date (`YYYY-MM-DD`) et les heures (`HH:mm`) sont stockées telles qu'elles sont saisies : date calendaire et minutes depuis minuit (`slots.start_minute`, `slots.end_minute`). Aucun instant absolu n'est calculé ni stocké, et aucune librairie de dates n'est ajoutée.
- `timeZone` (fuseau IANA) est facultatif à la création, validé via `Intl`, défaut `Europe/Paris`. Il est stocké et renvoyé, mais il ne sert jamais à calculer.
- La récurrence hebdomadaire répète la même heure murale chaque semaine, en jours calendaires. Le minuit UTC n'est qu'une étiquette de jour.
- Un créneau tient dans une seule journée : la fin est au plus tard à `23:59`.

Détail : [Contexte creneaux](../contextes/creneaux.md#modèle-et-règles).

## Conséquences
- Les changements d'heure ne sont pas gérés. Un créneau reste à la même heure murale, ce qui correspond à la saisie, mais aucune heure absolue n'est dérivée.
- Modifier `timeZone` ne change aucune heure.
- Un calcul qui aurait besoin d'un instant absolu (par exemple une génération qui se projette dans le temps réel) demandera une nouvelle décision, qui devra s'appuyer sur le fuseau déjà stocké.
- Le plafond d'une journée par créneau et la fin de récurrence absente sont des limites assumées (voir le contexte).

## Alternatives écartées
- **Stockage en UTC** : rejeté, il impose une conversion et une gestion des changements d'heure.
- **RRULE (RFC 5545)** : rejeté, trop riche pour une récurrence hebdomadaire simple.
- **Occurrences matérialisées en base** : rejeté, une série sans date de fin serait infinie.
