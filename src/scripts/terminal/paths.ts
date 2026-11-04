import { pageRoutes } from '../../data/navigation';

export const rootPath = '~/terminal';
const DOCS_ROOT_PATH = `${rootPath}/docs`;

const NAV_MAP: Record<string, string> = Object.fromEntries(
  pageRoutes.map((route) => [route.slug, route.path]),
);
const rootDirectories = [
  ...pageRoutes
    .filter((route) => route.slug !== 'terminal')
    .map((route) => route.slug),
  'docs',
];

const normalizePath = (input: string) =>
  (input || '').replace(/\\/g, '/').trim();
const trimSlashes = (value: string) => (value || '').replace(/^\/+|\/+$/g, '');

export const formatDisplayPath = (path: string) => {
  if (path === rootPath) return rootPath;
  if (path === DOCS_ROOT_PATH) return '~/docs';
  if (String(path || '').startsWith(`${DOCS_ROOT_PATH}/`)) {
    return String(path).replace(`${DOCS_ROOT_PATH}/`, '~/docs/');
  }
  if (String(path || '').startsWith(`${rootPath}/`)) {
    return String(path).replace(`${rootPath}/`, '~/');
  }
  return path;
};

export const resolvePath = (input: string, currentPath: string) => {
  if (!input) return rootPath;
  let raw = normalizePath(input);
  if (!raw || raw === '~' || raw === '/' || raw === rootPath) return rootPath;
  if (raw === '.' || raw === './' || raw === '.\\') return currentPath;
  if (raw === '..' || raw.startsWith('../')) return rootPath;
  if (raw.startsWith('~/')) raw = raw.slice(2);
  if (raw.startsWith(`${rootPath}/`)) raw = raw.slice(rootPath.length + 1);
  if (raw.startsWith('./')) raw = raw.slice(2);
  if (raw === 'terminal') return rootPath;
  if (raw.startsWith('terminal/')) raw = raw.slice(9);
  raw = raw.replace(/^\/+/, '');

  const segments = raw.split('/').filter(Boolean);
  if (!segments.length) return rootPath;
  if (segments[0] === 'terminal') return rootPath;

  if (segments[0] === 'docs') {
    const docsTail = trimSlashes(segments.slice(1).join('/'));
    return docsTail ? `${DOCS_ROOT_PATH}/${docsTail}` : DOCS_ROOT_PATH;
  }

  if (segments.length === 1 && rootDirectories.includes(segments[0])) {
    return `${rootPath}/${segments[0]}`;
  }
  return null;
};

export const listDirs = (currentPath: string) => {
  if (currentPath === rootPath) {
    return rootDirectories;
  }
  return ['..'];
};

export const getNavigationTarget = (nextPath: string, pathname: string) => {
  if (
    nextPath === DOCS_ROOT_PATH ||
    nextPath.startsWith(`${DOCS_ROOT_PATH}/`)
  ) {
    const docsRelative =
      nextPath === DOCS_ROOT_PATH
        ? ''
        : nextPath.slice(DOCS_ROOT_PATH.length + 1);
    const cleanRelative = trimSlashes(docsRelative);
    const target = cleanRelative ? `/docs/${cleanRelative}/` : '/docs/';
    const currentPathname = pathname || '/';
    const normalizedCurrent = currentPathname.endsWith('/')
      ? currentPathname
      : `${currentPathname}/`;
    return normalizedCurrent === target ? null : target;
  }

  const segment =
    nextPath === rootPath
      ? 'terminal'
      : nextPath.slice(nextPath.lastIndexOf('/') + 1);
  const target = NAV_MAP[segment];
  if (!target) return null;
  const trim = (value: string) => value.replace(/\/+$/g, '') || '/';
  return trim(pathname) === trim(target) ? null : target;
};
