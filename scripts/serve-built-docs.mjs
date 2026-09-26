import path from 'node:path';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';

const builtDocs = path.resolve('dist/docs');
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.pagefind': 'application/wasm',
};

export function serveBuiltDocs() {
  return {
    name: 'noverse-built-docs',
    apply: 'serve',
    enforce: 'pre',
    configureServer(server) {
      const serveDocs = async (request, response, next) => {
        const pathname = new URL(request.url || '/', 'http://localhost')
          .pathname;
        if (pathname === '/docs') {
          response.statusCode = 308;
          response.setHeader('Location', '/docs/');
          return response.end();
        }
        if (!pathname.startsWith('/docs/')) return next();
        let relative;
        try {
          relative = decodeURIComponent(pathname.slice('/docs/'.length));
        } catch {
          response.statusCode = 400;
          return response.end('Invalid documentation path.');
        }
        const file = path.resolve(
          builtDocs,
          relative,
          pathname.endsWith('/') ? 'index.html' : '',
        );
        if (!file.startsWith(builtDocs + path.sep)) return next();
        const info = await stat(file).catch(() => null);
        if (!info?.isFile()) return next();
        response.setHeader(
          'Content-Type',
          contentTypes[path.extname(file)] || 'application/octet-stream',
        );
        response.setHeader('Content-Length', info.size);
        response.setHeader('Cache-Control', 'no-store');
        createReadStream(file)
          .on('error', () => response.destroy())
          .pipe(response);
      };
      server.middlewares.use(serveDocs);
      server.httpServer?.once('listening', () => {
        // Astro's HTML route handler is before ordinary Vite middleware.
        const stack = server.middlewares.stack;
        if (!Array.isArray(stack)) return;
        const index = stack.findIndex((layer) => layer.handle === serveDocs);
        if (index > 0) stack.unshift(...stack.splice(index, 1));
      });
    },
  };
}
