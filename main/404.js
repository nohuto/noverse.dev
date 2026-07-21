/* Copyright (c) 2026 Nohuto */
(() => {
  const ACTIVE_PAGE_PATH_KEY = 'nv-active-page-path';
  const NOT_FOUND_PATH_KEY = 'nv-not-found-path';
  const MAIN_PAGE_ROUTES = new Set(['/', '/terminal', '/product', '/projects', '/diff', '/policies']);
  const getRoute = pathname => {
    const path = String(pathname || '/');
    let normalized = path === '/' ? '/' : `/${path.replace(/^\/+|\/+$/g, '')}`.toLowerCase();
    if (normalized === '/index.html') normalized = '/';
    else if (normalized.endsWith('.html')) normalized = normalized.slice(0, -5);
    return MAIN_PAGE_ROUTES.has(normalized) ? normalized : null;
  };
  const requestedPath = `${location.pathname}${location.search}${location.hash}`;
  let fallbackPath = '/';

  try {
    sessionStorage.setItem(NOT_FOUND_PATH_KEY, requestedPath);
    const activePath = sessionStorage.getItem(ACTIVE_PAGE_PATH_KEY);
    const activeRoute = getRoute(activePath);
    if (activeRoute) fallbackPath = activeRoute;
  } catch { }

  location.replace(fallbackPath);
})();
