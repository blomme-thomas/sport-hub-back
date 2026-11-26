-- Noms d'aliments simplifiés : seul le nom de base est gardé (sans mode de cuisson ni état).
-- Les ids ne changent pas, donc les recettes restent liées à leurs aliments.
UPDATE "foods" SET "name" = 'Poulet' WHERE "name" = 'Poulet, blanc, cuit';
UPDATE "foods" SET "name" = 'Œuf entier' WHERE "name" = 'Œuf entier, cru';
UPDATE "foods" SET "name" = 'Thon au naturel' WHERE "name" = 'Thon au naturel, égoutté';
UPDATE "foods" SET "name" = 'Lentilles' WHERE "name" = 'Lentilles cuites';
UPDATE "foods" SET "name" = 'Riz' WHERE "name" = 'Riz blanc, cuit';
UPDATE "foods" SET "name" = 'Pâtes' WHERE "name" = 'Pâtes, cuites';
UPDATE "foods" SET "name" = 'Pomme de terre' WHERE "name" = 'Pomme de terre, cuite à l’eau';
UPDATE "foods" SET "name" = 'Brocoli' WHERE "name" = 'Brocoli, cuit';
UPDATE "foods" SET "name" = 'Carotte' WHERE "name" = 'Carotte, crue';
UPDATE "foods" SET "name" = 'Tomate' WHERE "name" = 'Tomate, crue';
UPDATE "foods" SET "name" = 'Épinard' WHERE "name" = 'Épinard, cru';
