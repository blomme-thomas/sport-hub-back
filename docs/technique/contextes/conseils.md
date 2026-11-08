# Contexte conseils

Bounded Context des conseils : un commentaire par activité réalisée, qui compare l'activité à la séance rapprochée (issue #41). Code : `src/modules/conseils/`. Usage mono-utilisateur.

Périmètre livré : génération et stockage du commentaire, lecture, régénération à la demande. Hors périmètre : affichage (dépôt front), bilan hebdomadaire (story #42).

## Routes

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
