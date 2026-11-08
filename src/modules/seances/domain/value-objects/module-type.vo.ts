export const MODULE_TYPES = [
  'echauffement',
  'educatifs',
  'series',
  'retour_au_calme',
  'autre',
] as const;

export type ModuleType = (typeof MODULE_TYPES)[number];

export function isModuleType(value: unknown): value is ModuleType {
  return (
    typeof value === 'string' &&
    (MODULE_TYPES as readonly string[]).includes(value)
  );
}
