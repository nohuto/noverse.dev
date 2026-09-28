import { defineConfig } from 'astro/config';
import { serveBuiltDocs } from './scripts/serve-built-docs.mjs';

export default defineConfig({
  site: 'https://noverse.dev',
  build: { format: 'file' },
  compressHTML: true,
  vite: { plugins: [serveBuiltDocs()] },
});
