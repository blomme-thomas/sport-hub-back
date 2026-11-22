---
description: 'Stratégie de test : Domain, Use Cases, intégration, contrat, mocks, nommage.'
applyTo: 'test/**,src/**/*.spec.ts'
---
# Stratégie de test

> Conventions du dépôt : `11`.

## Règles incontournables
- Les tests décrivent le **comportement métier** et incluent les cas limites importants (bornes, états interdits, valeurs vides, doublons).
- **Ne jamais affaiblir, supprimer ou adapter un test** pour faire passer une implémentation incorrecte : si le test semble faux, le signaler et demander.
- Tout nouveau comportement ou correctif a un test ; un bug corrigé a un test de non-régression.
- Suivre le framework et les conventions de test du dépôt.

## Niveaux
| Niveau | Cible | Technique |
|---|---|---|
| Domain unit tests | Invariants, comportements d'Entities/Value Objects/Domain Services | Pur, sans mock, sans I/O, très rapide |
| Use Case tests | Orchestration, appels de Ports, events, erreurs | Domain réel + **fakes/in-memory** des Outbound Ports |
| Integration tests | Outbound Adapters (Repository réel, mapping, requêtes), External Clients, configuration | Vraie technologie (base de test, conteneur, serveur simulé) |
| Inbound Adapter tests | Validation de forme, mapping, traduction d'erreurs | Test de l'Adapter avec Use Case substitué |
| Contract tests | Compatibilité entre contextes/services (API, messages) | Côté producteur et consommateur |
| End-to-end tests | Parcours critiques seulement | Peu nombreux |

Choisir le **niveau le plus bas** qui prouve le comportement. Les règles métier se testent au niveau Domain, pas via l'API.

## Mocks et test doubles
- Préférer des **fakes** (implémentations en mémoire) pour les Ports ; mocker uniquement les frontières (réseau, horloge, aléatoire).
- Ne pas mocker le Domain ni les Value Objects ; ne pas vérifier des détails d'implémentation (ordre d'appels internes).
- Un mock de Repository qui renvoie ce que le test attend ne prouve rien sur la persistance : couvrir en integration test.

## Nommage et lisibilité
- Nommer par comportement métier : `shipped_order_cannot_be_cancelled` / `shippedOrderCannotBeCancelled` (selon la convention du langage), pas `test_cancel_1`.
- Structure Given/When/Then (ou Arrange/Act/Assert) ; une intention par test ; données de test explicites via builders/fixtures lisibles.
- Utiliser l'Ubiquitous Language dans les noms et les valeurs.

## Dans ce dépôt
- Vitest : fichiers `*.spec.ts` **colocalisés** à côté du fichier source (pas d'arborescence miroir séparée) ; e2e dans `test/` (fichiers `*.e2e-spec.ts`, config `vitest.config.e2e.ts`, supertest). Les globals (`describe`, `it`, `expect`) sont activés ; imports relatifs avec l'extension `.js` (voir `11`).
- Use Cases : tester avec `Test.createTestingModule` en fournissant un fake/mock du port via `{ provide: <NAME>_REPOSITORY, useValue }` ; controllers : Use Case substitué.
- Commandes cibles : `npm run test -- <pattern>` en itération ; `npm run test`, `npm run test:cov`, `npm run test:e2e` en validation finale (voir `11`).

## Anti-patterns
- Tests couplés à la structure interne (fragiles au refactoring).
- Tests de getters/setters sans comportement.
- Dépendance entre tests, état partagé, horloge ou aléa non maîtrisés.
- Suite 100 % mocks avec aucun integration test.
