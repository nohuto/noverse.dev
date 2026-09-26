import { defineConfig } from 'astro/config';
import { serveBuiltDocs } from './scripts/serve-built-docs.mjs';
import { serveImageVariants } from './scripts/serve-image-variants.mjs';

export default defineConfig({
  site: 'https://www.noverse.dev',
  build: { format: 'file' },
  vite: { plugins: [serveBuiltDocs(), serveImageVariants()] },
});
