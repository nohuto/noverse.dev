import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve(import.meta.dirname, '../dist');
const headersFile = path.join(dist, '_headers');
const inlineScript = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;

const hashesFor = async (route) => {
  const file = path.join(dist, route === '/' ? 'index.html' : `${route}.html`);
  const html = await readFile(file, 'utf8');
  const hashes = new Set();
  for (const [, body] of html.matchAll(inlineScript)) {
    if (!body) continue;
    const digest = createHash('sha256').update(body).digest('base64');
    hashes.add(`'sha256-${digest}'`);
  }
  return [...hashes];
};

let route = null;
const lines = [];
for (const line of (await readFile(headersFile, 'utf8')).split(/\r?\n/)) {
  if (line && !/^\s/.test(line)) route = line.trim();
  const csp = line.match(
    /^(\s+Content-Security-Policy:.*\bscript-src [^;]*)(.*)$/i,
  );
  if (!csp) {
    lines.push(line);
    continue;
  }
  const hashes = await hashesFor(route);
  lines.push(hashes.length ? `${csp[1]} ${hashes.join(' ')}${csp[2]}` : line);
}
await writeFile(headersFile, lines.join('\n'));
