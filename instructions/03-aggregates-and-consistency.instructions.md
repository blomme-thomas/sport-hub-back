---
description: 'Aggregates : frontière de cohérence, Aggregate Root, taille, références, opérations multi-Aggregates, eventual consistency.'
applyTo: 'src/modules/*/domain/entities/**,src/modules/*/domain/value-objects/**,src/modules/*/domain/ports/**,src/shared/domain/**'
---
# Aggregates et cohérence

> Définitions : `00-glossary-and-artifacts`. Conventions du dépôt : `11`.

## Règles incontournables
- L'Aggregate est une **frontière de cohérence** : ses invariants sont vrais après chaque opération.
- Tout accès/modification de l'intérieur passe par l'**Aggregate Root** ; l'extérieur ne détient pas de références vers des objets internes.
- Une transaction modifie **un seul Aggregate** (règle par défaut). Déroger doit être une décision explicite et signalée.
- Les Aggregates se référencent **par identité** (Aggregate Id), pas par référence d'objet.

## Dimensionner un Aggregate
- Le plus **petit** possible : n'inclure que ce qui doit être cohérent *immédiatement*.
- Critères : invariant commun ? modifié ensemble ? contention de concurrence acceptable ?
- Signaux d'Aggregate trop gros : collections non bornées, chargement lourd, conflits de concurrence fréquents, graphe navigable profond.
- Une relation en base ou un besoin d'affichage **n'est pas** une raison d'inclusion : utiliser un Read Model (`06`).

## Modifier
- Via des méthodes de la Root exprimant l'intention métier ; la Root valide les invariants avant de changer l'état.
- Concurrence : prévoir un contrôle optimiste (version) si le dépôt/la persistance le supporte ; ne pas l'imposer sans besoin.
- La Root collecte les Domain Events ; leur publication relève de l'Application (`05`, `07`).

## Opérations sur plusieurs Aggregates
1. Vérifier d'abord si un seul Aggregate suffit (frontière mal placée ?).
2. Sinon, orchestrer dans un Use Case : un Aggregate modifié par transaction, les autres via **Domain Events** et **eventual consistency**.
3. Lecture d'un autre Aggregate pour décider : passer par un Domain Service ou une donnée en paramètre ; ne pas le détenir.
4. Processus long, étapes compensables : voir Sagas/Process Managers dans `07` (seulement si nécessaire).

## Eventual consistency (cohérence éventuelle)
Acceptable quand le métier tolère un délai (confirmer avec le métier, ne pas supposer). Prévoir idempotence et reprise (`07`). Cohérence immédiate requise → réexaminer la frontière de l'Aggregate.

## Dans ce dépôt
- Aggregate Root = Entity qui étend la classe de base partagée `AggregateRoot` (`src/shared/domain/aggregate-root.ts`, collecte `addDomainEvent`/`pullDomainEvents`) ; reste dans `domain/entities/*.entity.ts`, pas de dossier `aggregates/` séparé (voir `11`).
- Squelette : `instructions/templates/aggregate-root.template.ts` (Factory `create()`/`reconstitute()` incluse).

## Anti-patterns
- « God Aggregate » (ex. `Customer` contenant toutes ses commandes) : performances et conflits.
- Graphes d'objets chargés entièrement par réflexe (lazy loading dans le Domain).
- Transaction globale supposée couvrant plusieurs Aggregates/services.
- Modifier un objet interne sans passer par la Root.
