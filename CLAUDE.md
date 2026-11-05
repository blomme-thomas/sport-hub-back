# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

sport-hub-back est une API NestJS (architecture hexagonale / DDD) qui synchronise les données Garmin Connect de l'utilisateur, calcule ses statistiques d'entraînement et génère des séances par IA (Claude). Usage strictement local, un seul utilisateur.

## État actuel

**Squelette initialisé, aucun module métier.** Le dépôt contient le socle technique : NestJS 12 (ES modules), configuration validée par zod (`src/core/config/`), Prisma 7 avec un schéma vide, route `GET /api/health`, Swagger (`/swagger`), tests Vitest, CI GitHub Actions et garde-fou d'architecture (`npm run deps:check`). `src/modules/` est vide : l'arborescence par module décrite dans `instructions/` est une **convention cible** à appliquer dès le premier module ; le reste (stack, commandes, configuration, tests) décrit l'existant.

## Règles d'architecture : `instructions/`

L'architecture DDD/hexagonale de ce dépôt est documentée **une notion par fichier** dans `instructions/*.instructions.md` (frontmatter `applyTo` indiquant les chemins concernés — à la manière des custom instructions GitHub Copilot). **Claude Code ne charge automatiquement que ce fichier (`CLAUDE.md`)** : il ne filtre pas lui-même par glob. Avant de créer ou modifier un fichier qui correspond à un des `applyTo` ci-dessous, **ouvrir et suivre le fichier d'instructions associé**.

| # | Fichier | Notion | Consulter avant de toucher à... |
|---|---|---|---|
| 00 | `00-glossary-and-artifacts.instructions.md` | Glossaire DDD/hexagonal (source de vérité des termes) | Toujours, en cas de doute sur un terme |
| 01 | `01-ddd-fundamentals.instructions.md` | Subdomains, Bounded Contexts, Ubiquitous Language, Context Map | Création d'un nouveau module/Bounded Context |
| 02 | `02-domain-model.instructions.md` | Domain Model, invariants, Business Errors | `domain/entities/**`, `domain/value-objects/**`, `domain/ports/**` |
| 03 | `03-aggregates-and-consistency.instructions.md` | Aggregates, Aggregate Root, cohérence | `domain/entities/**`, `domain/ports/**` |
| 04 | `04-hexagonal-architecture.instructions.md` | Couches, Ports & Adapters, sens des dépendances | Partout (`**`) — structure générale d'un module |
| 05 | `05-application-layer.instructions.md` | Use Cases, orchestration, CQRS pragmatique | `application/use-cases/**`, `application/dtos/**` |
| 06 | `06-persistence-and-repositories.instructions.md` | Repositories, Prisma, mapping, Read Models | `infrastructure/persistence/**`, `domain/ports/outbound/**` |
| 07 | `07-events-and-messaging.instructions.md` | Domain/Integration Events, messaging (non utilisé à ce jour) | `**/events/**`, `**/messaging/**`, `**/listeners/**` |
| 08 | `08-api-and-boundaries.instructions.md` | Transport DTOs, validation, erreurs, systèmes externes | `presentation/**`, `infrastructure/adapters/**`, `core/filters/**` |
| 09 | `09-testing.instructions.md` | Stratégie de test (Domain, Use Cases, intégration) | `test/**`, `src/**/*.spec.ts` |
| 10 | `10-code-changes-and-review.instructions.md` | Méthode de travail et checklist de revue | Toujours, avant/après tout changement |
| 11 | `11-repository-conventions.instructions.md` | **Conventions concrètes de ce dépôt** (stack, arborescence, nommage, templates, Garmin/IA) | Toujours — c'est le fichier que tous les autres citent comme « `11` » |

Squelettes de code prêts à copier (un par artefact) : `instructions/templates/*.template.ts` — table complète Artefact → Template dans `11`.

## Repères rapides (détail dans `11`)

- Stack : NestJS + TypeScript, Prisma + PostgreSQL, Redis en cache optionnel, Claude (Anthropic SDK) pour la génération de séances, Garmin Connect comme source externe.
- Sens des dépendances : `presentation` → `application` → `domain` ← `infrastructure` (les couches externes dépendent des internes, jamais l'inverse).
- Un module = un Bounded Context : `src/modules/<module>/{domain,application,infrastructure,presentation}`.
- Pas d'authentification (usage local).
- Avant tout changement : suivre la démarche de `10` (lire les instructions applicables → identifier le Use Case/la frontière → repérer les invariants existants → clarifier si règle manquante → changer → tester → contrôler → résumer).
