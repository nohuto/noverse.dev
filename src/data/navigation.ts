export const mainRoutes = [
  { page: 'index', path: '/', label: 'home' },
  { page: 'product', path: '/product', label: 'product' },
  { page: 'projects', path: '/projects', label: 'projects' },
  { page: 'diff', path: '/diff', label: 'diff' },
  { page: 'policies', path: '/policies', label: 'policies' },
] as const;

export const pageRoutes = [
  { slug: 'home', path: '/' },
  { slug: 'terminal', path: '/terminal' },
  { slug: 'product', path: '/product' },
  { slug: 'projects', path: '/projects' },
  { slug: 'diff', path: '/diff' },
  { slug: 'policies', path: '/policies' },
] as const;

export const ACTIVE_PAGE_KEY = 'nv-active-page-path';
export const NOT_FOUND_KEY = 'nv-not-found-path';
