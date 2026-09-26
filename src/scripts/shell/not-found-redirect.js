/* Copyright (c) 2026 nohuto */
(() => {
  const ACTIVE_PAGE_KEY = 'nv-active-page-path';
  const NOT_FOUND_KEY = 'nv-not-found-path';
  const routes = new Set(['/', '/terminal', '/product', '/projects', '/diff', '/policies']);
  const normalizeRoute = pathname => {
    let route = `/${String(pathname || '').replace(/^\/+|\/+$/g, '')}`.toLowerCase();
    if (route === '/index.html') route = '/';
    else if (route.endsWith('.html')) route = route.slice(0, -5);
    return routes.has(route) ? route : null;
  };

  let fallback = '/';
  try {
    sessionStorage.setItem(NOT_FOUND_KEY, `${location.pathname}${location.search}${location.hash}`);
    fallback = normalizeRoute(sessionStorage.getItem(ACTIVE_PAGE_KEY)) || fallback;
  } catch { }
  location.replace(fallback);
})();
