import { defineRouteMiddleware } from '@astrojs/starlight/route-data';

export const onRequest = defineRouteMiddleware(({ locals, url }) => {
  const { pagination } = locals.starlightRoute;
  const inDocs = url.pathname.startsWith('/docs/');
  const keep = (link: typeof pagination.prev) =>
    inDocs && link?.href.startsWith('/docs/') ? link : undefined;
  pagination.prev = keep(pagination.prev);
  pagination.next = keep(pagination.next);
});
