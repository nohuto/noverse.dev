// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightTelescope from 'starlight-telescope';
import starlightThemeRapide from 'starlight-theme-rapide';
import starlightScrollToTop from 'starlight-scroll-to-top';
import starlightCodeblockFullscreen from 'starlight-codeblock-fullscreen';
import starlightImageZoom from 'starlight-image-zoom';
import starlightViewModes from 'starlight-view-modes';
import starlightLinksValidator from 'starlight-links-validator';
import { docsSidebar } from './docs-sidebar.mjs';
/** @type {import('@astrojs/starlight/types').StarlightPlugin} */
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

export default defineConfig({
  site: 'https://www.noverse.dev',
  base: '/docs',
  outDir: '../dist/docs',
  integrations: [
    starlight({
      plugins: [
        noverseDocsLabels,
        starlightTelescope({
          theme: {
            overlayBackground: 'var(--sl-color-backdrop-overlay)',
            modalBackground: 'var(--sl-color-bg-nav)',
            modalBackgroundAlt: 'var(--sl-color-bg)',
            accentColor: 'var(--sl-color-accent)',
            accentHover:
              'color-mix(in srgb, var(--sl-color-accent) 10%, transparent)',
            accentSelected:
              'color-mix(in srgb, var(--sl-color-accent) 18%, transparent)',
            textPrimary: 'var(--sl-color-white)',
            textSecondary: 'var(--sl-color-gray-3)',
            border: 'var(--sl-color-hairline-light)',
            borderActive: 'var(--sl-color-gray-5)',
            pinColor: 'var(--sl-color-purple)',
            tagColor: 'var(--sl-color-green)',
          },
        }),
        starlightThemeRapide(),
        starlightViewModes({
          zenModeSettings: {
            keyboardShortcut: 'Ctrl+Alt+Shift+Z',
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
      titleDelimiter: '-',
      description:
        'Docs from win-config, regkit, app-guides, and windbg-notes.',
      favicon: '/favicon.png',
      head: [
        {
          tag: 'link',
          attrs: {
            rel: 'apple-touch-icon',
            href: '/apple-touch-icon.png',
            sizes: '180x180',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'preload',
            href: '/main/fonts/CascadiaCode-2407.24.woff2',
            as: 'font',
            type: 'font/woff2',
            crossorigin: true,
          },
        },
      ],
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/nohuto' },
        {
          icon: 'discord',
          label: 'Discord',
          href: 'https://discord.noverse.dev',
        },
      ],
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 6,
      },
      routeMiddleware: './src/route-data.ts',
      components: {
        Head: './src/components/starlight/Head.astro',
        Header: './src/components/starlight/Header.astro',
        PageTitle: './src/components/starlight/PageTitle.astro',
        Search: './src/components/starlight/Search.astro',
        Sidebar: './src/components/starlight/Sidebar.astro',
        TableOfContents: './src/components/starlight/TableOfContents.astro',
        MobileMenuFooter: './src/components/starlight/MobileMenuFooter.astro',
        ThemeProvider: './src/components/starlight/ThemeProvider.astro',
        ThemeSelect: './src/components/starlight/ThemeSelect.astro',
      },
      customCss: [
        './src/styles/rapide-overrides.css',
        './src/styles/doc-themes.css',
      ],
      expressiveCode: {
        styleOverrides: {
          borderRadius: 'var(--nv-ui-radius)',
          codeFontSize: '0.8125rem',
          frames: {
            editorTabBorderRadius: 'var(--nv-ui-radius)',
          },
          textMarkers: {
            inlineMarkerBorderRadius: 'var(--nv-ui-radius)',
          },
        },
      },
      sidebar: docsSidebar,
    }),
  ],
});
