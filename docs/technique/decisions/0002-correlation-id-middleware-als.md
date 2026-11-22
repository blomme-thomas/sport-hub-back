# ADR 0002 : identifiant de corrélation par middleware et AsyncLocalStorage

Statut : accepté (issue #3).

## Contexte
Chaque réponse d'erreur et chaque log doivent porter un identifiant permettant de relier une requête à ses logs, y compris pour les 404 de route inconnue.

## Décision
- Un middleware (`correlationIdMiddleware`) enregistré en premier dans `configureApp` reprend `X-Correlation-Id` s'il respecte `/^[A-Za-z0-9._:-]{1,128}$/`, sinon génère un UUID.
- L'identifiant est conservé dans un `AsyncLocalStorage`, lu par le filtre d'exceptions (repli sur le header de la requête si le contexte est absent).

## Conséquences
- Un middleware s'exécute avant le routage : l'identifiant existe même pour les routes inconnues, ce qu'un interceptor ne garantit pas.
- Pas de propagation manuelle de l'identifiant dans les signatures du code applicatif.
- Le header est exposé en CORS.

Détail : [Erreurs de l'API](../erreurs-api.md).
