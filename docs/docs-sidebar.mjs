import { CATEGORY_LABELS, WIN_CONFIG_CATEGORIES, getDirectoryLabel } from './docs-constants.mjs';

const sidebarRepos = ['win-config', 'windbg-notes', 'regkit', 'app-guides'];
const expandedSidebarRepos = new Set(['win-config', 'windbg-notes', 'regkit']);

function collapsedIfNeeded(repoName) {
  return expandedSidebarRepos.has(repoName) ? {} : { collapsed: true };
}

function createSidebarDirectory(directory) {
  return {
    label: getDirectoryLabel(directory),
    collapsed: true,
    autogenerate: { directory, collapsed: true },
  };
}

function createSidebarGroup(directory, items) {
  return {
    label: getDirectoryLabel(directory),
    collapsed: true,
    items,
  };
}

function createSidebarRepoEntry(repoName) {
  if (repoName === 'win-config') {
    return {
      label: repoName,
      ...collapsedIfNeeded(repoName),
      items: WIN_CONFIG_CATEGORIES.map((category) => ({
        label: CATEGORY_LABELS[category] || category,
        collapsed: true,
        autogenerate: { directory: `win-config/${category}`, collapsed: true },
      })),
    };
  }

  if (repoName === 'windbg-notes') {
    return {
      label: repoName,
      ...collapsedIfNeeded(repoName),
      items: [
        createSidebarDirectory('windbg-notes/windbg-init'),
        createSidebarDirectory('windbg-notes/symbols'),
        createSidebarGroup('windbg-notes/threads', [
          createSidebarDirectory('windbg-notes/threads/thread-internals'),
          createSidebarDirectory('windbg-notes/threads/examining-thread-activity'),
          createSidebarDirectory('windbg-notes/threads/thread-scheduling'),
        ]),
        createSidebarGroup('windbg-notes/system-mechanisms', [
          createSidebarDirectory('windbg-notes/system-mechanisms/processor-execution-model'),
          createSidebarDirectory('windbg-notes/system-mechanisms/trap-dispatching'),
          createSidebarDirectory('windbg-notes/system-mechanisms/software-interrupts'),
        ]),
        { label: 'Cheat Sheet', slug: 'windbg-notes/cheat-sheet' },
      ],
    };
  }

  if (repoName === 'regkit') {
    return {
      label: repoName,
      ...collapsedIfNeeded(repoName),
      items: [
        { label: 'Overview', slug: 'regkit/overview' },
        createSidebarGroup('regkit/registry-internals', [
          { label: 'Registry Fundamentals', slug: 'regkit/registry-internals/registry-fundamentals' },
          { label: 'Capture Table', slug: 'regkit/registry-internals/capture-table' },
        ]),
        createSidebarGroup('regkit/guides', [
          { label: 'Capturing Registry Activity', slug: 'regkit/guides/procmon' },
          { label: 'Boot Registry Activity', slug: 'regkit/guides/wpr-wpa' },
        ]),
      ],
    };
  }

  return {
    label: repoName,
    ...collapsedIfNeeded(repoName),
    autogenerate: { directory: repoName, collapsed: true },
  };
}

export const docsSidebar = sidebarRepos.map(createSidebarRepoEntry);
