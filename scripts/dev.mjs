import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

const dist = path.join(import.meta.dirname, '..', 'dist');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};
const isFile = (file) => file.startsWith(dist) && stat(file).then((s) => s.isFile(), () => false);
const send = async (response, status, file) => response
  .writeHead(status, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' })
  .end(await readFile(file));

createServer(async (request, response) => {
  const url = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  if (url.endsWith('.html')) return response.writeHead(308, { Location: url.replace(/(index)?\.html$/, '') }).end();

  const file = path.join(dist, url);
  if (url.endsWith('/') && await isFile(path.join(file, 'index.html'))) return send(response, 200, path.join(file, 'index.html'));
  if (await isFile(file)) return send(response, 200, file);
  if (await isFile(`${file}.html`)) return send(response, 200, `${file}.html`);
  if (await isFile(path.join(file, 'index.html'))) return response.writeHead(308, { Location: `${url}/` }).end();

  let dir = path.dirname(file);
  while (dir.startsWith(dist) && !await isFile(path.join(dir, '404.html'))) dir = path.dirname(dir);
  return send(response, 404, path.join(dir.startsWith(dist) ? dir : dist, '404.html'));
}).listen(process.argv[2] || 8888, '127.0.0.1');
