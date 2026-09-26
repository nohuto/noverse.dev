import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import type { MarkdownHeading } from 'astro';
import type { StarlightRouteData } from '@astrojs/starlight/route-data';

type TocItem = NonNullable<StarlightRouteData['toc']>['items'][number];

const minHeadingLevel = 2;
const maxHeadingLevel = 6;

export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;
  if (!route.toc) return;

  route.toc.minHeadingLevel = minHeadingLevel;
  route.toc.maxHeadingLevel = maxHeadingLevel;
  route.toc.items = generateToC(
    route.headings,
    route.toc.items[0]?.text || 'Overview',
  );
});

function generateToC(headings: MarkdownHeading[], title: string): TocItem[] {
  const toc: TocItem[] = [
    { depth: 2, slug: '_top', text: title, children: [] },
  ];
  for (const heading of headings) {
    if (heading.depth >= minHeadingLevel && heading.depth <= maxHeadingLevel) {
      injectChild(toc, { ...heading, children: [] });
    }
  }
  return toc;
}

function injectChild(items: TocItem[], item: TocItem): void {
  const lastItem = items.at(-1);
  if (!lastItem || lastItem.depth >= item.depth) {
    items.push(item);
  } else {
    injectChild(lastItem.children, item);
  }
}
