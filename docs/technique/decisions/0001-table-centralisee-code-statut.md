# ADR 0001 : table centralisée code vers statut HTTP, 422 par défaut

Statut : accepté (issue #3).

## Contexte
Les Business Errors (`DomainError`) ne connaissent pas HTTP. Il faut les traduire en statuts HTTP de façon cohérente, sans que `src/core` importe `src/modules` (règle `deps:check`).

## Décision
- Une table unique `DOMAIN_ERROR_STATUS` (`src/core/filters/error-status.table.ts`), clés en chaînes littérales, plutôt qu'un registre par module.
- Un code absent de la table donne un 422 (`DEFAULT_DOMAIN_ERROR_STATUS`) et un log `warn`.

## Conséquences
- Tous les statuts sont visibles au même endroit ; l'enum OpenAPI des codes est dérivée de la table.
- Chaque nouvelle Business Error exige une entrée dans la table (oubli signalé par le `warn`, sans casser l'API).
- Les clés sont des chaînes non vérifiées par le compilateur : un code renommé silencieusement retombe en 422. D'où la règle : un `code` ne se renomme pas.
- Alternative écartée : registre par module (plus de couplage de `src/core` vers les modules ou mécanisme d'enregistrement dynamique).

Détail : [Erreurs de l'API](../erreurs-api.md).
