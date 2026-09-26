import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
if (!existsSync(path.join(root, 'dist/docs/index.html'))) {
  const docs = path.join(root, 'docs');
  const astro = path.join(root, 'node_modules/astro/bin/astro.mjs');
  for (const [file, args] of [
    [path.join(docs, 'scripts/sync-docs.mjs'), []],
    [astro, ['build']],
  ]) {
    const result = spawnSync(process.execPath, [file, ...args], {
      cwd: docs,
      stdio: 'inherit',
    });
    if (result.status !== 0) process.exit(result.status || 1);
  }
}
