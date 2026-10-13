import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve(import.meta.dirname, '../dist');
const headersFile = path.join(dist, '_headers');
const inlineScript = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;
const inlineStyle = /\sstyle="([^"]*)"/g;
const hash = (text) =>
  `'sha256-${createHash('sha256').update(text).digest('base64')}'`;

const hashesFor = async (route) => {
  const relative = route.replace(/^\/+|\/+$/g, '');
  const files = route.endsWith('/*')
    ? (
        await readdir(path.join(dist, relative.slice(0, -1)), {
          recursive: true,
        })
      )
        .filter((file) => file.endsWith('.html'))
        .map((file) => path.join(dist, relative.slice(0, -1), file))
    : [
        relative === '404'
          ? path.join(dist, '404.html')
          : path.join(dist, relative, 'index.html'),
      ];
  const scripts = new Set();
  const styles = new Set();
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    for (const [, body] of html.matchAll(inlineScript))
      if (body) scripts.add(hash(body));
    for (const [, value] of html.matchAll(inlineStyle)) styles.add(hash(value));
  }
  return { scripts: [...scripts], styles: [...styles] };
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
  const { scripts, styles } = await hashesFor(route);
  let next = scripts.length ? `${csp[1]} ${scripts.join(' ')}${csp[2]}` : line;
  if (styles.length)
    next = next.replace(
      "style-src 'self';",
      `style-src 'self'; style-src-attr 'unsafe-hashes' ${styles.join(' ')};`,
    );
  lines.push(next);
}
await writeFile(headersFile, lines.join('\n'));
