# Contexte conseils

Bounded Context des conseils : un commentaire par activité réalisée, qui compare l'activité à la séance rapprochée (issue #41), et un bilan par semaine ISO (issue #42). Code : `src/modules/conseils/`. Usage mono-utilisateur.

Périmètre livré : génération et stockage du commentaire d'activité, du bilan hebdomadaire et du conseil du tableau de bord (issue #54), lecture, régénération à la demande. Hors périmètre : affichage (dépôt front), bilan mensuel.

## Conseil du tableau de bord

| Méthode | Chemin | Effet | Erreurs |
|---|---|---|---|
| `GET` | `/api/advice/dashboard` | Renvoie le conseil stocké de la semaine ISO courante, sans appel au modèle | 404 |
| `POST` | `/api/advice/dashboard/regenerate` | Génère le conseil de la semaine courante, ou le remplace (201) | 502, 503 |

- **Semaine** : ISO courante, calculée à partir de l'horloge du module (`IsoWeek.containing`). Une ligne par semaine, dans la table `dashboard_advices`.
- **Données** : volumes de la semaine et de la précédente (`GetDashboardStatsUseCase.executeForWindow`, `training-stats`), récupération de la semaine (`GetRecoveryUseCase`) et zones cardiaques (`GetHeartRateZonesUseCase`), via l'ACL `DashboardAdviceDataReaderAdapter`. Seuls des indicateurs chiffrés sont transmis : ni `displayName`, ni clé, ni token.
- **Données insuffisantes** : aucune activité dans la semaine → conseil `source: insuffisant`, `model: null`, sans appel au modèle.
- **Au moins une activité** : un seul appel au modèle, texte libre d'une à 1000 caractères. Réponse tronquée, vide ou non textuelle → 502 `DASHBOARD_ADVICE_INVALID_OUTPUT`, rien n'est remplacé. Pas de clé configurée → 503 `DASHBOARD_ADVICE_UNAVAILABLE`.
- **Stockage** : texte, source, modèle, date de génération et résumé envoyé au modèle (`source_summary`, JSONB).
- **Hypothèse** : l'unité des zones cardiaques est supposée en secondes, non confirmée par la spec Garmin.
- **Tests** : unitaires (use cases, value object, adapter Claude avec client factice) et `test/dashboard-advice.e2e-spec.ts`, qui remplace l'ACL de lecture et le générateur (pas de Garmin ni de modèle réels).

## Routes

| Méthode | Chemin | Effet | Erreurs |
|---|---|---|---|
| `POST` | `/api/activities/:id/comment` | Génère le commentaire, ou le remplace s'il existe (201) | 400, 404, 502, 503 |
| `GET` | `/api/activities/:id/comment` | Renvoie le commentaire stocké, sans appel au modèle | 400, 404 |
| `POST` | `/api/weekly-reviews/:week` | Génère le bilan de la semaine ISO `AAAA-Www`, ou le remplace s'il existe (201) | 400, 502, 503 |
| `GET` | `/api/weekly-reviews/:week` | Renvoie le bilan stocké de la semaine, sans appel au modèle | 400, 404 |

## Bilan hebdomadaire

- **Contenu** : trois parties en français, `suivi` (séances prévues contre réalisées, volume par rapport à la semaine précédente), `pointAttention` et `conseil` (pour la semaine suivante).
- **Semaine** : ISO, du lundi au dimanche. Format `AAAA-Www` ; une semaine inexistante dans son année (ex. `2025-W53`) donne 400 `WEEKLY_REVIEW_INVALID_WEEK`.
- **Source des données** : séances de la semaine (`ListSessionsUseCase`, `seances`) et volumes de la semaine et de la précédente (`GetTrainingStatsUseCase`, `training-stats`), via leurs façades.
- **Semaine sans séance prévue** : bilan générique stocké (source `generique`, modèle `null`), sans appel au modèle.
- **Au moins une séance prévue** : un seul appel au modèle, réponse attendue en JSON à trois clés chaînes. Une réponse tronquée, non JSON ou sans les trois clés donne 502 `WEEKLY_REVIEW_INVALID_OUTPUT` et ne remplace rien.
- **Régénération** : `POST` remplace le bilan existant et enregistre la nouvelle date. `GET` ne fait jamais d'appel au modèle.
- **Longueur** : chaque partie fait de 1 à 1000 caractères.

