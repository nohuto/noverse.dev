import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageEntry = fileURLToPath(import.meta.resolve('starlight-telescope'));
const targetFile = resolve(dirname(packageEntry), 'src/libs/telescope-search.ts');
let source = readFileSync(targetFile, 'utf8');

const patches = [
  {
    name: 'legacy empty-query recents section',
    before: `
    // Use validated pages to prevent showing pages from other sites
    const validatedRecent = this.validateStoredPages(this.recentPages);

    // Show recent pages if no search query
    if (!this.searchQuery.trim() && validatedRecent.length > 0) {
      this.resultsContainerElement.appendChild(
        this.createSectionHeader('Recently Visited', () => this.clearRecentPages())
      );

      validatedRecent.forEach((page) => {
        const listItem = this.createResultItem(page, currentIndex);
        this.resultsContainerElement!.appendChild(listItem);
        currentIndex++;
      });
    }
`,
    after: `
    // Recent pages are intentionally exclusive to the Recent tab.
`,
  },
  {
    name: 'search-tab recent-page data',
    before: `
    const validatedRecent = this.validateStoredPages(this.recentPages);
`,
    after: `
    // The Search tab does not need recent-page metadata.
`,
  },
  {
    name: 'search-tab recent section',
    before: `
    // Show recent pages section
    if (validatedRecent.length > 0) {
      this.resultsContainerElement.appendChild(
        this.createSectionHeader('Recently Visited', () => this.clearRecentPages())
      );

      // Get recent pages that aren't pinned
      const nonPinnedRecent = validatedRecent.filter((page) => !this.isPagePinned(page.path));
      const pinnedCount = validatedPinned.length;

      nonPinnedRecent.slice(0, this.config.recentPagesCount).forEach((page, index) => {
        const realIndex = pinnedCount + index;
        const listItem = this.createResultItem(page, realIndex);
        this.resultsContainerElement!.appendChild(listItem);
      });
    }
`,
    after: `
    // Recent pages are rendered by the dedicated Recent tab.
`,
  },
  {
    name: 'search result de-duplication',
    before: `
    // Filter out pinned and recent pages from search results to avoid duplicates
    const pinnedPaths = validatedPinned.map((p) => p.path);
    const recentPaths = validatedRecent.map((p) => p.path);
    const filteredResults = this.filteredPages.filter(
      (page) => !pinnedPaths.includes(page.path) && !recentPaths.includes(page.path)
    );
`,
    after: `
    // Pinned pages have their own section; recent pages remain regular search results.
    const pinnedPaths = new Set(validatedPinned.map((page) => page.path));
    const filteredResults = this.filteredPages.filter((page) => !pinnedPaths.has(page.path));
`,
  },
  {
    name: 'search results separator condition',
    before: `if ((validatedRecent.length > 0 || validatedPinned.length > 0) && filteredResults.length > 0)`,
    after: `if (validatedPinned.length > 0 && filteredResults.length > 0)`,
  },
  {
    name: 'empty results condition',
    before: `if (filteredResults.length === 0 && validatedPinned.length === 0 && validatedRecent.length === 0)`,
    after: `if (filteredResults.length === 0 && validatedPinned.length === 0)`,
  },
  {
    name: 'recent result index offset',
    before: `
    const recentCount = Math.min(
      validatedRecent.filter((p) => !this.isPagePinned(p.path)).length,
      this.config.recentPagesCount
    );
`,
    after: `
    // Recent pages do not contribute an index offset in the Search tab.
`,
  },
  {
    name: 'search result index',
    before: `const realIndex = pinnedCount + recentCount + index;`,
    after: `const realIndex = pinnedCount + index;`,
  },
];

let changed = false;
for (const patch of patches) {
  if (source.includes(patch.before)) {
    source = source.replace(patch.before, patch.after);
    changed = true;
    continue;
  }
  if (patch.after && source.includes(patch.after)) continue;
  throw new Error(`[postinstall] Could not apply Telescope patch: ${patch.name}`);
}

if (changed) {
  writeFileSync(targetFile, source, 'utf8');
  console.log('[postinstall] Removed duplicate recent-page sections from Telescope search');
}
