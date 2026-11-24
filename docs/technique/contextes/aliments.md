# Contexte aliments

Base alimentaire : aliments, leur unité unique et leurs valeurs nutritionnelles pour 100 g.

## Modèle

- Un aliment a un nom, une unité (sans conversion) et des catégories : `protéine`, `légume`, `féculent`, `autre`. Il peut en porter plusieurs.
- Valeurs pour 100 g : calories, protéines, glucides, lipides, sucres. Toutes facultatives à la création.
- La catégorie `autre` (épices, condiments) accepte aucune quantité ni macro.
- Aucun contrôle de cohérence entre valeurs nutritionnelles.

## Endpoints

- `GET /api/foods` : liste, filtre par catégorie, recherche par nom insensible à la casse.
- `GET /api/foods/:id` : lecture.
- `POST /api/foods` : création.
- `PATCH /api/foods/:id` : modification des valeurs et des catégories.
- `DELETE /api/foods/:id` : suppression (204). Refusée en `409 FOOD_IN_USE` si une recette contient l'aliment.

Erreurs au format RFC 9457 (`FOOD_NOT_FOUND` 404, `INVALID_FOOD` 400, `FOOD_IN_USE` 409).

## Persistance

Table `foods` (migration `20261130120100_create_foods`). Le seed Ciqual, les recettes et la suppression d'un aliment utilisé sont hors de cette story.

## Seed initial (Ciqual)

- Commande : `npm run seed:foods` (lit `DATABASE_URL` dans `.env`). Jamais exécuté au démarrage.
- Clé : nom. Réexécutable : les aliments existants sont mis à jour, sans doublon.
- Source : table Ciqual de l'ANSES, licence Etalab 2.0. Code : `src/modules/aliments/infrastructure/seed/`.
- Contenu : 14 aliments de base, valeurs pour 100 g.
- Hypothèse : valeurs arrondies, à valider contre ciqual.anses.fr avant usage. Import intégral hors périmètre.

## Recettes

- Une recette a un nom (1 à 200 caractères) et des tags de repas `matin`, `midi`, `soir` (au moins un, doublons retirés).
- Composition : liste d'items `{ aliment, composant facultatif, quantité facultative }`. Composants : `proteine`, `legume`, `feculent`. Un composant exige que l'aliment porte cette catégorie. Sans composant, l'item est une sélection libre (petit-déjeuner). Aucun composant n'est obligatoire.
- Quantité : strictement positive, dans l'unité de l'aliment ; absente ou `null` = vide.
- Modification : une composition fournie remplace l'ensemble des items.
- Notes facultatives : absentes du cadrage, non implémentées (à confirmer).

Endpoints : `GET /api/recipes`, `GET /api/recipes/:id`, `POST /api/recipes`, `POST /api/recipes/preview` (synthèse d'une composition non enregistrée, aperçu en direct), `PATCH /api/recipes/:id`, `DELETE /api/recipes/:id` (204).

Erreurs : `RECIPE_NOT_FOUND` (404), `INVALID_RECIPE` (400). Tables `recipes` et `recipe_items` (migration `20261130120200_create_recipes`). Un aliment utilisé par une recette ne peut pas être supprimé (contrainte `RESTRICT`).

## Synthèse nutritionnelle d'une recette

- `GET /api/recipes/:id` renvoie `nutrition` : totaux (calories, protéines, glucides, lipides, sucres), totaux par composant (`proteine`, `legume`, `feculent`, `libre` pour les items sans composant) et `ignored`.
- Calcul : valeur pour 100 g × quantité / 100, sommé par aliment. Recalculé à chaque lecture, jamais stocké. Arrondi à 0,1 en fin de calcul.
- Un item est ignoré et signalé dans `ignored` (`quantity-missing` ou `nutrition-missing`) s'il n'a pas de quantité, ou si une de ses valeurs nutritionnelles est vide. Hypothèse : à valider.
- Une recette sans item renvoie une synthèse nulle, sans erreur.
- Code : `domain/services/summarize-recipe-nutrition.ts` (fonction pure, testée unitairement).

## Planning des repas

- Un repas planifié référence une recette, une date (`AAAA-MM-JJ`) et un repas (`matin`, `midi`, `soir`). Plusieurs repas par jour et par repas sont possibles ; une même recette peut être placée plusieurs fois, chaque placement a son identifiant.
- Pas de génération automatique du planning.

Endpoints :

- `GET /api/meal-plan?week=AAAA-Www` : repas d'une semaine ISO (lundi à dimanche), triés par date puis par repas.
- `POST /api/meal-plan` : ajoute un repas (`recipeId`, `date`, `mealTag`).
- `PATCH /api/meal-plan/:id` : déplace un repas (nouvelle date ou nouveau repas, identifiant conservé).
- `DELETE /api/meal-plan/:id` : retire un repas, sans toucher aux autres placements.

Suppression d'une recette planifiée : refusée en `409 RECIPE_IN_USE` par défaut ; `DELETE /api/recipes/:id?confirm=true` retire aussi ses repas. Hypothèse : à valider.

Erreurs : `PLANNED_MEAL_NOT_FOUND` (404), `INVALID_PLANNED_MEAL` (400), `RECIPE_IN_USE` (409). Table `planned_meals` (migration `20261130120300_create_planned_meals`).

## Liste de courses d'une période

- `GET /api/shopping-list?from=AAAA-MM-JJ&to=AAAA-MM-JJ` : calcul à la demande, non sauvegardé et non cochable.
- Chaque repas planifié compte pour une fois sa recette : une recette placée deux fois compte deux fois.
- Quantités additionnées par aliment (unité unique). Un aliment dont une occurrence n'a pas de quantité est signalé `quantityMissing` ; sa quantité est la somme des quantités connues.
- Tri par catégorie (`proteine`, `legume`, `feculent`, `autre`), puis par nom. Un aliment multi-catégories est classé selon la première catégorie de cet ordre.
- Période sans repas : liste vide. Fin antérieure au début : `SHOPPING_LIST_PERIOD_INVALID` (400).
- Code : `domain/services/build-shopping-list.ts` (fonction pure), `application/use-cases/get-shopping-list.use-case.ts`.
