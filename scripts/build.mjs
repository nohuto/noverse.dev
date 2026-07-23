import { spawn } from 'node:child_process';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import sharp from 'sharp';
import { minifyHtml } from './minify-html.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteDir = path.join(root, 'site');
const htmlDir = path.join(siteDir, 'pages');
const scriptDir = path.join(siteDir, 'scripts');
const styleDir = path.join(siteDir, 'styles');
const publicDir = path.join(siteDir, 'public');
const distDir = path.join(root, 'dist');
const mainOutputDir = path.join(distDir, 'main');
const responsiveImagePattern = /\/?(main\/images\/[^"'\s,]+)-(\d+)\.webp\s+\d+w/g;

async function copyEntry(source, destination) {
  await cp(source, destination, { recursive: true });
}

async function buildResponsiveImages(pages) {
  const variants = new Map();

  pages.forEach(({ html }) => {
    for (const match of html.matchAll(responsiveImagePattern)) {
      const [, imagePath, width] = match;
      const widths = variants.get(imagePath) || new Set();
      widths.add(Number(width));
      variants.set(imagePath, widths);
    }
  });

  await Promise.all([...variants].flatMap(([imagePath, widths]) => (
    [...widths].map(async (width) => {
      const output = path.join(distDir, `${imagePath}-${width}.webp`);
      await mkdir(path.dirname(output), { recursive: true });
      await sharp(path.join(publicDir, `${imagePath}.png`))
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toFile(output);
    })
  )));
}

async function buildMainSite() {
  const publicEntries = await readdir(publicDir, { withFileTypes: true });
  await Promise.all(publicEntries.map((entry) => (
    copyEntry(path.join(publicDir, entry.name), path.join(distDir, entry.name))
  )));

  await mkdir(path.join(mainOutputDir, 'min'), { recursive: true });

  const assetEntries = (await Promise.all([scriptDir, styleDir].map(async (directory) => (
    (await readdir(directory, { withFileTypes: true }))
      .filter(
        (entry) => entry.isFile() && ['.css', '.js'].includes(path.extname(entry.name)),
      )
      .map((entry) => path.join(directory, entry.name))
  )))).flat();

  await Promise.all(assetEntries.map(async (source) => {
    const extension = path.extname(source);
    const name = path.basename(source, extension);
    await build({
      entryPoints: [source],
      outfile: path.join(mainOutputDir, 'min', `${name}.min${extension}`),
      minify: true,
      logLevel: 'silent',
    });
  }));

  const htmlEntries = (await readdir(htmlDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && path.extname(entry.name) === '.html');

  const pages = await Promise.all(htmlEntries.map(async (entry) => ({
    entry,
    html: await readFile(path.join(htmlDir, entry.name), 'utf8'),
  })));

  await Promise.all([
    buildResponsiveImages(pages),
    ...pages.map(({ entry, html }) => (
      writeFile(path.join(distDir, entry.name), minifyHtml(html))
    )),
  ]);
}

function buildDocs() {
  const command = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : 'npm';
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'npm run build:docs']
    : ['run', 'build:docs'];

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => (
      code === 0 ? resolve() : reject(new Error(`Doc build failed - ${code}`))
    ));
  });
}

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await buildMainSite();
await buildDocs();

console.log(`Built deployment output: ${distDir}`);
