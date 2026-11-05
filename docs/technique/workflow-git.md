# Workflow Git

Version autonome du workflow Git appliqué à ce dépôt (le dépôt n'a pas de fichier de workflow propre dans `instructions/`, le workflow global s'applique).

## Branches

- `main` : production. Reste la branche par défaut du repo GitHub (nécessaire pour `Closes #n`, voir plus bas).
- `develop` : intégration. Créée une fois depuis `main`.
- `feature/<n°-issue>-<slug>` : depuis `develop`, pour une fonctionnalité.
- `fix/<n°-issue>-<slug>` : depuis `develop`, pour un correctif.
- `release/x.y.z` : depuis `main`.
- `hotfix/*` : hors v1, non géré.

## Feature / fix

- La PR cible toujours `develop`, jamais `main`.
- Deux commits sur la branche : code + tests (`feat(...)` ou `fix(...)`), puis doc (`docs(...)`).
- Fusion de la PR en **squash**, message court en Conventional Commits avec le numéro d'issue/PR.
  Exemple : `feat(garmin-sync): synchronise les activités (#12)`.

## Release

1. `release/x.y.z` est créée depuis `main`.
2. `develop` y est fusionnée (merge commit, `--no-ff`).
3. Sur cette branche, uniquement : numéro de version, CHANGELOG, statuts de la doc fonctionnelle. Vérifications et recette locale.
4. Défaut trouvé en recette : correctif sur `fix/...` depuis `develop` (PR squashée vers `develop`), puis `develop` est re-fusionnée dans la release (merge commit). Jamais de correctif de code directement sur la release.
5. PR `release/x.y.z` vers `main`.
6. Mise en production : merge de la release dans `main` (merge commit, jamais `develop` directement). Le tag `vx.y.z` et la release GitHub sont créés automatiquement par `.github/workflows/ci-main.yml` après ce merge (version lue dans `package.json`, notes tirées de la section du `CHANGELOG.md`, à défaut notes générées par GitHub ; sans effet si le tag existe déjà). Ne pas les créer à la main.
7. Garde-fou : `.github/workflows/ci-release.yml` (sur les branches `release/**` et les PR vers `main` issues d'une release) vérifie que la branche respecte `release/x.y.z`, que la version de `package.json` vaut `x.y.z`, que le tag `vx.y.z` n'existe pas et que la version est supérieure au dernier tag, et que `CHANGELOG.md` a une section pour cette version.

Pas de merge-back : `main` n'est jamais refusionnée dans `develop`.

## Types de merge

| PR | Type de merge |
|---|---|
| `feature/*` / `fix/*` vers `develop` | Squash |
| `develop` vers `release/x.y.z` | Merge commit (`--no-ff`) |
| `release/x.y.z` vers `main` | Merge commit (`--no-ff`) |

## Confirmations obligatoires

Confirmation explicite de l'utilisateur avant : tout `push`, toute création de PR, tout merge sur `main` (c'est lui qui déclenche la création automatique du tag et de la release GitHub : sa confirmation les couvre). Un tag ou une release créé à la main (dépôt sans `ci-main.yml`) demande aussi confirmation.

## Interdits

- Commit direct sur `main`, `develop` ou `release/*` hors des étapes ci-dessus.
- Force-push, sur n'importe quelle branche.
- PR de `feature/*` directement vers `main`.
- Correctif de code sur une branche de release.

## Schéma

```
main        ●──────────────────────────────●──────────────
                                          ↗ (3) PR + merge (MEP), tag auto
                        release/x.y.z ●──┘
                        (1) créée depuis main, develop y est fusionnée
                        (2) version + CHANGELOG seulement
                             ↑
develop     ●────●────●─────┴──●───────────────────────────
             \  ↗      \  ↗
feature/*     ●●        ●●        (PR squashée vers develop)
fix/*         (stabilisation : depuis develop, puis re-fusion dans la release)
```

## Piège GitHub : `Closes #n`

`Closes #n` / `Fixes #n` ne ferment une issue que lorsque la PR est fusionnée dans la branche par défaut du repo. Tant que `main` est la branche par défaut, une PR squashée dans `develop` ne ferme pas l'issue, même si le message le mentionne.

Conséquence : le cycle de vie des issues et items de Project est géré explicitement (agent `project-manager`) :
- statut intermédiaire après fusion dans `develop` (intégré, pas encore en production) ;
- statut final et fermeture de l'issue seulement à la mise en production (merge de la release dans `main`).

Noms exacts des statuts : à compléter.
