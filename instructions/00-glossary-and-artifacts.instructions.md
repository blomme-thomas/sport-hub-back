---
description: 'Glossaire DDD / hexagonal : définition, emplacement et dépendances de chaque artefact. Source de vérité des termes.'
applyTo: '**'
---
# Glossaire et artefacts (source de vérité)

Ce fichier décrit des **concepts**. Selon le langage, un concept peut être une classe, une interface, un module, une fonction ou plusieurs fichiers : ne pas créer un fichier par concept par réflexe. Les autres fichiers renvoient ici ; ne pas redéfinir ces termes autrement. Les termes anglais sont les termes de référence (ceux du code) ; l'équivalent français est donné à titre d'aide.

Notation des dépendances : « ✔ » autorisée, « ✘ » interdite. Les couches : les couches externes dépendent des internes (Infrastructure/Interfaces → Application → Domain), jamais l'inverse.

---
## 1. Domain

### Entity (entité)
- **Définition** : objet défini par une identité stable et un cycle de vie, dont l'état évolue.
- **Responsabilité** : porter l'état et les comportements métier qui le concernent ; protéger ses invariants.
- **Emplacement** : Domain (à l'intérieur d'un Aggregate).
- **Utiliser** : l'identité compte (deux objets aux mêmes attributs restent distincts).
- **Ne pas utiliser** : simple valeur sans identité → Value Object.
- **Dépendances** : ✔ autres concepts du Domain ; ✘ framework, ORM, I/O, DTO.
- **Relations** : membre d'un Aggregate ; identifiée par un Entity Id.
- **Nommage** : nom métier (`Order`, `Contract`), pas `OrderEntity` / `OrderData`.

### Value Object (objet-valeur)
- **Définition** : objet défini par ses attributs, sans identité, généralement immuable et comparé par valeur.
- **Responsabilité** : encapsuler une notion métier (montant, période, e-mail) et sa validité.
- **Emplacement** : Domain.
- **Utiliser** : concept métier avec règles de validité ou comportement ; remplace un primitif ambigu.
- **Ne pas utiliser** : simple enrobage sans règle ni sens métier (surabstraction).
- **Dépendances** : ✔ autres Value Objects ; ✘ technique.
- **Relations** : attribut d'Entity/Aggregate ; peut servir d'Entity Id.
- **Nommage** : notion métier (`Money`, `ValidityPeriod`).

### Aggregate et Aggregate Root (agrégat et racine d'agrégat)
- **Définition** : *Aggregate* = grappe d'Entities et de Value Objects formant une **frontière de cohérence** transactionnelle ; *Aggregate Root* = unique Entity d'entrée par laquelle on le modifie et le référence de l'extérieur. Une Entity seule peut être un Aggregate à un élément ; toutes les Entities ne sont pas des racines.
- **Responsabilité** : garantir les invariants à chaque modification.
- **Emplacement** : Domain.
- **Utiliser** : des invariants doivent être vrais ensemble de façon immédiate.
- **Ne pas utiliser** : regrouper par commodité de navigation ou par relation de base de données.
- **Dépendances** : ✔ Domain uniquement ; référence les autres Aggregates par identifiant.
- **Relations** : chargé/sauvegardé via un Repository ; émet des Domain Events. Détails : `03`.

### Domain Service (service de domaine)
- **Définition** : opération métier sans état qui n'appartient naturellement à aucune Entity/Value Object (calcul, règle impliquant plusieurs Aggregates en lecture).
- **Responsabilité** : exprimer une règle métier transverse.
- **Emplacement** : Domain.
- **Utiliser** : la règle ne trouve pas de maître naturel.
- **Ne pas utiliser** : par défaut (risque de modèle anémique) ; ne pas confondre avec Application Service.
- **Dépendances** : ✔ Domain, Outbound Ports de domaine si indispensables ; ✘ infrastructure.
- **Nommage** : nom/verbe métier (`PremiumCalculator`).

