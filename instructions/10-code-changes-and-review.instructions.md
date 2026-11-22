---
description: 'Méthode de travail de Copilot : étapes, clarification, migrations, contrats publics, refactorings, dépendances, résumé.'
applyTo: '**'
---
# Méthode de travail et revue

## Démarche
1. **Lire** les instructions applicables, le code voisin, les tests et les conventions du dépôt (`11`).
2. **Identifier** le Use Case et les frontières concernées (couche, Bounded Context, Adapter).
3. **Repérer** les règles métier et invariants existants. Ne pas inventer ceux qui manquent.
4. **Clarifier** : poser la question si la règle manquante change le comportement ; sinon formuler l'hypothèse explicitement (« Hypothèse : … ») dans le résumé.
5. **Changer** de façon ciblée, conformément à l'architecture existante, avec l'Ubiquitous Language.
6. **Tester** : ajouter/mettre à jour les tests adaptés (`09`).
7. **Contrôler** : exécuter build, tests, lint disponibles (commandes en `11`) ; signaler ceux qui n'ont pas pu l'être et pourquoi.
8. **Résumer** : changements, décisions, hypothèses, résultats de tests, risques de compatibilité.

## Règles spécifiques
- **Migrations** (schéma, données) : réversibles ou rétrocompatibles quand c'est possible ; en plusieurs étapes pour un déploiement sans interruption ; ne jamais perdre de données sans demande explicite ; signaler l'ordre de déploiement.
- **Contrats publics** (API, Integration Events, bibliothèques) : tout breaking change est signalé avant action et nécessite l'accord de l'utilisateur ; préférer l'ajout compatible (`08`).
- **Refactorings** : sans changement de comportement, séparés des changements fonctionnels, protégés par des tests existants ; pas de refonte d'architecture sans demande explicite.
- **Nouvelles dépendances** : justifier (besoin, alternative existante, maintenance, licence) ; jamais dans le Domain si elles sont techniques ; préférer ce que le dépôt utilise déjà.
- **Sécurité** : pas de secret dans le code ; entrées externes validées ; ne pas exposer de données sensibles.

## Contradictions
Si le dépôt contredit ces principes (ex. Entities annotées ORM, Anemic Domain Model, dépendances inversées), **suivre l'existant pour le code modifié**, le **signaler** dans le résumé et proposer une amélioration séparée, sans refondre.

## Revue de changement : checklist
- Dépendances conformes à `04` ? Règle métier au bon endroit (`02`) ?
- Invariants protégés, frontière d'Aggregate respectée (`03`) ?
- Aucune Entity exposée hors Application (`08`) ?
- Tests pertinents, cas limites présents, non affaiblis (`09`) ?
- Périmètre limité, hypothèses signalées, compatibilité évaluée ?

Ces vérifications ne remplacent ni la validation métier ni la revue humaine.
