---
description: 'Domain Events et Integration Events, messaging, idempotence, Outbox/Inbox, Sagas.'
applyTo: '**/events/**,**/messaging/**,**/messages/**,**/listeners/**,**/consumers/**,**/publishers/**'
---
# Events et messaging

> Non utilisé à ce jour dans ce dépôt (aucun broker/event, voir `11`) : n'introduire events ou messaging que sur demande explicite. Définitions : `00-glossary-and-artifacts`.

## Ne pas imposer par défaut
Pas d'event sourcing ni de broker par défaut. **Une communication synchrone suffit** (appel direct, Outbound Port) quand : même contexte/processus, résultat immédiatement nécessaire, faible volume, pas de besoin de découplage temporel. Introduire la messagerie sur besoin avéré (découplage, résilience, intégration asynchrone).

## Domain Event vs Integration Event
| | Domain Event | Integration Event |
|---|---|---|
| Portée | interne au contexte | entre contextes/systèmes |
| Contrat | libre, peut évoluer | publié, stable, versionné |
| Contenu | Domain Model | données nécessaires, sans fuite du modèle interne |
| Émission | par l'Aggregate | par l'Application/Adapter après traduction |

## Nommage et publication
- Participe passé métier (`OrderValidated`) ; ne pas nommer selon une action technique (`OrderUpdated`).
- Domain Event : l'Aggregate l'enregistre ; l'Application le publie **après** la persistance réussie.
- Integration Event : traduire le Domain Event vers un contrat dédié ; inclure identifiant d'événement, horodatage, version.
- Publier un événement **sans** que la persistance et la publication puissent diverger : voir Outbox.

## Handlers et frontières
- Un Event Handler est un Inbound Adapter ou un Handler applicatif ; il appelle un Use Case, sans règle métier propre.
- Un Handler de Domain Event dans le même contexte ne modifie pas d'autres Aggregates dans la même transaction (`03`).
- Ne pas exposer les Domain Events aux autres contextes.

## Fiabilité (quand la messagerie est utilisée)
- **Doublons / idempotence** : tout consommateur doit tolérer le rejeu (identifiant d'événement dédupliqué, opérations idempotentes).
- **Ordre** : ne pas supposer un ordre global ; l'ordre n'est garanti que par clé/partition selon la technologie ; concevoir tolérant au désordre ou versionner.
- **Reprises et erreurs** : retries bornés avec backoff, dead letter queue, supervision ; distinguer erreur transitoire et permanente.
- **Outbox** : écrire l'événement dans la même transaction que l'Aggregate puis le publier de façon asynchrone — lorsque perdre ou dupliquer un message est inacceptable.
- **Inbox** : enregistrer les messages traités pour dédupliquer — lorsque l'effet du consommateur n'est pas idempotent.
- Ne pas ajouter Outbox/Inbox si le besoin de fiabilité ne le justifie pas.

## Sagas / Process Managers
Uniquement pour un processus métier réparti sur plusieurs contextes/Aggregates avec étapes et compensations. Alternative d'abord : Use Case orchestrant ou eventual consistency simple. Documenter états, délais d'expiration et compensations ; ne pas les inventer sans règle métier.

## Anti-patterns
- Event « CRUD » (`CustomerModified`) sans intention métier.
- Integration Event = sérialisation de l'Entity.
- Messagerie pour un simple appel de méthode.
- Hypothèse d'exactly-once sans mécanisme.
