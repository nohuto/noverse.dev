import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';

const sources = import.meta.glob<{ default: ImageMetadata }>(
  '../image-sources/**/*.{png,webp}',
  { eager: true },
);

export function sourceImage(path: string): ImageMetadata {
  const source = sources[`../image-sources${path}`];
  if (!source)
    throw new Error(`Missing image source: src/image-sources${path}`);
  return source.default;
}

export async function webpWidths(path: string, widths: number[]) {
  const src = sourceImage(path);
  const images = await Promise.all(
    widths.map((width) =>
      getImage({ src, width, format: 'webp', quality: 80 }),
    ),
  );
  return {
    source: src,
    byWidth: Object.fromEntries(
      widths.map((width, index) => [width, images[index]!.src]),
    ),
    srcset: images
      .map((image, index) => `${image.src} ${widths[index]}w`)
      .join(', '),
  };
}
