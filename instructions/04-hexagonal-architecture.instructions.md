---
description: 'Architecture hexagonale (Ports & Adapters) : couches, Ports, Adapters, direction des dépendances.'
applyTo: '**'
---
# Architecture hexagonale

Définitions : `00-glossary-and-artifacts`. **Ne pas imposer** un découpage de dossiers ou une terminologie contraire aux conventions du dépôt (`11`) ; ces règles portent sur les responsabilités et les dépendances, pas sur les noms de répertoires.

## Responsabilités
| Couche | Rôle |
|---|---|
| Domain | Modèle et règles métier, sans technique |
| Application | Use Cases, orchestration, Ports |
| Infrastructure / Interfaces | Inbound et Outbound Adapters, Technical Configuration, détails techniques |

## Direction des dépendances (incontournable)
```
Adapters (inbound/outbound) ──▶ Application ──▶ Domain
```
- ✔ Le Domain ne dépend de rien d'externe à lui-même.
- ✔ L'Application dépend du Domain et de **ses propres Ports**.
- ✔ L'Infrastructure dépend de l'Application/Domain pour implémenter les Ports.
- ✘ Le Domain/l'Application n'importent jamais un framework, un client, un ORM ou une implémentation d'Adapter.
- ✘ Un Adapter n'en appelle pas directement un autre : il passe par l'Application.
- Inversion de dépendance : le contrat (Port) est défini **côté centre**, l'implémentation **côté bord**.

## Ports et Adapters
- **Inbound Port** : contrat d'un Use Case. Inbound Adapters : API HTTP, CLI, consommateur de messages, tâche planifiée, UI.
- **Outbound Port** : besoin du centre (persistance, notification, appel externe, horloge, génération d'identifiants). Outbound Adapters : base de données, client d'API, broker.
- Emplacement des contrats : dans le centre ; implémentations : dans l'Infrastructure.
- Câblage : uniquement dans la Technical Configuration (composition root).

## Cas courants
- **API / UI** : Inbound Adapter → mappe vers Command/Query → Use Case (`08`).
- **Tâche planifiée** : Inbound Adapter comme un autre ; ne contient pas de logique métier.
- **Base de données** : Outbound Adapter implémentant un Repository (`06`).
- **Système externe** : Outbound Adapter + traduction du modèle externe (`08`).

## Placement des composants
- Décider de la **responsabilité logique** avant l'emplacement physique ; ne jamais déduire la couche du seul nom d'un fichier ou d'un dossier.
- Utiliser la structure existante si elle correspond aux responsabilités ; sinon signaler l'écart logique/physique sans refondre.
- Ne jamais supposer un chemin universel. Sans structure identifiable, proposer une organisation comme **recommandation** et la faire confirmer pour les ajouts structurants.
- Langage, framework, nommage, câblage et commandes : les découvrir dans le dépôt (`11`) et les citer dans le résumé.

## Pragmatisme
- Un Port n'est justifié que s'il protège une frontière réelle (remplacement, test, isolation). Pas d'interface « miroir » par classe si le langage/dépôt ne le requiert pas.
- Une librairie purement utilitaire et stable (dates, collections) peut être utilisée dans le Domain ; pas de librairie liée à l'I/O ou à un framework.
- Contradiction avec le dépôt existant (ex. annotations ORM sur les Entities) : respecter l'existant, signaler l'écart, ne pas refondre sans demande.

## Dans ce dépôt
- Monolithe modulaire NestJS : un module = un Bounded Context (`src/modules/<module>`), structure `domain` / `application` / `infrastructure` / `presentation` (détail en `11`).
- Sens des dépendances : `presentation` → `application/use-cases` → `domain/ports/outbound` ← `infrastructure/adapters`. Un module n'importe pas le Domain d'un autre module sans passer par un contrat explicite ; les transverses sont dans `src/core` (technique partagé) et `src/shared` (classes de base du Domain, ex. `AggregateRoot`, `DomainError`).
- Le câblage Port → Adapter se fait dans `<module>.module.ts` (`provide: TOKEN, useClass`).
- Ces règles de dépendance sont contrôlées automatiquement par `npm run deps:check` (`.dependency-cruiser.cjs`, voir `11` §Garde-fou d'architecture).
- Exemples d'Outbound Adapters propres à ce dépôt : `infrastructure/adapters/garmin-connect.adapter.ts` (External Client + Anti-Corruption Layer vers Garmin Connect) et `infrastructure/adapters/claude-workout-generator.adapter.ts` (appel à Claude via Anthropic SDK pour générer une séance) — détaillés en `11` §Spécificités du domaine.

## Anti-patterns
- Use Case qui construit une requête SQL ou appelle HTTP directement.
- Controller contenant des règles métier.
- Port défini dans l'Infrastructure (dépendance inversée à l'envers).
- Couches « pass-through » sans valeur ajoutée.
