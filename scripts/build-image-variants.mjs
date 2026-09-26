import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import projects from '../src/data/projects.json' with { type: 'json' };

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'dist');
const projectImages = [
  ...new Set(
    projects
      .filter((project) => project.projects !== false)
      .map((project) => project.image)
      .filter(Boolean),
  ),
];
const variants = projectImages.flatMap((image) =>
  [480, 640, 960].map((width) => ({ image, width })),
);
for (const image of [
  'main/images/lightblue',
  'main/images/lightviolet',
  'main/images/darkred',
]) {
  variants.push({ image, width: 640 }, { image, width: 960 });
}

await Promise.all(
  variants.map(async ({ image, width }) => {
    const optimizedSource = path.join(
      root,
      'src/image-sources',
      `${image}.png`,
    );
    const source = existsSync(optimizedSource)
      ? optimizedSource
      : path.join(root, 'public', `${image}.png`);
    const target = path.join(output, `${image}-${width}.webp`);
    await mkdir(path.dirname(target), { recursive: true });
    await sharp(source)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toFile(target);
  }),
);
