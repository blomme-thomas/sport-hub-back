-- Ajoute la source « saisie-manuelle » aux commentaires d'activité. La nouvelle contrainte contient l'ancienne :
-- les lignes existantes restent valides. Retour arrière : supprimer les lignes « saisie-manuelle », puis rétablir la contrainte à deux valeurs.

-- DropCheck
ALTER TABLE "activity_comments" DROP CONSTRAINT "activity_comments_source_check";

-- AddCheck
ALTER TABLE "activity_comments" ADD CONSTRAINT "activity_comments_source_check" CHECK ("source" IN ('ia', 'generique', 'saisie-manuelle'));
