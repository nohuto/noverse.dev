import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageEntry = fileURLToPath(import.meta.resolve('starlight-codeblock-fullscreen'));
const targetFile = resolve(
  dirname(packageEntry),
  'libs/ec-fullscreen.js'
);

if (!existsSync(targetFile)) {
  process.exit(0);
}

const source = readFileSync(targetFile, 'utf8');
const exportLinePattern = /\r?\nexport default initECFullscreen;\r?\n?$/;

if (!exportLinePattern.test(source)) {
  process.exit(0);
}

const patched = source.replace(exportLinePattern, '\n');
writeFileSync(targetFile, patched, 'utf8');
console.log('[postinstall] Applied starlight-codeblock-fullscreen export patch.');
