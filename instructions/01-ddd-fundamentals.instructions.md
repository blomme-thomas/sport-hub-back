---
description: 'Fondamentaux DDD : Subdomains, Bounded Contexts, Ubiquitous Language, Context Map, quand utiliser DDD.'
applyTo: '**'
---
# Fondamentaux DDD

Termes d'artefacts : voir `00-glossary-and-artifacts`.

## Domain et Subdomains
- **Domain** : le champ d'activité métier que le logiciel adresse. **Subdomain** : partie cohérente de ce domaine.
- **Core Subdomain** : avantage concurrentiel, complexe, change souvent → investir en modélisation riche (DDD complet).
- **Supporting Subdomain** : nécessaire mais non différenciant → modèle simple, souvent suffisant.
- **Generic Subdomain** : problème résolu et standard (authentification, facturation générique) → préférer une solution existante.
- Adapter l'effort de modélisation au type de Subdomain ; ne pas sur-modéliser Supporting/Generic.

## Bounded Context et Ubiquitous Language
- Un **Bounded Context** est la frontière dans laquelle un modèle et son langage ont un sens unique. Un même mot peut signifier deux choses dans deux contextes (`Customer` en vente vs en facturation) : ne pas forcer un modèle unique partagé.
- L'**Ubiquitous Language** est partagé entre métier et code dans un contexte : utiliser les termes métier dans les noms de classes, méthodes, tests. Ne pas inventer de synonymes ; si un terme est incertain, demander.
- **Un Bounded Context n'est pas automatiquement un microservice** : c'est une frontière de modèle, qui peut vivre dans un monolithe modulaire. Ne pas proposer de découpage en services sans demande.

## Context Map
Relations entre contextes, à identifier avant de les faire communiquer :
- *Partnership*, *Shared Kernel* (noyau partagé minimal, à éviter si possible),
- *Customer/Supplier*, *Conformist* (on adopte le modèle amont),
- *Anti-Corruption Layer* (traduction du modèle externe : voir `08`),
- *Open Host Service / Published Language* (contrat publié et stable).
Ne pas importer directement le Domain Model d'un autre contexte : passer par un contrat publié ou une Anti-Corruption Layer.

## Quand DDD est pertinent
- Règles métier riches, évolutives, nombreuses exceptions ;
- vocabulaire métier complexe et experts disponibles ;
- invariants forts à protéger ; coût d'erreur élevé.

## Quand préférer une solution simple (CRUD)
- Peu ou pas de règles ; simple saisie/consultation de données ;
- Generic ou Supporting Subdomain stable ;
- prototype ou outil interne éphémère.
Dans ce cas : éviter Aggregates, Events et couches supplémentaires ; respecter malgré tout la direction des dépendances si le dépôt est hexagonal.

## Anti-patterns
- DDD « cosmétique » (noms techniques : `Manager`, `Helper`) sans vrai modèle.
- Un modèle unique partagé par tous les contextes.
- Confondre Bounded Context et microservice, ou découper trop finement sans raison métier.
