import {
  CATEGORY_LABELS,
  WIN_CONFIG_CATEGORIES,
  getDirectoryLabel,
} from './docs-constants.mjs';

export const sidebarRepos = [
  'win-config',
  'windbg-notes',
  'regkit',
  'app-guides',
];

function createSidebarDirectory(directory) {
  return {
    label: getDirectoryLabel(directory),
    collapsed: true,
    items: [{ autogenerate: { directory, collapsed: true } }],
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
      collapsed: true,
      items: WIN_CONFIG_CATEGORIES.map((category) => ({
        label: CATEGORY_LABELS[category] || category,
        collapsed: true,
        items: [
          {
            autogenerate: {
              directory: `win-config/${category}`,
              collapsed: true,
            },
          },
        ],
      })),
    };
  }

  if (repoName === 'windbg-notes') {
    return {
      label: repoName,
      collapsed: true,
      items: [
        createSidebarDirectory('windbg-notes/windbg-init'),
        createSidebarDirectory('windbg-notes/symbols'),
        createSidebarGroup('windbg-notes/threads', [
          createSidebarDirectory('windbg-notes/threads/thread-internals'),
          createSidebarDirectory(
            'windbg-notes/threads/examining-thread-activity',
          ),
          createSidebarDirectory('windbg-notes/threads/thread-scheduling'),
        ]),
        createSidebarGroup('windbg-notes/system-mechanisms', [
          createSidebarDirectory(
            'windbg-notes/system-mechanisms/processor-execution-model',
          ),
          createSidebarDirectory(
            'windbg-notes/system-mechanisms/trap-dispatching',
          ),
          createSidebarDirectory(
            'windbg-notes/system-mechanisms/software-interrupts',
          ),
        ]),
        { label: 'Cheat Sheet', slug: 'docs/windbg-notes/cheat-sheet' },
      ],
    };
  }

  if (repoName === 'regkit') {
    return {
      label: repoName,
      collapsed: true,
      items: [
        { label: 'Overview', slug: 'docs/regkit/overview' },
        createSidebarGroup('regkit/registry-internals', [
          {
            label: 'Registry Fundamentals',
            slug: 'docs/regkit/registry-internals/registry-fundamentals',
          },
          {
            label: 'Capture Table',
            slug: 'docs/regkit/registry-internals/capture-table',
          },
        ]),
        createSidebarGroup('regkit/guides', [
          {
            label: 'Capturing Registry Activity',
            slug: 'docs/regkit/guides/procmon',
          },
          {
            label: 'Boot Registry Activity',
            slug: 'docs/regkit/guides/wpr-wpa',
          },
        ]),
      ],
    };
  }

  return {
    label: repoName,
    collapsed: true,
    items: [{ autogenerate: { directory: repoName, collapsed: true } }],
  };
}

export const webTools = [
  { label: 'Diff Viewer', link: '/diff/' },
  { label: 'Policies', link: '/policies/' },
];

export const docsSidebar = [
  { label: 'Home', link: '/overview/' },
  { label: 'Product', link: '/product/' },
  { label: 'Projects', link: '/projects/' },
  {
    label: 'Web Tools',
    collapsed: true,
    items: webTools,
  },
  {
    label: 'Documentation',
    items: sidebarRepos.map(createSidebarRepoEntry),
  },
];
