import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  CATEGORY_LABELS,
  WIN_CONFIG_CATEGORIES,
  getDirectoryLabel,
  toTitleCase,
} from '../docs-constants.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DOCS_DIR = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(DOCS_DIR, 'src', 'content', 'docs');

const INCLUDED_WIN_CONFIG_CATEGORIES = new Set(WIN_CONFIG_CATEGORIES);

const REPOSITORIES = [
  {
    name: 'win-config',
    url: repoUrl('WIN_CONFIG_REPO_URL', 'https://github.com/nohuto/win-config'),
    type: 'win-config',
  },
  {
    name: 'windbg-notes',
    url: repoUrl('WINDBG_NOTES_REPO_URL', 'https://github.com/nohuto/windbg-notes'),
    files: [
      'windbg-init/loading-modules.md',
      'windbg-init/noisy-symbol-loading.md',
      'windbg-init/symbol-server.md',
      'symbols/reading-symbols.md',
      'symbols/rva-driverstart.md',
      'threads/thread-internals/data-structures.md',
      'threads/thread-internals/thread-addresses.md',
      'threads/examining-thread-activity/thread-activity.md',
      'threads/thread-scheduling/thread-states.md',
      'threads/thread-scheduling/priority-levels.md',
      'threads/thread-scheduling/context-switching.md',
      'system-mechanisms/processor-execution-model/processor-control-region.md',
      'system-mechanisms/trap-dispatching/interrupt-dispatching.md',
      'system-mechanisms/trap-dispatching/interrupt-request-levels.md',
      'system-mechanisms/software-interrupts/deferred-procedure-calls.md',
      'cheat-sheet.md',
    ],
  },
  {
    name: 'regkit',
    url: repoUrl('REGKIT_REPO_URL', 'https://github.com/nohuto/regkit'),
    readmeOverview: true,
    sidebarOrderStart: 2,
    files: ['guides/procmon.md', 'guides/wpr-wpa.md'],
  },
  {
    name: 'app-guides',
    url: repoUrl('APP_GUIDES_REPO_URL', 'https://github.com/nohuto/app-guides'),
    files: [
      'mullvad-desktop.md',
      'brave-desktop.md',
      'brave-ios.md',
      'discord.md',
      'lghub.md',
      'spotify.md',
      'steam.md',
      'steelseries.md',
      'vsc.md',
      'extensions.md',
      'search-engine.md',
    ],
    titleOverrides: {
      'mullvad-desktop.md': 'Mullvad',
      'brave-desktop.md': 'Brave (Desktop)',
      'brave-ios.md': 'Brave (iOS)',
      'discord.md': 'Discord',
      'lghub.md': 'LGHUB',
      'spotify.md': 'Spotify',
      'steam.md': 'Steam',
      'steelseries.md': 'SteelSeries',
      'vsc.md': 'VSC',
      'extensions.md': 'Browser Extensions',
      'search-engine.md': 'Search Engines',
    },
  },
];

