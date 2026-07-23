import { defineRouteMiddleware } from '@astrojs/starlight/route-data';

const minHeadingLevel = 2;
const maxHeadingLevel = 6;

export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;
  if (!route.toc) return;

  route.toc.minHeadingLevel = minHeadingLevel;
  route.toc.maxHeadingLevel = maxHeadingLevel;
  route.toc.items = generateToC(route.headings, route.toc.items[0]?.text || 'Overview');
});

function generateToC(headings, title) {
  const toc = [{ depth: 2, slug: '_top', text: title, children: [] }];
  for (const heading of headings) {
    if (heading.depth >= minHeadingLevel && heading.depth <= maxHeadingLevel) {
      injectChild(toc, { ...heading, children: [] });
    }
  }
  return toc;
}

function injectChild(items, item) {
  const lastItem = items.at(-1);
  if (!lastItem || lastItem.depth >= item.depth) {
    items.push(item);
  } else {
    injectChild(lastItem.children, item);
  }
}
