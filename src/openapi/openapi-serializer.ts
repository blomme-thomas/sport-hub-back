import type { OpenAPIObject } from '@nestjs/swagger';

function compareTagNames(
  left: { name: string },
  right: { name: string },
): number {
  if (left.name === right.name) {
    return 0;
  }
  return left.name < right.name ? -1 : 1;
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, sortKeysDeep(record[key])]),
    );
  }
  return value;
}

export function serializeOpenApi(document: OpenAPIObject): string {
  const withSortedTags: OpenAPIObject = {
    ...document,
    tags: [...(document.tags ?? [])].sort(compareTagNames),
  };
  return `${JSON.stringify(sortKeysDeep(withSortedTags), null, 2)}\n`;
}
