export function withZenMode(href: string, current: URL): string {
  let target: URL;
  try {
    target = new URL(href, current);
  } catch {
    return href;
  }
  if (
    target.origin !== current.origin ||
    target.pathname === '/' ||
    /\.[^/]+$/.test(target.pathname)
  )
    return href;
  if (current.searchParams.get('view') === 'zen')
    target.searchParams.set('view', 'zen');
  else if (target.searchParams.get('view') === 'zen')
    target.searchParams.delete('view');
  else return href;
  return `${target.pathname}${target.search}${target.hash}`;
}
