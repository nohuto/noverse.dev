import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageEntry = fileURLToPath(import.meta.resolve('@astrojs/starlight'));
const targetFile = resolve(dirname(packageEntry), 'style/markdown.css');
const source = readFileSync(targetFile, 'utf8');

const before = `	.sl-markdown-content
	 :is(ol, ul):has(> li > :not(a, strong, em, del, span, input, code, br, script, ol, ul))
	 > li
	 > :is(
			:last-child:not(a, strong, em, del, span, input, code, br, script, :where(.not-content *)),`;
const after = `	.sl-markdown-content
	 li
	 > :is(
			:last-child:not(li, ul, ol, a, strong, em, del, span, input, code, br, script, :where(.not-content *)),`;

if (source.includes(before)) {
  writeFileSync(targetFile, source.replace(before, after), 'utf8');
  console.log('[postinstall] Replaced Starlight list spacing :has() selector');
} else if (!source.includes(after)) {
  throw new Error('[postinstall] Could not apply Starlight list patch');
}