const DOC_REPO_ORDER = REPOSITORIES.map((repo) => repo.name);
const MARKDOWN_IMAGE_RE = /!\[([^\]\r\n]*)\]\((https?:\/\/[^\s)\r\n]+)\)/gi;
const IMAGE_METADATA_CONCURRENCY = 12;
const IMAGE_FETCH_TIMEOUT_MS = 15_000;
const KNOWN_REMOTE_IMAGE_DIMENSIONS = new Map([
  ['https://github.com/MicrosoftDocs/windowsserverdocs/blob/main/WindowsServerDocs/networking/media/ncsi/ncsi-overview/ncsi-icon-connected-wired.jpg?raw=true', { width: 24, height: 24 }],
  ['https://github.com/MicrosoftDocs/windowsserverdocs/blob/main/WindowsServerDocs/networking/media/ncsi/ncsi-overview/ncsi-icon-connected-wireless.jpg?raw=true', { width: 24, height: 24 }],
  ['https://github.com/MicrosoftDocs/windowsserverdocs/blob/main/WindowsServerDocs/networking/media/ncsi/ncsi-overview/ncsi-icon-connected-no-internet.jpg?raw=true', { width: 24, height: 24 }],
  ['https://github.com/nohuto/gpu-oc-uv/blob/main/images/hwinfo-powerlimit.png?raw=true', { width: 664, height: 134 }],
  ['https://github.com/nohuto/gpu-oc-uv/blob/main/images/fancurve.png?raw=true', { width: 1141, height: 753 }],
  ['https://github.com/nohuto/gpu-oc-uv/blob/main/images/MSIAfterburner-limits.png?raw=true', { width: 784, height: 540 }],
  ['https://github.com/nohuto/gpu-oc-uv/blob/main/images/occt.png?raw=true', { width: 1521, height: 750 }],
  ['https://github.com/nohuto/gpu-oc-uv/blob/main/images/oc.png?raw=true', { width: 1543, height: 543 }],
  ['https://github.com/nohuto/gpu-oc-uv/blob/main/images/uv-curve.png?raw=true', { width: 766, height: 529 }],
  ['https://www.techjunkie.com/wp-content/uploads/2018/10/windows-aero-shake-example.gif', { width: 640, height: 359 }],
]);
const MOVED_IMAGE_URLS = new Map([
  ['https://github.com/nohuto/regkit/blob/main/images/guide/images.png', 'https://github.com/nohuto/regkit/blob/main/guides/images/pmsave.png?raw=true'],
  ['https://github.com/nohuto/regkit/blob/main/guide/images/WPRUI.png?raw=true', 'https://github.com/nohuto/regkit/blob/main/guides/images/WPRUI.png?raw=true'],
  ['https://github.com/nohuto/regkit/blob/main/guide/images/WPA.png?raw=true', 'https://github.com/nohuto/regkit/blob/main/guides/images/WPA.png?raw=true'],
  ['https://github.com/nohuto/win-config/blob/main/system/images/cameraosd.png?raw=true', 'https://github.com/nohuto/win-config/blob/main/security/images/cameraosd.png?raw=true'],
  ['https://github.com/nohuto/windbg-notes/blob/main/assets/irql-levels.png?raw=true', 'https://github.com/nohuto/windbg-notes/blob/main/images/irql-levels.png?raw=true'],
]);

const entries = [];

await main();

async function main() {
  const repoDirs = new Map(REPOSITORIES.map((repo) => {
    const repoDir = resolveRepoDirectory(repo.name, repo.url);
    assertDirectory(repoDir, repo.name);
    return [repo.name, repoDir];
  }));

  resetContentDir();
  generateRootOverview();

  const repoStats = REPOSITORIES.map((repo) => {
    const repoDir = repoDirs.get(repo.name);
    if (repo.type === 'win-config') {
      return `${repo.name} options: ${generateWinConfig(repoDir).optionPages}`;
    }

    let pages = repo.readmeOverview ? generateReadmeOverview(repo, repoDir) : 0;
    pages += generateMarkdownFiles(repo, repoDir);
    return `${repo.name} pages: ${pages}`;
  });
  const sectionIndexPages = generateSectionIndexes();

  const imageStats = await normalizeGeneratedEntries(repoDirs);
  writeEntries();

  console.log(
    `[sync-docs] Generated ${entries.length} pages (` +
    `${repoStats.join(', ')}, section indexes: ${sectionIndexPages}, ` +
    `dimensioned images: ${imageStats.dimensioned}/${imageStats.total}).`
  );
}

function generateRootOverview() {
  const repoNames = [...DOC_REPO_ORDER];

  addEntry({
    relativePath: 'index.md',
    route: '/docs/',
    title: 'Overview',
    description:
      `Documentation generated from ${repoNames.join(', ')}.`,
    sidebarHidden: true,
    body: repoNames.map((repoName) => `- [${repoName}](/docs/${repoName}/)`).join('\n'),
  });
}

function trimRepoUrl(url) {
  return url.replace(/\/+$/, '');
}

function repoUrl(envName, fallback) {
  return trimRepoUrl(process.env[envName] || fallback);
}

function assertDirectory(dirPath, label) {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    throw new Error(`Missing repository path for ${label}: ${dirPath}`);
  }
}

function resetContentDir() {
  fs.rmSync(CONTENT_DIR, { recursive: true, force: true });
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
}