### Domain Event (événement de domaine)
- **Définition** : fait métier passé, significatif, survenu dans un contexte (`OrderValidated`).
- **Responsabilité** : exprimer ce qui s'est passé pour que d'autres parties réagissent.
- **Emplacement** : Domain (enregistré par l'Aggregate).
- **Utiliser** : un autre comportement doit réagir à un fait métier.
- **Ne pas utiliser** : notification technique, simple log, ou contrat inter-contextes (→ Integration Event).
- **Dépendances** : ✔ Value Objects, identifiants ; ✘ technique.
- **Nommage** : participe passé, langage métier.

### Factory
- **Définition** : mécanisme de création d'un objet/Aggregate dont la construction est complexe ou doit garantir des invariants.
- **Emplacement** : Domain (méthode statique, constructeur nommé ou classe dédiée).
- **Utiliser** : création avec règles, plusieurs variantes, reconstitution depuis le stockage.
- **Ne pas utiliser** : constructeur simple suffisant.

### Business Rule, Policy, Specification (règle métier, politique, spécification)
- **Définition** : *Business Rule* = contrainte/calcul du domaine ; *Policy* = règle interchangeable selon le contexte ; *Specification* = prédicat métier nommé et composable.
- **Utiliser** : règle réutilisée, variable ou à nommer pour la lisibilité.
- **Ne pas utiliser** : structure systématique pour chaque `if`.

### Entity Id / Aggregate Id (identifiant métier)
- **Définition** : valeur identifiant de manière unique une Entity (type dédié, Value Object).
- **Utiliser** : typer les identifiants (`OrderId`) pour éviter les confusions ; référencer d'autres Aggregates.
- **Ne pas utiliser** : exposer un identifiant technique de base comme identité métier sans décision explicite.

---
## 2. Application

### Use Case (cas d'usage)
- **Définition** : scénario métier d'un acteur, exécuté de bout en bout.
- **Responsabilité** : orchestrer (charger, appeler le Domain, persister, publier) sans porter de règle métier.
- **Emplacement** : Application.
- **Dépendances** : ✔ Domain, Ports ; ✘ framework de transport, implémentations d'infrastructure.
- **Relations** : exposé par un Inbound Port ; réalisé par un Application Service/Handler. Détails : `05`.

### Application Service / Handler (service applicatif)
- **Définition** : implémentation d'un Use Case (un Handler par Command/Query, ou un Application Service regroupant des Use Cases cohérents).
- **Ne pas utiliser** : service « fourre-tout » ; ne pas confondre avec Domain Service (qui porte une règle métier, sans orchestration technique ni transaction).

### Command et Query (commande et requête)
- **Command** : intention de **modifier** l'état (`ValidateOrder`), verbe à l'impératif ; peut échouer, ne renvoie en général que peu d'information (identifiant, résultat).
- **Query** : demande de **lecture** sans effet de bord (`GetOrder`), renvoie des données.
- **Ne pas confondre** avec un Transport DTO : Command/Query sont des objets applicatifs, indépendants du protocole.

### Inbound Port et Outbound Port (port entrant et sortant)
- **Port** : contrat exprimé par le centre (Domain/Application) décrivant une interaction.
- **Inbound Port** : ce que l'application offre (interface de Use Case). **Outbound Port** : ce dont elle a besoin (Repository, passerelle, publication d'événements, horloge).
- **Emplacement** : dans Application (ou Domain pour un Port de domaine) ; **jamais** dans l'infrastructure.
- **Ne pas utiliser** : une interface par classe sans besoin d'inversion ni de remplacement (suivre les conventions du langage).

### Application DTO
- **Définition** : structure de données retournée/reçue par un Use Case, indépendante du transport et du Domain.
- **Utiliser** : ne pas exposer Aggregates/Entities hors de l'Application.
- **Distinction** : le **Transport DTO** (JSON, protobuf, formulaire) vit à la frontière ; l'Application DTO vit dans la couche Application.

---
## 3. Infrastructure et Adapters

