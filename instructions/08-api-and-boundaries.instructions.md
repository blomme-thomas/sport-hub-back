---
description: 'API et frontières : Transport DTOs, mapping, validation, erreurs, versionnement, systèmes externes.'
applyTo: 'src/modules/*/presentation/**,src/modules/*/infrastructure/adapters/**,src/core/http/**,src/core/filters/**,src/core/middlewares/**'
---
# API et frontières externes

> Définitions : `00-glossary-and-artifacts`. Conventions du dépôt : `11`.

## Séparation des modèles
- Le contrat de transport (Request/Response DTO, message) est **distinct** du Domain Model et des Application DTOs.
- Ne **jamais** exposer directement une Entity ou un Aggregate (fuite de structure interne, couplage, risque d'exposition de champs sensibles).
- Flux : `Transport DTO → Command/Query → Use Case → Application DTO → Transport DTO`. Le mapping est fait dans l'Adapter (le Domain ne connaît pas le transport).
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
- API REST NestJS ; controllers dans `presentation/http/controllers/*.controller.ts` (squelette `instructions/templates/controller.template.ts`), DTO dans `presentation/http/dtos/` (class-validator + class-transformer, `ValidationPipe({ transform: true })` global, squelette `instructions/templates/transport-dto.template.ts`).
- Authentification : **aucune** — usage strictement local, décision actée en `11`. Pas de guard global, pas d'utilisateur courant à extraire.
- Erreurs : Business Errors du Domain traduites par un filtre global dédié (`core/filters`) en réponse HTTP cohérente ; erreurs techniques (appel Garmin/Claude en échec) traduites en 5xx sans détail interne.
- Ne jamais renvoyer un modèle Prisma ni une Entity de domaine ; toujours un DTO de réponse.
- Systèmes externes propres à ce dépôt : Garmin Connect (sync, lecture seule côté domaine) et Claude/Anthropic (génération de séances) — encapsulés dans `infrastructure/adapters/`, en Anti-Corruption Layer pour Garmin (voir `11` §Spécificités du domaine) ; URL, clés API et secrets via la configuration typée (variables d'environnement déclarées et validées par zod dans `src/core/config`, voir `11` §Configuration), jamais dans le code.

## Anti-patterns
- Controller qui appelle un Repository ou applique des règles métier.
- Même classe pour Domain Model, Transport DTO et Persistence Model.
- Types ou codes d'erreur du fournisseur externe propagés jusqu'au Domain.
