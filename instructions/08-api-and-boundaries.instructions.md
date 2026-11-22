---
description: 'API et frontières : Transport DTOs, mapping, validation, erreurs, versionnement, systèmes externes.'
applyTo: 'src/modules/*/presentation/**,src/modules/*/infrastructure/adapters/**,src/core/http/**,src/core/filters/**,src/core/middlewares/**'
---
# API et frontières externes

> Définitions : `00-glossary-and-artifacts`. Conventions du dépôt : `11`.

## Séparation des modèles
- Le contrat de transport (Request/Response DTO, message) est **distinct** du Domain Model et des Application DTOs.
- Ne **jamais** exposer directement une Entity ou un Aggregate (fuite de structure interne, couplage, risque d'exposition de champs sensibles).
- Flux : `Transport DTO → Command/Query → Use Case → Application DTO → Transport DTO`. Le mapping est fait dans l'Adapter (le Domain ne connaît pas le transport). Côté HTTP, il est porté par un **mapper de présentation** (`presentation/http/mappers/<name>.http-mapper.ts`), toujours présent, même pour un endpoint simple : le contrôleur l'appelle, il ne convertit pas lui-même.
- Si le dépôt est simple (CRUD), un DTO unique peut servir de Transport DTO et d'Application DTO : le signaler, ne pas ajouter de couche sans valeur.

## Validation aux frontières
- Valider la **forme** (obligatoire, type, format, taille) à l'entrée, avant l'appel du Use Case.
- Les règles métier restent dans le Domain ; ne pas dupliquer pour « aller plus vite », sauf validation de confort côté frontière non contradictoire.
- Ne jamais faire confiance aux données externes (y compris entre services internes).

## Erreurs
- Table de traduction cohérente et centralisée : erreur de validation → 4xx de forme ; Business Error → code défini par le contrat (ex. 409/422) ; ressource absente → 404 ; Technical Error → 5xx sans détails internes.
- Format d'erreur uniforme dans toute l'API (suivre l'existant) ; messages sans fuite d'information sensible.

## Compatibilité et versionnement
- Changement **compatible** : ajout de champ optionnel, nouvel endpoint. **Breaking change** : suppression/renommage, changement de type ou de sémantique, champ devenu obligatoire.
- Un breaking change demande une nouvelle version ou une période de transition, et l'accord explicite de l'utilisateur.
- Mettre à jour le contrat documenté (OpenAPI, schéma de messages) et les contract tests.

## Systèmes externes
- Encapsuler derrière un Outbound Adapter ; ne pas laisser le modèle externe pénétrer le Domain.
- **Anti-Corruption Layer** quand le modèle externe diverge : traduire vers le langage du contexte.
- Gérer timeouts, retries, idempotence, échecs partiels ; traduire les erreurs externes en erreurs applicatives/techniques propres.
- Secrets et URL par configuration, jamais dans le code.

## Dans ce dépôt
- API REST NestJS ; controllers dans `presentation/http/controllers/*.controller.ts` (squelette `instructions/templates/controller.template.ts`), DTO dans `presentation/http/dtos/` (class-validator + class-transformer, `ValidationPipe` global (`transform`, `whitelist`, `forbidNonWhitelisted` et `exceptionFactory` qui renvoie toutes les erreurs par champ, voir `11` §Erreurs HTTP), squelette `instructions/templates/transport-dto.template.ts`).
- Authentification : **aucune** — usage strictement local, décision actée en `11`. Pas de guard global, pas d'utilisateur courant à extraire.
- Erreurs : Business Errors du Domain traduites par un filtre global dédié (`core/filters`) en réponse RFC 9457 Problem Details (`code` stable, `errors[]`, `correlationId`) ; le statut HTTP vient de la table centralisée (voir `11` §Erreurs HTTP) ; erreurs techniques (appel Garmin/Claude en échec) traduites en 5xx sans détail interne.
- Ne jamais renvoyer un modèle Prisma ni une Entity de domaine ; toujours un DTO de réponse.
- Adapter externe : la traduction du modèle externe vers le domaine est portée par un mapper dédié, `infrastructure/mappers/<name>.external-mapper.ts` (toujours présent, jamais dans le dossier `adapters/` ni inline dans l'Adapter).
- Le contrôleur ne contient aucune méthode de conversion (ni `private static toResponse`, ni fonction de formatage) : tout passe par le mapper de présentation du module (`<Name>HttpMapper`, voir `11` §Conventions de nommage).
- Systèmes externes propres à ce dépôt : Garmin Connect (sync, lecture seule côté domaine) et Claude/Anthropic (génération de séances) — encapsulés dans `infrastructure/adapters/`, en Anti-Corruption Layer pour Garmin (voir `11` §Spécificités du domaine) ; URL, clés API et secrets via la configuration typée (variables d'environnement déclarées et validées par zod dans `src/core/config`, voir `11` §Configuration), jamais dans le code.

## Anti-patterns
- Controller qui appelle un Repository ou applique des règles métier.
- Conversions (DTO applicatif → réponse, formatage de dates, valeurs par défaut) écrites directement dans le contrôleur au lieu d'un mapper de présentation.
- Traduction d'un modèle externe (payload Garmin, réponse Claude) écrite inline dans l'Adapter au lieu d'un mapper dans `infrastructure/mappers/`.
- Même classe pour Domain Model, Transport DTO et Persistence Model.
- Types ou codes d'erreur du fournisseur externe propagés jusqu'au Domain.
