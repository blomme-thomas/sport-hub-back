---
description: 'Domain Model : emplacement des règles, invariants, choix des artefacts, Business Errors.'
applyTo: 'src/modules/*/domain/entities/**,src/modules/*/domain/value-objects/**,src/modules/*/domain/ports/**,src/shared/domain/**'
---
# Domain Model

> Définitions : `00-glossary-and-artifacts`. Conventions du dépôt : `11`.

## Règles incontournables
- Les **règles métier vivent dans le Domain**, au plus près des données qu'elles concernent (Entity/Value Object d'abord).
- Le Domain **ne dépend d'aucun détail technique** : pas de framework web, ORM, sérialisation, accès réseau/fichier/base, annotations de persistance (sauf convention établie du dépôt, à signaler dans `11`).
- Un objet ne doit pas pouvoir être créé ou modifié dans un état invalide.
- Ne pas inventer une règle métier : demander ou signaler l'hypothèse.

## Protéger les invariants
- Valider à la construction (constructeur/Factory) et à chaque transition d'état.
- Exposer des **comportements nommés métier** (`validate()`, `cancel(reason)`), pas des setters génériques.
- Ne pas exposer de collections internes modifiables ; renvoyer des vues ou copies.
- Rejeter par une Business Error explicite plutôt que corriger silencieusement.

## Choisir l'artefact
| Besoin | Artefact |
|---|---|
| Identité et cycle de vie | Entity |
| Valeur avec règle ou sens métier | Value Object |
| Règle sans propriétaire naturel | Domain Service (en dernier recours) |
| Création complexe/avec invariants | Factory |
| Règle réutilisée/composable | Policy / Specification |
| Fait métier à propager | Domain Event |

## Value Objects et types métier
- Immuables quand le langage le permet : une « modification » renvoie une nouvelle valeur.
- Préférer un type métier à un primitif **ambigu** (`Money` avec devise, `OrderId`, `EmailAddress`) ; ne pas encapsuler tout primitif par principe.

## Business Errors
- Exprimées en langage métier (`OrderAlreadyShipped`), distinctes des Technical Errors.
- Le Domain les signale (exception ou type résultat selon la convention du dépôt) ; la traduction (code HTTP, message) se fait aux frontières (`08`).
- Le **message** d'une Business Error est renvoyé tel quel au client (champ `detail` de la réponse Problem Details) : il doit être sûr, en langage métier, sans donnée interne, token, corps de réponse d'un système externe ni détail technique. Les détails techniques vont dans `cause` (jamais renvoyée) ou dans les logs.
- Une Business Error étend `DomainError` (`src/shared/domain/domain-error.ts`) et porte un `code` stable (UPPER_SNAKE_CASE), contrat public lu par le front : il ne se renomme pas (voir `11` §Erreurs HTTP).

## Dans ce dépôt
- Entities dans `domain/entities/*.entity.ts`, Value Objects dans `domain/value-objects/*.vo.ts` : classes TS pures, **sans décorateur Prisma** (le modèle de persistance est généré par Prisma à partir de `prisma/schema.prisma`, mappé via `infrastructure/persistence/prisma/*.mapper.ts`, voir `11`/`06`).
- Modules orientés sync/agrégation de données externes (Garmin) ou calcul (statistiques, génération IA) : ne pas sur-modéliser les parties purement CRUD ; ajouter du comportement dès qu'une vraie règle métier apparaît (ex. validité d'une séance générée, invariants d'une activité synchronisée).
- Les erreurs métier sont des Business Errors dédiées (`domain/errors/*.error.ts`, squelette `instructions/templates/domain-error.template.ts`), traduites en réponse HTTP par les filtres globaux (`08`).
- Squelettes : `instructions/templates/entity.template.ts`, `instructions/templates/value-object.template.ts`, `instructions/templates/domain-service.template.ts`, `instructions/templates/specification.template.ts` (voir `11` pour la table complète Artefact → Template).

## Anti-patterns
- **Anemic Domain Model** : Entities = sacs de données, règles dans les Application Services. Problème : invariants dispersés et contournables. Concerne surtout les cas où des règles métier existent ; un pur CRUD n'en a pas besoin.
- Entities réutilisées comme DTO ou Persistence Model.
- Domain Service fourre-tout contenant toute la logique.
- Primitives ambiguës (`string` pour tout) et validation répétée à plusieurs endroits.