function generateWinConfig(winConfigDir) {
  const descFiles = findDescFiles(winConfigDir);
  const sorted = sortCategories(descFiles);

  let optionPages = 0;

  for (const { category, filePath } of sorted) {
    if (!INCLUDED_WIN_CONFIG_CATEGORIES.has(category)) continue;

    const categoryLabel = CATEGORY_LABELS[category] || toTitleCase(category);

    const raw = readText(filePath);
    const sections = splitByHeadingLevel(raw, 1).filter((section) => section.heading);

    if (sections.length === 0) {
      continue;
    }

    const sectionSlugSet = new Set();
    for (let index = 0; index < sections.length; index += 1) {
      const section = sections[index];
      const routeSlug = uniqueSlug(slugify(section.heading), sectionSlugSet);
      const route = `/docs/win-config/${category}/${routeSlug}/`;
      const title = normalizeWinConfigTitle(section.heading);

      optionPages += 1;

      addEntry({
        relativePath: `win-config/${category}/${routeSlug}.md`,
        route,
        title,
        description: `${categoryLabel} option documentation from win-config.`,
        sidebarOrder: index + 1,
        body: section.lines.join('\n').trim(),
      });
    }
  }

  return { optionPages };
}
function resolveRepoDirectory(repoName, repoUrl) {
  const candidatePaths = [
    path.resolve(DOCS_DIR, '..', repoName),
    path.resolve(DOCS_DIR, '..', 'sources', repoName),
    path.resolve(DOCS_DIR, '..', '..', repoName),
    path.resolve(DOCS_DIR, '..', '..', 'tools', repoName),
    path.resolve(DOCS_DIR, '..', '..', '..', repoName),
    path.resolve(DOCS_DIR, '..', '_tmp_repos', repoName),
    path.resolve(DOCS_DIR, '..', '..', '_tmp_repos', repoName),
    path.resolve(DOCS_DIR, '..', '..', '..', '_tmp_repos', repoName),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return candidate;
  }

  const cacheDir = path.join(DOCS_DIR, '.cache', 'repos', repoName);
  if (fs.existsSync(cacheDir) && fs.statSync(cacheDir).isDirectory()) {
    refreshRepoCache(cacheDir);
    return cacheDir;
  }

  try {
    const normalizedRepoUrl = (repoUrl || '').replace(/\/+$/, '');
    if (!normalizedRepoUrl) return '';

    fs.mkdirSync(path.dirname(cacheDir), { recursive: true });
    const cloneUrl = normalizedRepoUrl.endsWith('.git') ? normalizedRepoUrl : `${normalizedRepoUrl}.git`;
    execFileSync('git', ['clone', '--depth', '1', cloneUrl, cacheDir], {
      stdio: 'pipe',
      cwd: DOCS_DIR,
    });
    return cacheDir;
  } catch {
    return '';
  }
}

function refreshRepoCache(cacheDir) {
  try {
    execFileSync('git', ['reset', '--hard', 'HEAD'], { cwd: cacheDir, stdio: 'pipe' });
    execFileSync('git', ['fetch', '--depth', '1', 'origin', 'main'], {
      cwd: cacheDir,
      stdio: 'pipe',
    });
    execFileSync('git', ['reset', '--hard', 'FETCH_HEAD'], { cwd: cacheDir, stdio: 'pipe' });
  } catch { }
}

function generateReadmeOverview(repo, repoDir) {
  const readmePath = path.join(repoDir, 'README.md');
  if (!fs.existsSync(readmePath)) return 0;

  const raw = readText(readmePath);
  const titleMatch = raw.match(/^#\s+(.+)$/m);
  const readmeTitle = titleMatch ? titleMatch[1].trim() : toTitleCase(repo.name);
  const body = stripFirstH1(raw).trim();

  if (!body) {
    return 0;
  }

  addEntry({
    relativePath: `${repo.name}/overview.md`,
    route: `/docs/${repo.name}/overview/`,
    title: 'Overview',
    description: `${readmeTitle} overview generated from README.`,
    sidebarOrder: 1,
    body,
  });

  return 1;
}

function generateMarkdownFiles(repo, repoDir) {
  const titleOverrides = repo.titleOverrides || {};
  const sidebarOrderStart = repo.sidebarOrderStart || 1;

  for (let index = 0; index < repo.files.length; index += 1) {
    const sourcePath = repo.files[index];
    const filePath = path.join(repoDir, ...sourcePath.split('/'));
    if (!fs.existsSync(filePath)) {
      throw new Error(`${repo.name} is missing configured Markdown file: ${sourcePath}`);
    }

    const raw = readText(filePath);
    const titleMatch = raw.match(/^#\s+(.+)$/m);
    const title = titleOverrides[sourcePath.toLowerCase()] || (titleMatch
      ? titleMatch[1].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim()
      : toTitleCase(path.posix.basename(sourcePath, '.md')));
    const body = rewriteRelativeMarkdownLinks(stripFirstH1(raw).trim(), repo.name, sourcePath);
    const outputPath = markdownOutputPath(sourcePath);
    const displaySourcePath = sourcePath.includes('/') ? sourcePath : `./${sourcePath}`;

    addEntry({
      relativePath: `${repo.name}/${outputPath}.md`,
      route: `/docs/${repo.name}/${outputPath}/`,
      title,
      description: `Generated from ${repo.name} file: ${displaySourcePath}.`,
      sidebarOrder: sidebarOrderStart + index,
      body,
    });
  }

  return repo.files.length;
}

function rewriteRelativeMarkdownLinks(markdown, repoName, sourcePath) {
  return markdown.replace(/\]\((?![a-z]+:|\/|#)([^)\s]+\.md)(#[^)]*)?\)/gi, (_, target, hash = '') => {
    const resolvedPath = path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), target));
    return `](/docs/${repoName}/${markdownOutputPath(resolvedPath)}/${hash})`;
  });
}

