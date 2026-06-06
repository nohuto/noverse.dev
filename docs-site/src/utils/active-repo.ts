type SidebarEntry = {
  type?: string;
  label?: string;
  href?: string;
  entries?: SidebarEntry[];
};

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function slugify(value: unknown) {
  return normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function hrefRootSegment(href: unknown) {
  const value = String(href || '');
  if (!value) return '';

  try {
    const url = new URL(value, 'https://example.invalid');
    const parts = url.pathname.split('/').filter(Boolean).map(normalize);
    return parts[0] === 'docs' && parts.length > 1 ? parts[1] : parts[0] || '';
  } catch {
    return '';
  }
}

function collectKnownRoots(entries: SidebarEntry[] = [], roots = new Set<string>()) {
  entries.forEach((entry) => {
    if (entry.type === 'link') {
      const root = hrefRootSegment(entry.href);
      if (root) roots.add(root);
      return;
    }

    const labelRoot = slugify(entry.label);
    if (labelRoot) roots.add(labelRoot);
    collectKnownRoots(entry.entries || [], roots);
  });

  return roots;
}

export function getActiveRepo(routeId: unknown, sidebar: SidebarEntry[]) {
  const roots = collectKnownRoots(sidebar);
  const segments = String(routeId || '')
    .split('/')
    .filter(Boolean)
    .map(normalize)
    .filter((segment) => segment !== 'docs');

  if (segments.length === 0) return '';
  return segments.find((segment) => roots.has(segment)) || segments[0] || '';
}