### Inbound Adapter (adaptateur entrant / driving adapter)
- Traduit une sollicitation externe (HTTP, CLI, message, tâche planifiée) en appel d'un Inbound Port. ✔ Application ; ✘ appel direct des Entities pour contourner un Use Case.

### Outbound Adapter (adaptateur sortant / driven adapter)
- Implémente un Outbound Port avec une technologie (base de données, API tierce, file de messages, système de fichiers). ✔ Domain/Application (pour implémenter les Ports) ; ✘ référencé par le Domain.

### Repository et implémentation concrète
- **Repository** : abstraction de collection d'**Aggregates** exprimée en langage métier (Outbound Port). **Implémentation** : Outbound Adapter de persistance.
- **Ne pas confondre avec un DAO** (voir §5 et §6).

### External Client (client externe)
- Accès technique à un système tiers (SDK, client HTTP). Encapsulé derrière un Outbound Adapter qui traduit le modèle externe vers le modèle interne (Anti-Corruption Layer si les modèles divergent).

### Mapper
- Convertit entre deux modèles (Transport DTO ↔ Command/Query/Application DTO, Domain Model ↔ Persistence Model). Placé du côté de l'Adapter/frontière qui connaît le modèle technique. Ne contient aucune règle métier.

### Technical Configuration (configuration technique / composition root)
- Assemblage (injection de dépendances, câblage des Adapters aux Ports, paramètres). Seul endroit qui connaît à la fois Ports et implémentations.

---
## 4. Interfaces et échanges

- **Controller / endpoint / Inbound Adapter d'interface** : expose un protocole. Valide la forme, mappe, appelle un Use Case, traduit le résultat et les erreurs.
- **Transport DTO (Request/Response DTO)** : contrat d'échange externe, versionné ; distinct des Application DTOs et du Domain Model.
- **Integration Event (événement d'intégration)** : message publié pour d'autres contextes/systèmes ; contrat stable et versionné ; distinct du Domain Event (interne au contexte). Un Domain Event peut être traduit en Integration Event, sans y être identique.
- **Projection / Read Model (modèle de lecture)** : représentation optimisée pour la consultation, dérivée des données du domaine ; sans règle métier ; peut être éventuellement cohérente.

---
## 5. Transversal
- **Business Error (erreur métier)** : violation d'une règle du Domain, exprimée en langage métier, levée par le Domain, traduite aux frontières. **Technical Error (erreur technique)** : défaillance d'infrastructure (réseau, base) ; ne traverse pas le Domain sous forme brute.
- **DAO (Data Access Object)** : accès aux données d'une table/source (CRUD technique), sans notion d'Aggregate ni de langage métier. Utile en interne d'une implémentation de Repository ; ne remplace pas le Repository.
- **Unit of Work / Transaction** : gestion de l'atomicité d'un Use Case. À utiliser seulement si le projet/le framework en a besoin ; la frontière transactionnelle est le Use Case (un Aggregate modifié par transaction en règle générale).

## 6. Distinctions fréquemment confondues
| Notions | Différence |
|---|---|
| Entity / Aggregate / Aggregate Root | Entity = identité ; Aggregate = frontière de cohérence ; Root = point d'entrée unique de l'Aggregate |
| Value Object / Entity | sans identité, comparé par valeur, immuable / avec identité et cycle de vie |
| Domain Service / Application Service | règle métier sans état / orchestration (transaction, Ports, appels externes) |
| Command / Query | modifie l'état / lit sans effet de bord |
| Application DTO / Transport DTO | contrat interne de la couche Application / contrat externe versionné à la frontière |
| Domain Event / Integration Event | fait interne au contexte / contrat publié entre contextes |
| Port / Adapter | contrat exprimé par le centre / implémentation technique du contrat |
| Repository / DAO | collection d'Aggregates en langage métier / accès technique à une table ou source, sans notion d'Aggregate |
| Domain Model / Persistence Model / Read Model | comportement et invariants / forme de stockage / forme de consultation |
