---
description: 'Persistance : Repositories, mapping, transactions, Read Models, Repository vs DAO.'
applyTo: 'src/modules/*/infrastructure/persistence/**,src/modules/*/domain/ports/outbound/**,src/core/**'
---
# Persistance et Repositories

> Définitions : `00-glossary-and-artifacts`. Conventions du dépôt : `11`.

## Repository
- Périmètre : **un Repository par Aggregate** (Root), avec des opérations en langage métier (`findById`, `save`, `findOverdueOrders`).
- **Interface** (Outbound Port) dans Domain/Application ; **implémentation** dans l'Infrastructure.
- Charge et sauvegarde l'Aggregate **entier et cohérent** ; ne renvoie jamais d'objet à moitié initialisé.
- Ne pas exposer de détails de stockage (requêtes, entités ORM, pagination technique) dans le contrat.

## Mapping Domain Model ↔ Persistence Model
- Le Persistence Model peut différer du Domain Model. Un Mapper dans l'Adapter convertit.
- Si le dépôt utilise directement le Domain Model comme modèle ORM (convention établie) : respecter, mais ne pas y ajouter de logique technique et le signaler dans `11`.
- La reconstitution depuis le stockage ne doit pas contourner les invariants (Factory de reconstitution si nécessaire).

## Repository vs DAO
- Repository : collection d'Aggregates, vocabulaire métier, Port du centre.
- DAO : accès table/source, vocabulaire technique, interne à l'Adapter.
- Un Repository peut s'appuyer sur un ou plusieurs DAOs ; l'inverse n'est pas vrai.

## Éviter
- Repository générique `Repository<T>` exposant `findAll/save/delete` pour tout : il ne traduit aucune intention métier. Acceptable comme **base technique interne**, pas comme contrat du Domain.
- Un Repository par table par réflexe : les Entities internes d'un Aggregate n'ont pas de Repository propre.
- Requêtes de consultation complexes dans les Repositories d'Aggregate : utiliser un Read Model.

## Transactions et Unit of Work
- Démarcation au niveau du Use Case (`05`), pas dans le Repository ni le Domain.
- Suivre le mécanisme du framework existant ; ne pas introduire de Unit of Work sans besoin.
- Concurrence : contrôle optimiste par version si le dépôt le propose.

## Projections et Read Models
- Servent les Queries (affichage, rapports) ; peuvent être dénormalisés et alimentés par events (eventual consistency).
- Sans règle métier ; ne jamais les utiliser pour reconstituer un Aggregate à modifier.
- Un accès direct en lecture (SQL, vue) via un Outbound Port de lecture est acceptable pour les Queries.

## Dans ce dépôt
- Persistance : Prisma + PostgreSQL (`prisma/schema.prisma`). Le modèle Prisma généré est distinct des entities de domaine : conversion dans `infrastructure/persistence/prisma/<name>.mapper.ts` (squelette `instructions/templates/mapper.template.ts`) ; pas de décorateur Prisma sur les entities de domaine.
- Port : `domain/ports/outbound/<name>.repository.port.ts` (interface `I<Name>Repository` + token `Symbol`, squelette `instructions/templates/outbound-port.template.ts`) ; adapter : `infrastructure/persistence/prisma/<name>.repository.adapter.ts` (squelette `instructions/templates/repository-adapter.template.ts`), injectant un `PrismaService` partagé depuis `src/core/prisma`.
- Systèmes externes (Garmin Connect, Claude/Anthropic) : adapters dédiés dans `infrastructure/adapters/`, pas dans `infrastructure/persistence/` — voir `08` et `11` §Spécificités du domaine (squelette générique : `instructions/templates/external-port.template.ts`).
- Migrations versionnées dans `prisma/migrations` (première : table `activities`) : ne jamais les éditer, une évolution = une nouvelle migration via `prisma migrate dev` ; pas de `prisma db push` ; `prisma migrate deploy` en CI, e2e et production (`11` §Commandes). Le modèle `Activity` est persisté par le module `garmin-sync` : entity `Activity` (domain), port `IActivityRepository` (`domain/ports/outbound/activity.repository.port.ts`), adapter `PrismaActivityRepositoryAdapter` et mapper `ActivityMapper` (`infrastructure/persistence/prisma/`). `PrismaActivityRepositoryAdapter.save()` écrit le lot d'upserts dans une seule `$transaction` ouverte par l'adapter : écart avec la règle de démarcation au niveau du Use Case ci-dessus (choix de la story #8), à arbitrer.
- Cache Redis : optionnel, à introduire dans `src/core/cache` seulement sur besoin réel (ex. limiter les appels à l'API Garmin).

## Migrations de schéma
Compatibles avec le déploiement progressif ; changements en plusieurs étapes si nécessaire ; voir `10`.
