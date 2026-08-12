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
const dataDir = path.join(siteDir, 'data');
const partialDir = path.join(siteDir, 'partials');
const scriptDir = path.join(siteDir, 'scripts');
const styleDir = path.join(siteDir, 'styles');
const publicDir = path.join(siteDir, 'public');
const distDir = path.join(root, 'dist');
const mainOutputDir = path.join(distDir, 'main');
const responsiveImagePattern = /\/?(main\/images\/[^"'\s,]+)-(\d+)\.webp\s+\d+w/g;
const pageNavigation = Object.freeze({
  'index.html': 'home',
  'product.html': 'product',
  'projects.html': 'projects',
  'diff.html': 'diff',
  'policies.html': 'policies',
});
const themeOptions = [
  ['system', 'System'], ['dark', 'Dark'], ['light', 'Light'], ['ayu-dark', 'Ayu Dark'],
  ['ayu-light', 'Ayu Light'], ['catppuccin-frappe', 'Catppuccin Frappe'],
  ['catppuccin-latte', 'Catppuccin Latte'], ['catppuccin-macchiato', 'Catppuccin Macchiato'],
  ['catppuccin-mocha', 'Catppuccin Mocha'], ['everforest-dark', 'Everforest Dark'],
  ['everforest-light', 'Everforest Light'], ['gray-black', 'Gray Black'],
  ['gruvbox-dark', 'Gruvbox Dark'], ['gruvbox-light', 'Gruvbox Light'], ['horizon', 'Horizon'],
  ['kanagawa-dragon', 'Kanagawa Dragon'], ['kanagawa-lotus', 'Kanagawa Lotus'],
  ['kanagawa-wave', 'Kanagawa Wave'], ['monokai', 'Monokai'], ['night-owl', 'Night Owl'],
  ['nord', 'Nord'], ['one-dark', 'One Dark'], ['one-light', 'One Light'],
  ['purple-black', 'Purple Black'], ['rose-pine', 'Rose Pine'],
  ['rose-pine-moon', 'Rose Pine Moon'], ['solarized-dark', 'Solarized Dark'],
  ['solarized-light', 'Solarized Light'],
];

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const externalLinkAttributes = ' target="_blank" rel="noopener noreferrer"';

function renderProjectMedia(project) {
  if (project.video) {
    const name = escapeHtml(project.video);
    return `<video class="project-media" src="/main/media/projects/${name}.mp4" poster="/main/images/projects/posters/${name}.webp" width="2560" height="1440" controls preload="none" playsinline muted referrerpolicy="no-referrer"></video>`;
  }
  const source = escapeHtml(project.image);
  const priority = project.priority ? ' fetchpriority="high"' : ' loading="lazy"';
  const referrer = project.repo ? ' referrerpolicy="no-referrer"' : '';
  return `<img decoding="async" class="project-media-img" src="${source}-640.webp" srcset="${source}-480.webp 480w, ${source}-640.webp 640w, ${source}-960.webp 960w" sizes="(max-width: 700px) calc(100vw - 48px), (max-width: 1100px) 50vw, 430px" width="${project.width}" height="${project.height}" alt=""${priority}${referrer}>`;
}

function renderProjectCards(projects) {
  return projects.filter((project) => project.projects !== false).map((project) => {
    const href = project.href || `https://github.com/${project.repo}`;
    const external = /^https?:\/\//.test(href);
    const data = project.repo
      ? ` data-repo="${escapeHtml(project.repo)}"`
      : ` data-card-href="${escapeHtml(href)}"`;
    const description = project.description || 'Fetching description...';
    return `
          <article class="project-card clickable-card"${data}>
            ${renderProjectMedia(project)}
            <div class="project-body">
              <h3 class="project-title">${escapeHtml(project.title)}</h3>
              <p class="project-desc">${escapeHtml(description)}</p>
            </div>
            <a class="clickable-card-link" href="${escapeHtml(href)}"${external ? externalLinkAttributes : ''} aria-label="Open ${escapeHtml(project.title)}${external ? ' on GitHub' : ''}"></a>
          </article>`;
  }).join('\n');
}

function renderHomeProjects(projects) {
  return projects.filter((project) => project.home)
    .sort((left, right) => left.home.order - right.home.order)
    .map((project) => {
    const home = project.home;
    const repoUrl = `https://github.com/${project.repo}`;
    const docsAttributes = home.external ? externalLinkAttributes : '';
    return `
            <div class="home-work-item" data-repo="${escapeHtml(project.repo)}">
              <div class="home-work-title">
                <a href="${escapeHtml(repoUrl)}"${externalLinkAttributes}><strong>${escapeHtml(home.name)}</strong></a>
                <a class="home-work-docs" href="${escapeHtml(home.docs)}"${docsAttributes} aria-label="${escapeHtml(home.docsLabel || `${home.name} documentation`)}" title="${escapeHtml(home.docsTitle || 'Documentation')}"></a>
              </div>
              <span class="project-desc">${escapeHtml(home.description || 'Fetching description...')}</span>
            </div>`;
    }).join('\n');
}

function renderProductDocs(items) {
  return items.map((item) => `
            <article class="doc-card clickable-card" data-card-href="${escapeHtml(item.href)}">
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.description)}</p>
              <a class="clickable-card-link" href="${escapeHtml(item.href)}" aria-label="Open ${escapeHtml(item.title)} documentation"></a>
            </article>`).join('\n');
}

function renderCommitSkeleton() {
  return `<div class="commit-skeleton" aria-hidden="true">${Array.from({ length: 15 }, () => `
              <div class="commit-skeleton-row">
                <span class="commit-skeleton-repo"></span>
                <span class="commit-skeleton-message"></span>
                <span class="commit-skeleton-date"></span>
              </div>`).join('')}
            </div>`;
}

function renderSettingsDialogStart(prefix) {
  const id = escapeHtml(prefix);
  return `<div class="settings-modal" id="${id}-settings-modal" hidden>
          <div class="settings-dialog" id="${id}-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="${id}-settings-title">
            <div class="settings-header" id="${id}-settings-header">
              <h2 id="${id}-settings-title">Settings</h2>
              <button id="${id}-settings-close" type="button" aria-label="Close settings" title="Close settings">
                <span class="settings-close-icon" aria-hidden="true"></span>
                <span class="sr-only">Close settings</span>
              </button>
            </div>`;
}

function renderSettingsDialogEnd(prefix) {
  const id = escapeHtml(prefix);
  return `<div class="settings-footer">
              <button id="${id}-settings-reset" type="button">Reset</button>
              <button id="${id}-settings-done" type="button">Close</button>
            </div>
          </div>
        </div>`;
}

async function loadPageSources() {
  const [partialEntries, projects, productDocs] = await Promise.all([
    readdir(partialDir, { withFileTypes: true }),
    readFile(path.join(dataDir, 'projects.json'), 'utf8').then(JSON.parse),
    readFile(path.join(dataDir, 'product-docs.json'), 'utf8').then(JSON.parse),
  ]);
  const partials = new Map(await Promise.all(partialEntries
    .filter((entry) => entry.isFile() && path.extname(entry.name) === '.html')
    .map(async (entry) => [path.basename(entry.name, '.html'), await readFile(path.join(partialDir, entry.name), 'utf8')])));
  return { partials, projects, productDocs };
}

function expandPage(html, pageName, sources) {
  let expanded = html.replace(/<!-- include:([\w-]+) -->/g, (_, name) => {
    if (!sources.partials.has(name)) throw new Error(`Unknown HTML partial: ${name}`);
    return sources.partials.get(name);
  });
  const activeNavigation = pageNavigation[pageName] || '';
  expanded = expanded.replace(/\{\{nav-([\w-]+)\}\}/g, (_, name) => (
    name === activeNavigation ? ' class="active" aria-current="page"' : ''
  ));
  expanded = expanded.replace('{{theme-options}}', themeOptions
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join('\n          '));
  expanded = expanded.replace('<!-- component:project-cards -->', renderProjectCards(sources.projects));
  expanded = expanded.replace('<!-- component:home-projects -->', renderHomeProjects(sources.projects));
  expanded = expanded.replace('<!-- component:product-docs -->', renderProductDocs(sources.productDocs));
  expanded = expanded.replace('<!-- component:commit-skeleton -->', renderCommitSkeleton());
  expanded = expanded.replace(/<!-- component:settings-dialog-start:([\w-]+) -->/g, (_, prefix) => renderSettingsDialogStart(prefix));
  expanded = expanded.replace(/<!-- component:settings-dialog-end:([\w-]+) -->/g, (_, prefix) => renderSettingsDialogEnd(prefix));
  return expanded;
}

async function copyEntry(source, destination) {
  await cp(source, destination, {
    recursive: true,
    filter: sourcePath => {
      const relative = path.relative(publicDir, sourcePath);
      const isProjectPng = relative.startsWith(path.join('main', 'images', 'projects') + path.sep)
        && path.extname(relative).toLowerCase() === '.png';
      return !isProjectPng;
    },
  });
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
  const pageSources = await loadPageSources();
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
    html: expandPage(await readFile(path.join(htmlDir, entry.name), 'utf8'), entry.name, pageSources),
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
