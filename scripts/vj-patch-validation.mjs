import { resolve } from 'node:path';
import { createServer } from 'vite';

// Use the same SSR loader as vj-validate so CLI validation runs the TypeScript source.
const server = await createServer({
  configFile: false,
  root: resolve(import.meta.dirname, '..'),
  server: { middlewareMode: true, watch: null, ws: false },
  appType: 'custom',
  logLevel: 'error',
});
let schema, validation, catalog;
try {
  [schema, validation, catalog] = await Promise.all([
    server.ssrLoadModule('/src/synth/schema.ts'),
    server.ssrLoadModule('/src/synth/validate.ts'),
    server.ssrLoadModule('/src/synth/catalog.ts'),
  ]);
} finally {
  await server.close();
}

export const { AUDIO_SOURCES, SWELL_SOURCES, CATEGORY_RANK, COUNT_LIMITS } = validation;

export function validatePatchLocal(patch, catalogArray) {
  const parsed = schema.parsePatch(patch);
  if (!parsed.ok) return parsed.issues;
  return validation
    .validatePatch(parsed.patch, catalog.createCatalog(catalogArray))
    .map((issue) => `${issue.message}${issue.path ? ` (${issue.path})` : ''}`);
}
