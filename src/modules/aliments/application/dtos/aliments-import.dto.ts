/** Résultat d'un import de fichier `plan-aliments` ou `plan-recettes` : nombre créé et identifiants. */
export interface AlimentsImportResultDto {
  createdCount: number;
  ids: string[];
}
