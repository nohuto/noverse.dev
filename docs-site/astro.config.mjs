// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeRapide from 'starlight-theme-rapide';
import starlightScrollToTop from 'starlight-scroll-to-top';
import starlightCodeblockFullscreen from 'starlight-codeblock-fullscreen';
import starlightImageZoom from 'starlight-image-zoom';
import starlightViewModes from 'starlight-view-modes';
import starlightLinksValidator from 'starlight-links-validator';
import {
  CATEGORY_LABELS,
  WIN_CONFIG_CATEGORIES,
  getDirectoryLabel,
} from './docs-constants.mjs';

const sidebarRepos = ['win-config', 'windbg-notes', 'regkit', 'app-guides'];
const expandedSidebarRepos = new Set(['win-config', 'windbg-notes', 'regkit']);
const noverseDocsLabels = {
  name: 'noverse-docs-labels',
  hooks: {
    'config:setup'() {},
    'i18n:setup'({ injectTranslations }) {
      injectTranslations({
        en: {
          'tableOfContents.onThisPage': 'Table of Content',
        },
      });
    },
  },
};

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
        {
          label: 'Guides',
          collapsed: true,
          autogenerate: { directory: 'regkit/guides', collapsed: true },
        },
      ],
    };
  }

  return {
    label: repoName,
    ...collapsedIfNeeded(repoName),
    autogenerate: { directory: repoName, collapsed: true },
  };
}

export default defineConfig({
  site: 'https://www.noverse.dev',
  base: '/docs',
  integrations: [
    starlight({
      plugins: [
        noverseDocsLabels,
        starlightThemeRapide(),
        starlightViewModes({
          zenModeSettings: {
            displayOptions: {
              showHeader: false,
              showSidebar: false,
              showTableOfContents: false,
              showFooter: false,
            },
          },
        }),
        starlightScrollToTop({
          borderRadius: '0',
          svgPath: 'M7 14l5-5 5 5 M7 19l5-5 5 5',
          svgStrokeWidth: 1.8,
        }),
        starlightCodeblockFullscreen(),
        starlightImageZoom(),
        starlightLinksValidator({
          exclude: ['https://www.noverse.dev/diff'],
          failOnError: false,
          sameSitePolicy: 'validate',
        }),
      ],
      title: 'Noverse Docs',
      description:
        'Docs from win-config, regkit, app-guides, and windbg-notes.',
      favicon: '/logo.png',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/nohuto' },
        { icon: 'discord', label: 'Discord', href: 'https://discord.noverse.dev' },
      ],
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 6,
      },
      routeMiddleware: './src/route-data.ts',
      components: {
        Header: './src/components/starlight/Header.astro',
        PageTitle: './src/components/starlight/PageTitle.astro',
        Search: './src/components/starlight/Search.astro',
        Sidebar: './src/components/starlight/Sidebar.astro',
        MobileMenuFooter: './src/components/starlight/MobileMenuFooter.astro',
        ThemeProvider: './src/components/starlight/ThemeProvider.astro',
        ThemeSelect: './src/components/starlight/ThemeSelect.astro',
      },
      customCss: ['./src/styles/rapide-overrides.css', './src/styles/doc-themes.css'],
      expressiveCode: {
        styleOverrides: {
          borderRadius: 'var(--nv-ui-radius)',
          frames: {
            editorTabBorderRadius: 'var(--nv-ui-radius)',
          },
          textMarkers: {
            inlineMarkerBorderRadius: 'var(--nv-ui-radius)',
          },
        },
      },
      sidebar: sidebarRepos.map((repoName) => createSidebarRepoEntry(repoName)),
    }),
  ],
});