function markdownOutputPath(sourcePath) {
  return sourcePath
    .replace(/\.md$/i, '')
    .split('/')
    .map(slugify)
    .join('/');
}

function generateSectionIndexes() {
  const existingPaths = new Set(entries.map((entry) => entry.relativePath));
  const allDirectories = collectGeneratedDirectories(entries);
  const sortedDirectories = [...allDirectories].sort((a, b) => {
    const depthDiff = a.split('/').length - b.split('/').length;
    if (depthDiff !== 0) return depthDiff;
    return a.localeCompare(b);
  });

  let generated = 0;

  for (const directory of sortedDirectories) {
    const indexPath = `${directory}/index.md`;
    if (existingPaths.has(indexPath)) continue;

    const children = getDirectoryChildren(directory, allDirectories);
    if (children.length === 0) continue;

    const route = `/docs/${directory}/`;
    const title = 'Overview';
    const directoryLabel = getDirectoryLabel(directory);
    const body = buildDirectoryListingMarkdown(children);

    addEntry({
      relativePath: indexPath,
      route,
      title,
      description: `Auto-generated overview for ${directoryLabel}.`,
      sidebarOrder: getDirectorySidebarOrder(directory),
      sidebarHidden: true,
      body,
    });

    existingPaths.add(indexPath);
    generated += 1;

  }

  return generated;
}

async function normalizeGeneratedEntries(repoDirs) {
  for (const entry of entries) {
    entry.body = rewriteMovedImageUrls(
      rewriteRepoMentions(normalizeGeneratedMarkdown(entry.body))
    );
  }

  return addImageDimensions(repoDirs);
}

function rewriteMovedImageUrls(markdown) {
  for (const [oldUrl, currentUrl] of MOVED_IMAGE_URLS) {
    markdown = markdown.replaceAll(oldUrl, currentUrl);
  }

  return markdown;
}

async function addImageDimensions(repoDirs) {
  const imageUrls = new Set();

  for (const entry of entries) {
    for (const match of entry.body.matchAll(MARKDOWN_IMAGE_RE)) {
      imageUrls.add(match[2]);
    }
  }

  const sourceRepos = mapGithubRepositories(repoDirs);
  const dimensionsByUrl = new Map();
  const unresolvedUrls = [];

  await mapWithConcurrency([...imageUrls], IMAGE_METADATA_CONCURRENCY, async (imageUrl) => {
    const dimensions = await readImageDimensions(imageUrl, sourceRepos);
    if (dimensions) {
      dimensionsByUrl.set(imageUrl, dimensions);
    } else {
      unresolvedUrls.push(imageUrl);
    }
  });

  let total = 0;
  let dimensioned = 0;

  for (const entry of entries) {
    entry.body = entry.body.replace(MARKDOWN_IMAGE_RE, (match, alt, imageUrl) => {
      total += 1;
      const dimensions = dimensionsByUrl.get(imageUrl);
      if (!dimensions) return match;

      dimensioned += 1;
      return `<img src="${escapeHtmlAttribute(imageUrl)}" alt="${escapeHtmlAttribute(alt)}" ` +
        `width="${dimensions.width}" height="${dimensions.height}">`;
    });
  }

  if (unresolvedUrls.length > 0) {
    throw new Error(
      `[sync-docs] Missing intrinsic dimensions for ${unresolvedUrls.length} image URL(s):\n` +
      unresolvedUrls.map((url) => `  - ${url}`).join('\n')
    );
  }

  return { total, dimensioned };
}

