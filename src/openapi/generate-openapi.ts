import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateOpenApiDocument } from './generate-openapi-document.js';

const OUTPUT_FILE = fileURLToPath(
  new URL('../../docs/api/openapi.json', import.meta.url),
);

async function main(): Promise<void> {
  const content = await generateOpenApiDocument();
  await mkdir(dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, content, 'utf8');
}

void main().catch((error: unknown) => {
  console.error('Erreur lors de la génération du contrat OpenAPI :', error);
  process.exit(1);
});
