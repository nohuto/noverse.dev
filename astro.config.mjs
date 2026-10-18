// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';

import { docsSidebar } from './src/data/docs-sidebar.mjs';

export default defineConfig({
  site: 'https://noverse.dev',
  trailingSlash: 'always',
  build: { inlineStylesheets: 'never' },
  compressHTML: true,
  integrations: [
    sitemap(),
    starlight({
      plugins: [
        starlightLinksValidator({
          exclude: [
            'https://noverse.dev/',
            'https://noverse.dev/{diff,policies,product,projects,terminal}',
            'https://noverse.dev/terminal#*',
          ],
          failOnError: false,
          sameSitePolicy: 'validate',
        }),
      ],
      title: 'Noverse',
      titleDelimiter: '-',
      description: 'Docs from win-config, regkit, app-guides, windbg-notes.',
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
            href: '/main/fonts/Mono-2407.24.woff2',
            as: 'font',
            type: 'font/woff2',
            crossorigin: true,
          },
        },
      ],
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 6 },
      routeMiddleware: './src/route-data.ts',
      components: {
        PageFrame: './src/components/starlight/PageFrame.astro',
        Header: './src/components/starlight/Header.astro',
        Search: './src/components/starlight/Search.astro',
        Sidebar: './src/components/starlight/Sidebar.astro',
        TableOfContents: './src/components/starlight/TableOfContents.astro',
        MobileMenuFooter: './src/components/starlight/MobileMenuFooter.astro',
        MobileMenuToggle: './src/components/starlight/MobileMenuToggle.astro',
        ThemeProvider: './src/components/starlight/ThemeProvider.astro',
        Pagination: './src/theme/rapide/components/Pagination.astro',
      },
      customCss: [
        './src/theme/rapide/styles/layers.css',
        './src/theme/rapide/styles/theme.css',
        './src/theme/rapide/styles/base.css',
        './src/theme/rapide/styles/layout.css',
        './src/theme/rapide/styles/anchors.css',
      ],
      expressiveCode: {
        themes: ['vitesse-dark', 'vitesse-light'],
        styleOverrides: {
          codeFontFamily: 'var(--sl-font-mono)',
          codeFontSize: '0.8125rem',
          borderColor: 'var(--sl-rapide-ui-border-color)',
          borderRadius: 'var(--ui-radius)',
          frames: {
            editorTabBorderRadius: 'var(--ui-radius)',
            editorActiveTabIndicatorTopColor: 'unset',
            editorActiveTabIndicatorBottomColor: 'var(--sl-color-gray-3)',
            editorTabBarBorderBottomColor: 'var(--sl-rapide-ui-border-color)',
            frameBoxShadowCssValue: 'unset',
          },
          textMarkers: {
            inlineMarkerBorderRadius: 'var(--ui-radius)',
            backgroundOpacity: '40%',
            markBackground: 'var(--sl-rapide-ec-marker-bg-color)',
            markBorderColor: 'var(--sl-rapide-ec-marker-border-color)',
          },
        },
      },
      sidebar: docsSidebar,
    }),
  ],
});