function mapGithubRepositories(repoDirs) {
  const sourceRepos = new Map();

  for (const repo of REPOSITORIES) {
    try {
      const repoUrl = new URL(repo.url);
      if (repoUrl.hostname.toLowerCase() !== 'github.com') continue;

      const [owner, name] = repoUrl.pathname.split('/').filter(Boolean);
      if (!owner || !name) continue;

      sourceRepos.set(`${owner}/${name.replace(/\.git$/i, '')}`.toLowerCase(), repoDirs.get(repo.name));
    } catch { }
  }

  return sourceRepos;
}

async function readImageDimensions(imageUrl, sourceRepos) {
  const localPath = resolveLocalGithubImage(imageUrl, sourceRepos);
  const knownDimensions = KNOWN_REMOTE_IMAGE_DIMENSIONS.get(imageUrl) || null;

  try {
    if (localPath) return normalizeImageDimensions(await sharp(localPath).metadata());

    const response = await fetch(toRawImageUrl(imageUrl), {
      headers: { 'User-Agent': 'noverse-docs-sync' },
      redirect: 'follow',
      signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return knownDimensions;

    const image = Buffer.from(await response.arrayBuffer());
    return normalizeImageDimensions(await sharp(image).metadata()) || knownDimensions;
  } catch {
    return knownDimensions;
  }
}

function resolveLocalGithubImage(imageUrl, sourceRepos) {
  try {
    const url = new URL(imageUrl);
    const hostname = url.hostname.toLowerCase();
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    let owner;
    let repo;
    let imageParts;

    if (hostname === 'github.com' && parts[2] === 'blob' && parts.length >= 5) {
      [owner, repo] = parts;
      imageParts = parts.slice(4);
    } else if (hostname === 'raw.githubusercontent.com' && parts.length >= 4) {
      [owner, repo] = parts;
      imageParts = parts.slice(3);
    } else {
      return null;
    }

    const repoDir = sourceRepos.get(`${owner}/${repo}`.toLowerCase());
    if (!repoDir) return null;

    const imagePath = path.resolve(repoDir, ...imageParts);
    const relativePath = path.relative(repoDir, imagePath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) return null;
    if (!fs.existsSync(imagePath) || !fs.statSync(imagePath).isFile()) return null;

    return imagePath;
  } catch {
    return null;
  }
}

function toRawImageUrl(imageUrl) {
  try {
    const url = new URL(imageUrl);
    const parts = url.pathname.split('/').filter(Boolean);
    if (url.hostname.toLowerCase() !== 'github.com' || parts[2] !== 'blob' || parts.length < 5) {
      return imageUrl;
    }

    const [owner, repo, , ref, ...imageParts] = parts;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${imageParts.join('/')}`;
  } catch {
    return imageUrl;
  }
}

function normalizeImageDimensions(metadata) {
  if (!Number.isInteger(metadata.width) || !Number.isInteger(metadata.height)) return null;

  const rotated = metadata.orientation >= 5 && metadata.orientation <= 8;
  return rotated
    ? { width: metadata.height, height: metadata.width }
    : { width: metadata.width, height: metadata.height };
}

async function mapWithConcurrency(items, concurrency, callback) {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      await callback(item);
    }
  });

  await Promise.all(workers);
}

function escapeHtmlAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function rewriteRepoMentions(markdown) {
  return markdown.replace(/See\s+[a-z]+(?:-[a-z]+)+ repo(?=\s+for a list of)/gi, 'See regkit repo');
}

function normalizeGeneratedMarkdown(markdown) {
  return markdown
    .replace(/https:\/\/www\.noverse\.dev\/docs\/nvapi-cli\/sections\/overview\/?/g, 'https://github.com/nohuto/nvapi-cli')
    .replace(/https?:\/\/(?:www\.)?noverse\.dev\/docs\/app-guides\/docs\/guides\/([^)/#?]+)\/?/g, '/docs/app-guides/$1/')
    .replace(/https?:\/\/(?:www\.)?noverse\.dev\/docs\/app-guides\/docs\/([^)/#?]+)\/?/g, '/docs/app-guides/$1/')
    .replace(/https?:\/\/(?:www\.)?noverse\.dev\/docs\/app-guides\/docs\/?/g, '/docs/app-guides/')
    .replace(/https:\/\/www\.noverse\.dev\/(product|projects|diff|policies)\.html/g, 'https://www.noverse.dev/$1')
    .replace(/\]\(\((https?:\/\/[^)\s]+)\)\)/gi, ']($1)')
    .replace(/\[([^\]]+)\]\(\[([^\]]+)\]\(([^)]+)\)\)/g, '[$1]($3)');
}

function collectGeneratedDirectories(allEntries) {
  const directories = new Set();

  for (const entry of allEntries) {
    let dir = path.posix.dirname(entry.relativePath);
    while (dir && dir !== '.') {
      directories.add(dir);
      dir = path.posix.dirname(dir);
    }
  }

  return directories;
}

function getDirectoryChildren(directory, allDirectories) {
  const directPages = entries
    .filter((entry) => path.posix.dirname(entry.relativePath) === directory)
    .filter((entry) => path.posix.basename(entry.relativePath).toLowerCase() !== 'index.md')
    .map((entry) => ({
      type: 'page',
      label: entry.title,
      href: entry.route,
      order: Number.isInteger(entry.sidebarOrder) ? entry.sidebarOrder : Number.MAX_SAFE_INTEGER,
    }));

  const childDirectoryNames = new Set();
  const prefix = `${directory}/`;
  for (const candidate of allDirectories) {
    if (!candidate.startsWith(prefix)) continue;
    const remainder = candidate.slice(prefix.length);
    if (!remainder || remainder.includes('/')) continue;
    childDirectoryNames.add(remainder);
  }

  const directDirectories = [...childDirectoryNames].map((child) => ({
    type: 'directory',
    segment: child,
    label: getDirectoryLabel(`${directory}/${child}`),
    href: `/docs/${directory}/${child}/`,
    order: getDirectorySidebarOrder(`${directory}/${child}`),
  }));

  const merged = [...directDirectories, ...directPages];
  merged.sort((a, b) => sortDirectoryChild(directory, a, b));
  return merged;
}

function sortDirectoryChild(parentDirectory, a, b) {
  if (a.order !== b.order) return a.order - b.order;
  if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;

  if (a.type === 'directory' && b.type === 'directory') {
    if (parentDirectory === 'win-config') {
      const aRank = categorySortRank(a.segment);
      const bRank = categorySortRank(b.segment);
      if (aRank !== bRank) return aRank - bRank;
    }

    return a.label.localeCompare(b.label);
  }

  return a.label.localeCompare(b.label);
}

function getDirectorySidebarOrder(directory) {
  const explicitOrder = getExplicitDirectorySidebarOrder(directory);
  if (Number.isInteger(explicitOrder)) {
    return explicitOrder;
  }

  const prefix = `${directory}/`;
  let minOrder = Number.MAX_SAFE_INTEGER;

  for (const entry of entries) {
    if (!entry.relativePath.startsWith(prefix)) continue;
    if (path.posix.basename(entry.relativePath).toLowerCase() === 'index.md') continue;
    if (!Number.isInteger(entry.sidebarOrder)) continue;
    if (entry.sidebarOrder < minOrder) minOrder = entry.sidebarOrder;
  }

  return minOrder === Number.MAX_SAFE_INTEGER ? 0 : minOrder;
}

function getExplicitDirectorySidebarOrder(directory) {
  const winConfigCategoryMatch = directory.match(/^win-config\/([^/]+)$/);
  if (winConfigCategoryMatch) {
    const rank = categorySortRank(winConfigCategoryMatch[1]);
    if (rank !== Number.MAX_SAFE_INTEGER) {
      return rank + 1;
    }
  }

  return null;
}

function categorySortRank(segment) {
  const rank = WIN_CONFIG_CATEGORIES.indexOf(segment);
  return rank === -1 ? Number.MAX_SAFE_INTEGER : rank;
}

function buildDirectoryListingMarkdown(children) {
  const lines = [];

  for (const child of children) {
    lines.push(`- [${child.label}](${child.href})`);
  }

  return lines.join('\n');
}

function addEntry({ relativePath, route, title, description, sidebarOrder, sidebarHidden, body }) {
  entries.push({
    relativePath,
    route,
    title,
    description,
    sidebarOrder,
    sidebarHidden: Boolean(sidebarHidden),
    body: body || '',
  });
}

function writeEntries() {
  const pathSet = new Set();
  const routeSet = new Set();

  const sorted = [...entries].sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  for (const entry of sorted) {
    if (pathSet.has(entry.relativePath)) {
      throw new Error(`Duplicate generated path: ${entry.relativePath}`);
    }
    if (routeSet.has(entry.route)) {
      throw new Error(`Duplicate generated route: ${entry.route}`);
    }
    pathSet.add(entry.relativePath);
    routeSet.add(entry.route);

    const targetPath = path.join(CONTENT_DIR, entry.relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, buildMarkdown(entry), 'utf8');
  }
}

function buildMarkdown(entry) {
  const lines = [
    '---',
    `title: ${yamlString(entry.title)}`,
    `description: ${yamlString(entry.description)}`,
    'editUrl: false',
  ];

  if (entry.sidebarHidden || Number.isInteger(entry.sidebarOrder)) {
    lines.push('sidebar:');
    if (entry.sidebarHidden) {
      lines.push('  hidden: true');
    }
    if (Number.isInteger(entry.sidebarOrder)) {
      lines.push(`  order: ${entry.sidebarOrder}`);
    }
  }

  lines.push('---');
  lines.push('');

  const body = entry.body.trimEnd();
  if (body.length > 0) {
    lines.push(body);
  }

  lines.push('');
  return lines.join('\n');
}

function yamlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function findDescFiles(rootDir) {
  const out = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    const dirents = fs.readdirSync(current, { withFileTypes: true });

    for (const dirent of dirents) {
      const fullPath = path.join(current, dirent.name);
      if (dirent.isDirectory()) {
        if (dirent.name === '.git' || dirent.name === 'node_modules') continue;
        stack.push(fullPath);
      } else if (dirent.isFile() && dirent.name.toLowerCase() === 'desc.md') {
        const category = path.basename(path.dirname(fullPath)).toLowerCase();
        out.push({ category, filePath: fullPath });
      }
    }
  }

  return out;
}

function sortCategories(items) {
  const order = new Map(WIN_CONFIG_CATEGORIES.map((name, index) => [name, index]));

  return [...items].sort((a, b) => {
    const aRank = order.has(a.category) ? order.get(a.category) : Number.MAX_SAFE_INTEGER;
    const bRank = order.has(b.category) ? order.get(b.category) : Number.MAX_SAFE_INTEGER;

    if (aRank !== bRank) return aRank - bRank;
    return a.category.localeCompare(b.category);
  });
}

function splitByHeadingLevel(markdown, level) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const sections = [];
  const headingPrefix = '#'.repeat(level);
  const headingRegex = new RegExp(`^${headingPrefix}\\s+(.+?)\\s*$`);

  let inFence = false;
  let fenceChar = '';
  let current = { heading: null, lines: [] };

  for (const line of lines) {
    const fenceMatch = line.match(/^\s*(```|~~~)/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!inFence) {
        inFence = true;
        fenceChar = marker;
      } else if (marker === fenceChar) {
        inFence = false;
        fenceChar = '';
      }
    }

    const headingMatch = !inFence ? line.match(headingRegex) : null;
    if (headingMatch) {
      if (current.heading !== null || current.lines.length > 0) {
        sections.push(current);
      }

      current = { heading: headingMatch[1].trim(), lines: [] };
      continue;
    }

    current.lines.push(line);
  }

  if (current.heading !== null || current.lines.length > 0) {
    sections.push(current);
  }

  return sections;
}

function slugify(input) {
  const slug = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

  return slug || 'section';
}

function uniqueSlug(baseSlug, set) {
  let slug = baseSlug || 'section';
  let counter = 2;

  while (set.has(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  set.add(slug);
  return slug;
}

function stripFirstH1(markdown) {
  return markdown.replace(/^(?:\uFEFF)?#\s+.+\n?/m, '').trimStart();
}

function normalizeWinConfigTitle(value) {
  const cleaned = value
    .replace(/^\s*(enable|disable)\s+/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned || value.trim();
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}