Structure : `domain/value-objects/iso-week.vo.ts` (`IsoWeek`), `domain/value-objects/weekly-review.vo.ts` (`WeeklyReview`), `domain/ports/outbound/weekly-review.ports.ts`, `application/use-cases/generate-weekly-review.use-case.ts` et `get-weekly-review.use-case.ts`, `infrastructure/adapters/weekly-data.reader.adapter.ts` (ACL vers `seances` et `training-stats`), `infrastructure/adapters/claude-weekly-review.generator.adapter.ts` avec `infrastructure/mappers/weekly-review.external-mapper.ts` (sortie JSON), `infrastructure/persistence/prisma/weekly-review.repository.adapter.ts` (table `weekly_reviews`), `presentation/http/controllers/weekly-reviews.controller.ts`. Tests : `application/use-cases/*weekly-review*.spec.ts`, `domain/value-objects/iso-week.vo.spec.ts`, `infrastructure/adapters/claude-weekly-review.generator.adapter.spec.ts`, `infrastructure/mappers/weekly-review.external-mapper.spec.ts`, `test/weekly-reviews.e2e-spec.ts`.

## Commentaire d'activité

| Méthode | Chemin | Effet | Erreurs |
|---|---|---|---|
| `POST` | `/api/activities/:id/comment` | Génère le commentaire, ou le remplace s'il existe (201) | 400, 404, 502, 503 |
| `GET` | `/api/activities/:id/comment` | Renvoie le commentaire stocké, sans appel au modèle | 400, 404 |

## Règles

- **Activité rapprochée** (une séance y est liée, voir [seances](seances.md#rapprochement-avec-les-activités)) : un seul appel au modèle. Source `ia`, modèle et date de génération stockés.
- **Activité sans séance rapprochée** : commentaire générique stocké, sans appel au modèle. Source `generique`, modèle `null`.
- **Régénération** : `POST` remplace le commentaire existant et enregistre la nouvelle date.
- **Lecture** : `GET` ne fait jamais d'appel au modèle.
- **Contenu envoyé au modèle** : type, date, durée et distance de l'activité, et discipline, date, durée et statut de la séance prévue. Aucun identifiant Garmin ni `rawPayload`.
- **Longueur** : le texte fait de 1 à 1000 caractères. Une réponse vide, tronquée (`stop_reason` différent de `end_turn`) ou non textuelle donne 502 `ACTIVITY_COMMENT_INVALID_OUTPUT` et ne remplace rien.

## Structure

| Couche | Fichier | Rôle |
|---|---|---|
| Domain | `domain/value-objects/activity-comment.vo.ts` | `ActivityComment` : texte validé, origine (`ia` ou `generique`), modèle, date |
| Domain | `domain/ports/outbound/conseils.ports.ts` | Ports `IActivityReader`, `IPlannedSessionReader`, `IActivityCommentGenerator`, `IActivityCommentRepository`, horloge `ConseilsClock` |
| Domain | `domain/errors/` | `ActivityNotFoundError` (`ACTIVITY_NOT_FOUND`), `ActivityCommentNotFoundError`, `ActivityCommentInvalidOutputError`, `ActivityCommentUnavailableError`, `ActivityCommentAccessDeniedError` |
| Application | `application/use-cases/generate-activity-comment.use-case.ts` | `GenerateActivityCommentUseCase` |
| Application | `application/use-cases/get-activity-comment.use-case.ts` | `GetActivityCommentUseCase` |
| Infrastructure | `infrastructure/adapters/garmin-activity-reader.adapter.ts` | ACL vers `GetActivityUseCase` (`garmin-sync`) |
| Infrastructure | `infrastructure/adapters/seances-planned-session-reader.adapter.ts` | ACL vers `GetSessionForActivityUseCase` (`seances`) |
| Infrastructure | `infrastructure/adapters/claude-activity-comment.generator.adapter.ts` | Appel unique à Claude, texte libre, traduction des erreurs du SDK |
| Infrastructure | `infrastructure/adapters/prompts/activity-comment.prompt.v1.ts` | Prompt système et résumé envoyé (version `v1`) |
| Infrastructure | `infrastructure/persistence/prisma/activity-comment.repository.adapter.ts` | Table `activity_comments`, upsert par identifiant d'activité |
| Presentation | `presentation/http/controllers/activity-comments.controller.ts` | Routes `/api/activities/:id/comment` |
| Composition | `conseils.module.ts` | Importe `GarminSyncModule` et `SeancesModule` (façades), fournit le client Anthropic de `core` |

## Décisions

- **Pas de ressenti** : le modèle de données ne contient pas de ressenti ; le commentaire ne le prend donc pas en compte. Le critère « ressenti s'il existe » est reporté.
- **Route sous `/activities`** : le chemin appartient au contrat public de l'API des activités, mais le code est dans ce module, qui porte les commentaires.
- **Texte libre** : pas de sortie structurée, la réponse est un bloc texte unique et borné.
