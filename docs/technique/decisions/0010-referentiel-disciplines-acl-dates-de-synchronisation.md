# ADR 0010 : référentiel des disciplines en contexte séparé, alimenté par ACL, dates de synchronisation

Statut : accepté (issue #45).

## Contexte
Les types d'activité Garmin (`typeKey`) sont des libellés techniques, sans liste fermée. L'utilisateur doit pouvoir les nommer en français, et ce nom doit survivre aux synchronisations. Le référentiel ne relève ni de `garmin-sync` (qui ne sait que copier des activités) ni de `training-stats` (qui calcule des volumes). Il doit donc vivre dans son propre Bounded Context, sans que `garmin-sync` dépende de sa forme interne.

## Décision
- **Contexte séparé** `src/modules/disciplines/`, avec sa table `disciplines`. Il ne lit ni n'écrit `activities`.
- **ACL depuis `garmin-sync`** : `garmin-sync` déclare le port `IDisciplineRegistry` ; `DisciplinesRegistryAdapter` l'implémente en appelant `RecordDisciplineAppearancesUseCase`. `disciplines` reçoit des `string[]` bruts et ignore Garmin. La dépendance va de `garmin-sync` vers `disciplines`, jamais l'inverse.
- **Dates = instant de synchronisation** : `firstSeenAt` et `lastSeenAt` sont l'instant de l'horloge injectée au moment de l'enregistrement, et non la date de début des activités. `lastSeenAt` ne recule jamais.
- **Libellé jamais écrasé** : la synchronisation n'écrit que la clé et `lastSeenAt` ; seul le renommage écrit `label`.
- **Backfill à l'instant de migration** : la migration `20261107235900_add_disciplines` crée une discipline par type déjà présent dans `activities`, avec `firstSeenAt = lastSeenAt = CURRENT_TIMESTAMP`. Arbitrage : la vraie première apparition de chaque type pourrait être reconstituée à partir de `activities.started_at` (minimum par type). Ce choix n'a pas été retenu : le backfill suit la même règle que les synchronisations (instant d'enregistrement), au prix d'une date de première apparition qui ne correspond pas à la première activité réelle pour les types déjà présents.

Détail : [Contexte disciplines](../contextes/disciplines.md), [Données](../donnees.md#modèle-discipline-table-disciplines).

## Conséquences
- Une synchronisation qui échoue sur le référentiel n'écrit aucune activité (l'enregistrement précède l'écriture) et renvoie 500 `INTERNAL_ERROR`. Le couplage est un point de défaillance supplémentaire, assumé.
- `lastSeenAt` signifie « dernière synchronisation qui a reçu ce type », y compris pour une activité déjà connue. Ce n'est pas une date d'activité ; toute lecture qui voudrait « la dernière activité de ce type » devra interroger `activities`.
- La date `firstSeenAt` des types backfillés n'est pas une date d'activité.
- Une clé de plus de 100 caractères présente au moment du backfill rend la liste illisible (voir les limites du contexte) ; corriger cela demanderait une nouvelle migration, la migration existante ne doit pas être éditée.

## Alternatives écartées
- **Colonne `label` dans `activities`** : rejetée, elle dupliquerait le libellé sur chaque activité et ne survivrait pas à une resynchronisation.
- **Référentiel dans `garmin-sync`** : rejeté, il mélangerait la copie des données Garmin et le nom donné par l'utilisateur ; `garmin-sync` ne devrait pas connaître le renommage.
- **Dates = `startedAt` de la première activité** : rejeté, le plan et l'issue demandent l'instant de synchronisation, et cela évite de relire `activities` à chaque enregistrement.
- **Backfill depuis `MIN(started_at)` par type** : écarté pour rester cohérent avec les synchronisations (voir Décision).
