---
description: 'Application Layer : Use Cases, orchestration, Commands/Queries, transactions, CQRS pragmatique.'
applyTo: 'src/modules/*/application/use-cases/**,src/modules/*/application/dtos/**'
---
# Application Layer

> Définitions : `00-glossary-and-artifacts`. Conventions du dépôt : `11`.

## Rôle
Coordonner un scénario : recevoir une Command/Query, charger les Aggregates via Outbound Ports, appeler leurs comportements, persister, publier les événements, renvoyer un Application DTO. **Aucune règle métier** ici.

## Orchestration vs règle métier
- Orchestration : ordre des appels, transaction, Ports, appels externes, mapping.
- Règle métier : condition ou calcul qui change la décision métier → Domain.
- Test de décision : si l'on change cette règle, le métier est-il impacté ? Oui → Domain.

## Use Cases, Handlers, Commands, Queries
- Un Use Case = une intention (`ValidateOrder`), nommé en langage métier.
- Un Handler par Command/Query, ou un Application Service regroupant quelques Use Cases cohérents d'un même Aggregate ; éviter l'Application Service « fourre-tout ».
- Command/Query : objets simples, immuables, indépendants du transport.
- Ne jamais retourner d'Entity/Aggregate : renvoyer un Application DTO ou un identifiant.

## Transactions
- La frontière transactionnelle est le Use Case ; un Aggregate modifié par transaction (`03`).
- Ne pas laisser une transaction ouverte autour d'appels externes lents ; préférer events/Outbox (`07`).
- Unit of Work uniquement si le projet l'utilise déjà.

## Responsabilités par couche
| Sujet | Où |
|---|---|
| Validation de **forme** (types, champs requis) | Frontière / Inbound Adapter (`08`) |
| Validation **métier** (invariants) | Domain |
| Autorisation | Application (le droit d'exécuter le Use Case) ; l'authentification vit en Adapter ; règles d'accès fondées sur le métier : Domain |
| Erreurs | Le Domain lève des Business Errors ; l'Application les laisse passer ou les enrichit ; l'Adapter les traduit en réponse |

## CQRS : quand ?
- **Utile** : lectures et écritures aux besoins très différents (Read Models, performances, vues agrégées).
- **Pas utile** : CRUD simple, modèle de lecture ≈ modèle d'écriture. Séparer Commands/Queries (nommage et Handlers) est peu coûteux ; **séparer les stockages ou l'event sourcing** est une décision lourde à ne prendre que sur besoin avéré et demande explicite.

## Dans ce dépôt
- Un Use Case = classe `@Injectable()` dans `application/use-cases/<verbe-nom>.use-case.ts`, avec une méthode `execute(...)`, qui injecte ses ports par `@Inject(<NAME>_REPOSITORY)`. Squelette : `instructions/templates/use-case.template.ts`.
- Pas de Command/Query formelles : les paramètres de `execute` sont des arguments simples ou des Application DTOs (`application/dtos/*.dto.ts`, squelette `instructions/templates/application-dto.template.ts`) ; ne pas introduire CQRS (cf. `11`, pas de besoin identifié).
- Pas de transaction applicative explicite ; n'en ajouter que sur besoin réel, au niveau du Use Case.
- Pas d'authentification (usage local, voir `08`/`11`) : aucun utilisateur courant à extraire/propager.

## Anti-patterns
- Application Service contenant des `if` métier (Anemic Domain Model, voir `02`).
- Use Case dépendant d'un type de transport (requête HTTP, JSON).
- Appels entre Use Cases en cascade difficiles à tester ; préférer extraire la logique partagée dans le Domain.
