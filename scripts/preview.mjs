import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number.parseInt(process.argv[2] || '8888', 10);
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.xml', 'application/xml; charset=utf-8'],
]);

const insideRoot = target => target === root || target.startsWith(`${root}${path.sep}`);

async function isFile(target) {
  try {
    return (await stat(target)).isFile();
  } catch {
    return false;
  }
}

async function resolveRoute(pathname) {
  const relative = pathname.replace(/^\/+/, '');
  const direct = path.resolve(root, relative);
  if (!insideRoot(direct)) return {};

  if (pathname.endsWith('/')) {
    const index = path.join(direct, 'index.html');
    return (await isFile(index)) ? { file: index } : {};
  }

  if (path.extname(pathname)) {
    return (await isFile(direct)) ? { file: direct } : {};
  }

  const html = `${direct}.html`;
  if (await isFile(html)) return { file: html };

  const index = path.join(direct, 'index.html');
  return (await isFile(index)) ? { redirect: `${pathname}/` } : {};
}

async function closestNotFound(pathname) {
  let directory = path.dirname(path.resolve(root, pathname.replace(/^\/+/, '')));
  while (insideRoot(directory)) {
    const candidate = path.join(directory, '404.html');
    if (await isFile(candidate)) return candidate;
    if (directory === root) break;
    directory = path.dirname(directory);
  }
  return path.join(root, '404.html');
}

function sendFile(response, file, status = 200, method = 'GET') {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': mimeTypes.get(path.extname(file).toLowerCase()) || 'application/octet-stream',
  });
  if (method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(file).pipe(response);
}

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname.endsWith('.html')) {
      const route = pathname.endsWith('/index.html')
        ? pathname.slice(0, -10) || '/'
        : pathname.slice(0, -5) || '/';
      response.writeHead(308, { Location: route }).end();
      return;
    }

    const { file, redirect } = await resolveRoute(pathname);
    if (redirect) {
      response.writeHead(308, { Location: redirect }).end();
      return;
    }
    sendFile(response, file || await closestNotFound(pathname), file ? 200 : 404, request.method);
  } catch {
    response.writeHead(400).end('Bad request');
  }
});

server.listen(port, '127.0.0.1');
