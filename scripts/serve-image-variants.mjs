import path from 'node:path';
import { existsSync } from 'node:fs';
import sharp from 'sharp';

const imageSources = path.resolve('src/image-sources');
const publicImages = path.resolve('public/main/images');

export function serveImageVariants() {
  return {
    name: 'noverse-image-variants',
    apply: 'serve',
    configureServer(server) {
      const cache = new Map();
      server.watcher.on('change', file => {
        if (file.startsWith(imageSources) || file.startsWith(publicImages)) cache.clear();
      });
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url || '/', 'http://localhost').pathname;
        const match = pathname.match(/^\/main\/images\/([\w./-]+)-(480|640|960)\.webp$/);
        if (!match) return next();
        const source = path.resolve(imageSources, 'main/images', `${match[1]}.png`);
        if (!source.startsWith(imageSources + path.sep)) return next();
        const original = existsSync(source) ? source : path.resolve(publicImages, `${match[1]}.png`);
        try {
          let data = cache.get(pathname);
          if (!data) {
            data = await sharp(original).resize({ width: Number(match[2]), withoutEnlargement: true })
              .webp({ quality: 80, effort: 4 }).toBuffer();
            cache.set(pathname, data);
          }
          response.setHeader('Content-Type', 'image/webp');
          response.end(data);
        } catch {
          next();
        }
      });
    },
  };
}
