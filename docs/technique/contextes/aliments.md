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

Erreurs au format RFC 9457 (`FOOD_NOT_FOUND` 404, `INVALID_FOOD` 400).

## Persistance

Table `foods` (migration `20261130120100_create_foods`). Le seed Ciqual, les recettes et la suppression d'un aliment utilisé sont hors de cette story.

## Seed initial (Ciqual)

- Commande : `npm run seed:foods` (lit `DATABASE_URL` dans `.env`). Jamais exécuté au démarrage.
- Clé : nom. Réexécutable : les aliments existants sont mis à jour, sans doublon.
- Source : table Ciqual de l'ANSES, licence Etalab 2.0. Code : `src/modules/aliments/infrastructure/seed/`.
- Contenu : 14 aliments de base, valeurs pour 100 g.
- Hypothèse : valeurs arrondies, à valider contre ciqual.anses.fr avant usage. Import intégral hors périmètre.
