/* Copyright (c) 2026 nohuto */
import './select';
import { createDraggableDialog } from '../dialogs/draggable';
import { storageGet, storageSet } from '../shell/storage';
import { fetchText } from './source';
import type { DiffFile, DiffSource } from './types';

type Kind = 'type' | 'globals' | 'pseudocode';
type Selection = Partial<Record<'left' | 'right' | 'module' | 'name', string>>;
type DisplayOptions = {
  leftRelease: string;
  module: string;
  leftFile: DiffFile;
};
type CompareOptions = DisplayOptions & {
  rightRelease: string;
  rightFile: DiffFile;
};

const SOURCES: Record<Kind, () => Promise<{ source: DiffSource }>> = {
  type: () => import('./type-layout-source'),
  globals: () => import('./globals-source'),
  pseudocode: () => import('./pseudocode-source'),
};
const KINDS = Object.keys(SOURCES) as Kind[];
const DIFF_STYLES = [
  '/main/vendor/highlight-github-dark.min.css',
  '/main/vendor/diff2html.min.css',
];
const DIFF_SCRIPTS = [
  '/main/vendor/highlight.common.min.js',
  '/main/vendor/diff.min.js',
  '/main/vendor/diff2html-ui-base.min.js',
];
const DEFAULT_LEFT_RELEASE = '11-23H2';
const DEFAULT_RIGHT_RELEASE = '11-24H2';
const FONT_SIZE_KEY = 'nv-diff-font-size';
const DEFAULT_FONT_SIZE = 12.5;
const MIN_FONT_SIZE = 8.5;
const MAX_FONT_SIZE = 17.5;
const COLLATOR = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

const toKind = (value: string | null | undefined): Kind =>
  KINDS.find((kind) => kind === value) || 'type';

const estimateReleaseRank = (release: string) => {
  const win11 = release.match(/^(\d+)-(\d{2})H([12])$/i);
  if (win11)
    return (
      Number(win11[1]) * 100000 +
      (2000 + Number(win11[2])) * 10 +
      Number(win11[3])
    );
  const win10 = release.match(/^(\d{2})H([12])$/i);
  if (win10) return (2000 + Number(win10[1])) * 10 + Number(win10[2]);
  return /^\d{4}$/.test(release) ? Number(release) : Number.NEGATIVE_INFINITY;
};

const compareReleaseNames = (left: string, right: string) =>
  estimateReleaseRank(right) - estimateReleaseRank(left) ||
  COLLATOR.compare(right, left);

const loadAsset = (element: HTMLScriptElement | HTMLLinkElement) =>
  new Promise<void>((resolve, reject) => {
    element.onload = () => resolve();
    element.onerror = () => reject(new Error('Couldnt load diff assets'));
    document.head.append(element);
  });

let diffAssets: Promise<unknown> | undefined;
const ensureDiffAssets = () =>
  (diffAssets ||= Promise.all([
    ...DIFF_STYLES.map((href) =>
      loadAsset(
        Object.assign(document.createElement('link'), {
          rel: 'stylesheet',
          href,
        }),
      ),
    ),
    ...DIFF_SCRIPTS.map((src) =>
      loadAsset(
        Object.assign(document.createElement('script'), { src, async: false }),
      ),
    ),
  ]).catch((error) => {
    diffAssets = undefined;
    throw error;
  }));

const replaceOptions = (
  select: HTMLSelectElement,
  options: string[],
  preferred: string,
  virtual = false,
) => {
  select.replaceChildren();
  const selected = options.includes(preferred) ? preferred : options[0] || '';
  (virtual ? (selected ? [selected] : []) : options).forEach((value) => {
    select.append(new Option(value, value));
  });
  if (selected) select.value = selected;
  select.dispatchEvent(
    new CustomEvent('nv:options-updated', {
      detail: { resetSearch: true, options: virtual ? options : null },
    }),
  );
  return selected;
};

const buildNoChangePatch = (
  leftLabel: string,
  rightLabel: string,
  source: string,
) => {
  const lines = source ? source.replace(/\n$/, '').split('\n') : [];
  const start = lines.length > 0 ? 1 : 0;
  return [
    '===================================================================',
    `--- ${leftLabel}`,
    `+++ ${rightLabel}`,
    `@@ -${start},${lines.length} +${start},${lines.length} @@`,
    ...lines.map((line) => ` ${line}`),
    '',
  ].join('\n');
};

const colorScheme = () =>
  document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';

const clampFontSize = (value: string | number) => {
  const parsed = Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) return DEFAULT_FONT_SIZE;
  const clamped = Math.min(Math.max(parsed, MIN_FONT_SIZE), MAX_FONT_SIZE);
  return Math.round(clamped - MIN_FONT_SIZE) + MIN_FONT_SIZE;
};

const fileLabel = (release: string, module: string, file: DiffFile) =>
  `${release}/${module}/${file.fileName}`;

const byId = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const root = byId('diff-app');
const leftSelect = byId<HTMLSelectElement>('diff-left-release');
const rightSelect = byId<HTMLSelectElement>('diff-right-release');
const moduleSelect = byId<HTMLSelectElement>('diff-module');
const nameSelect = byId<HTMLSelectElement>('diff-name');
const nameLabel = byId('diff-name-label');
const kindButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>(
    '#diff-kind-toggle button[data-kind]',
  ),
);
const displayButton = byId<HTMLButtonElement>('diff-display');
const runButton = byId<HTMLButtonElement>('diff-run');
const viewTools = byId('diff-view-tools');
const fontDecreaseButton = byId<HTMLButtonElement>('diff-font-decrease');
const fontIncreaseButton = byId<HTMLButtonElement>('diff-font-increase');
const viewButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>(
    '#diff-view-mode .bindiff-view-button',
  ),
);
const swapButton = byId('diff-swap');
const settingsButton = byId<HTMLButtonElement>('diff-settings');
const maximizeButton = byId('diff-maximize');
const output = byId('diff-output');
const links = byId('diff-links');
const leftLink = byId<HTMLAnchorElement>('diff-left-link');
const rightLink = byId<HTMLAnchorElement>('diff-right-link');
const settingsModal = byId<HTMLDialogElement>('diff-settings-modal');
const settingsBody = byId('diff-settings-body');
const settingsClose = byId('diff-settings-close');

let activeKind: Kind = 'type';
let activeSource: DiffSource = null!;
let leftFiles = new Map<string, DiffFile>();
let rightFiles = new Map<string, DiffFile>();
let token = 0;
let currentViewMode = 'side-by-side';
let currentFontSize = DEFAULT_FONT_SIZE;
let isMaximized = false;
let lastRender:
  | null
  | { kind: Kind; single: true; leftSource: string; options: DisplayOptions }
  | {
      kind: Kind;
      single: false;
      leftSource: string;
      rightSource: string;
      options: CompareOptions;
    } = null;
const selectionMemory = new Map<Kind, Selection>();
const openSettingsDialog = createDraggableDialog({
  layer: settingsModal,
  dialog: byId('diff-settings-dialog'),
  handle: byId('diff-settings-header'),
});

const setBusy = (busy: boolean) => {
  root.setAttribute('aria-busy', String(busy));
};

const setMaximized = (maximized: boolean) => {
  if (isMaximized === maximized) return;
  isMaximized = maximized;
  root.classList.toggle('bindiff-maximized', maximized);
  document.body.classList.toggle('bindiff-maximized', maximized);
  maximizeButton.setAttribute('aria-pressed', String(maximized));
  maximizeButton.setAttribute(
    'aria-label',
    maximized ? 'Restore size' : 'Maximize',
  );
  maximizeButton.title = maximized ? 'Restore size' : 'Maximize';
};

const setFontSize = (size: string | number, persist = true) => {
  currentFontSize = clampFontSize(size);
  output.style.setProperty('--bindiff-font-size', `${currentFontSize / 16}rem`);
  fontDecreaseButton.disabled = currentFontSize <= MIN_FONT_SIZE;
  fontIncreaseButton.disabled = currentFontSize >= MAX_FONT_SIZE;
  if (persist) storageSet(FONT_SIZE_KEY, String(currentFontSize));
};

const setResultUi = (visible: boolean, comparison = visible) => {
  links.hidden = !visible;
  root.classList.toggle('bindiff-display-result', visible && !comparison);
  viewTools.hidden = swapButton.hidden = visible && !comparison;
  if (!visible) setMaximized(false);
};

const clearResult = () => {
  output.classList.remove('bindiff-single-source');
  output.replaceChildren();
  setResultUi(false);
  lastRender = null;
};

const showError = (message: string) => {
  clearResult();
  const notice = document.createElement('p');
  notice.className = 'bindiff-error';
  notice.setAttribute('role', 'alert');
  notice.textContent = message;
  output.append(notice);
};

const readUrlState = () => {
  const params = new URLSearchParams(location.search);
  return {
    kind: toKind(params.get('kind')),
    left: params.get('left') || '',
    right: params.get('right') || '',
    module: params.get('module') || '',
    name: params.get('name') || '',
    mode: params.get('mode') || '',
  };
};

const updateUrl = () => {
  const url = new URL(location.href);
  Object.entries({
    kind: activeKind,
    left: leftSelect.value,
    right: rightSelect.value,
    module: moduleSelect.value,
    name: nameSelect.value,
    mode: currentViewMode,
  }).forEach(([key, value]) => url.searchParams.set(key, value));
  history.replaceState(history.state, '', url);
};

const rememberSelection = () => {
  selectionMemory.set(activeKind, {
    left: leftSelect.value,
    right: rightSelect.value,
    module: moduleSelect.value,
    name: nameSelect.value,
  });
};

const setKind = async (kind: Kind) => {
  activeSource = (await SOURCES[kind]()).source;
  activeKind = kind;
  settingsButton.disabled = false;
  const nameText =
    kind === 'pseudocode' ? 'Function' : kind === 'globals' ? 'Global' : 'Type';
  nameLabel.textContent = nameText;
  kindButtons.forEach((button) => {
    const active = button.dataset.kind === kind;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
};

const setViewMode = (mode: string | undefined) => {
  currentViewMode = mode === 'line-by-line' ? 'line-by-line' : 'side-by-side';
  viewButtons.forEach((button) => {
    const active = button.dataset.mode === currentViewMode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
};

const setLinks = (leftFile: DiffFile, rightFile: DiffFile | null = null) => {
  leftLink.href = activeSource.blobUrl(
    leftSelect.value,
    moduleSelect.value,
    leftFile,
  );
  rightLink.hidden = !rightFile;
  if (rightFile)
    rightLink.href = activeSource.blobUrl(
      rightSelect.value,
      moduleSelect.value,
      rightFile,
    );
};

const applyRenderedTheme = () => {
  const scheme = `d2h-${colorScheme()}-color-scheme`;
  output.querySelectorAll('.d2h-wrapper').forEach((wrapper) => {
    wrapper.classList.remove(
      'd2h-light-color-scheme',
      'd2h-dark-color-scheme',
      'd2h-auto-color-scheme',
    );
    wrapper.classList.add(scheme);
  });
};

const applyHeaderFormatting = () => {
  output.querySelectorAll('.d2h-file-name').forEach((node) => {
    node.textContent = (node.textContent || '').replace(/→/g, '->');
  });
  output
    .querySelectorAll('.d2h-file-name-wrapper .d2h-icon')
    .forEach((icon) => icon.remove());
};

const highlightBlockComments = () => {
  if (!activeSource.highlightBlockComments) return;
  output
    .querySelectorAll('.d2h-file-side-diff, .d2h-file-diff')
    .forEach((container) => {
      let inBlockComment = false;
      container.querySelectorAll('.d2h-code-line-ctn').forEach((line) => {
        const text = line.textContent || '';
        const start = text.indexOf('/*');
        const end = text.indexOf('*/');
        if (inBlockComment || start !== -1)
          line.classList.add('hljs-comment', 'bindiff-comment-line');
        if (inBlockComment && end !== -1) inBlockComment = false;
        else if (!inBlockComment && start !== -1 && !(end > start))
          inBlockComment = true;
      });
    });
};

const drawPatch = (patch: string, mode: string) => {
  new window.Diff2HtmlUI(
    output,
    patch.replace(/^(---|\+\+\+) ([^\n\t]+)\t$/gm, '$1 $2'),
    {
      drawFileList: false,
      matching: 'lines',
      outputFormat: mode,
      colorScheme: colorScheme(),
      synchronisedScroll: true,
      highlight: true,
      fileListToggle: false,
      fileContentToggle: false,
      stickyFileHeaders: true,
      renderNothingWhenEmpty: false,
    },
    window.hljs,
  ).draw();
  applyHeaderFormatting();
  highlightBlockComments();
  applyRenderedTheme();
};

const renderCompare = (
  leftSource: string,
  rightSource: string,
  options: CompareOptions,
) => {
  output.classList.remove('bindiff-single-source');
  const { leftText, rightText, context } = activeSource.preparePair(
    leftSource,
    rightSource,
    options.leftFile,
  );
  const leftLabel = fileLabel(
    options.leftRelease,
    options.module,
    options.leftFile,
  );
  const rightLabel = fileLabel(
    options.rightRelease,
    options.module,
    options.rightFile,
  );
  drawPatch(
    leftText === rightText
      ? buildNoChangePatch(leftLabel, rightLabel, leftText)
      : window.Diff.createTwoFilesPatch(
          leftLabel,
          rightLabel,
          leftText,
          rightText,
          '',
          '',
          { context },
        ),
    currentViewMode,
  );
};

const renderDisplay = (source: string, options: DisplayOptions) => {
  output.classList.add('bindiff-single-source');
  const label = fileLabel(
    options.leftRelease,
    options.module,
    options.leftFile,
  );
  drawPatch(
    buildNoChangePatch(
      label,
      label,
      activeSource.prepareSingle(source, options.leftFile),
    ),
    'line-by-line',
  );
};

const rerender = () => {
  if (!lastRender || lastRender.kind !== activeKind) return;
  if (lastRender.single)
    renderDisplay(lastRender.leftSource, lastRender.options);
  else
    renderCompare(
      lastRender.leftSource,
      lastRender.rightSource,
      lastRender.options,
    );
  setResultUi(true, !lastRender.single);
  updateUrl();
};

const refreshNames = async (preferredName = '', autoRun = false) => {
  const left = leftSelect.value;
  const right = rightSelect.value;
  const module = moduleSelect.value;
  if (!left || !right || !module) return;
  const currentToken = ++token;
  setBusy(true);
  displayButton.disabled = runButton.disabled = true;
  try {
    const [leftList, rightList] = await Promise.all([
      activeSource.listNames(left, module),
      activeSource.listNames(right, module),
    ]);
    if (currentToken !== token) return;
    leftFiles = new Map(leftList.map((file) => [file.name, file]));
    rightFiles = new Map(rightList.map((file) => [file.name, file]));
    const names = leftList
      .map((file) => file.name)
      .filter((name) => rightFiles.has(name))
      .sort(COLLATOR.compare);
    const selected = replaceOptions(nameSelect, names, preferredName, true);
    displayButton.disabled = runButton.disabled = names.length === 0;
    if (!names.length) clearResult();
    else if (autoRun && selected) await runCompare();
  } catch {
    if (currentToken === token)
      showError('Couldnt load file names. Please try again.');
  } finally {
    if (currentToken === token) setBusy(false);
  }
};

const refreshModules = async (
  preferredModule = '',
  preferredName = '',
  autoRun = false,
) => {
  const left = leftSelect.value;
  const right = rightSelect.value;
  if (!left || !right) return;
  const currentToken = ++token;
  setBusy(true);
  displayButton.disabled = runButton.disabled = true;
  try {
    const [leftModules, rightModules] = await Promise.all([
      activeSource.listModules(left),
      activeSource.listModules(right),
    ]);
    if (currentToken !== token) return;
    const modules = leftModules
      .filter((module) => rightModules.includes(module))
      .sort(COLLATOR.compare);
    const selected = replaceOptions(
      moduleSelect,
      modules,
      preferredModule || activeSource.defaultModule,
    );
    if (!modules.length) clearResult();
    else await refreshNames(preferredName, autoRun && Boolean(selected));
  } catch {
    if (currentToken === token)
      showError('Couldnt load modules. Please try again.');
  } finally {
    if (currentToken === token) setBusy(false);
  }
};

const refreshReleases = async (preferred: Selection) => {
  const currentToken = ++token;
  setBusy(true);
  clearResult();
  displayButton.disabled = runButton.disabled = true;
  try {
    const releases = [...(await activeSource.listReleases())].sort(
      compareReleaseNames,
    );
    if (currentToken !== token || !releases.length) return;
    const pick = (...candidates: (string | undefined)[]) =>
      candidates.find((release) => release && releases.includes(release));
    const left = pick(preferred.left, DEFAULT_LEFT_RELEASE) || releases[0]!;
    const other = releases.find((release) => release !== left) || left;
    const right = pick(preferred.right, DEFAULT_RIGHT_RELEASE) || other;
    replaceOptions(leftSelect, releases, left);
    replaceOptions(rightSelect, releases, right !== left ? right : other);
    await refreshModules(preferred.module, preferred.name, false);
  } catch {
    if (currentToken === token)
      showError('Couldnt load builds. Please try again.');
  } finally {
    if (currentToken === token) setBusy(false);
  }
};

const currentFiles = () => {
  const name = nameSelect.value.trim();
  return { leftFile: leftFiles.get(name), rightFile: rightFiles.get(name) };
};

async function runDisplay() {
  const { leftFile } = currentFiles();
  if (!leftFile) return;
  const options = {
    leftRelease: leftSelect.value,
    module: moduleSelect.value,
    leftFile,
  };
  const currentToken = ++token;
  setBusy(true);
  try {
    const [leftSource] = await Promise.all([
      fetchText(leftFile.downloadUrl),
      ensureDiffAssets(),
    ]);
    if (currentToken !== token) return;
    renderDisplay(leftSource, options);
    setLinks(leftFile);
    setResultUi(true, false);
    lastRender = { kind: activeKind, single: true, leftSource, options };
    rememberSelection();
    updateUrl();
  } catch {
    if (currentToken === token)
      showError('Couldnt display this file. Please try again.');
  } finally {
    if (currentToken === token) setBusy(false);
  }
}

async function runCompare() {
  const { leftFile, rightFile } = currentFiles();
  if (!leftFile || !rightFile) return;
  const options = {
    leftRelease: leftSelect.value,
    rightRelease: rightSelect.value,
    module: moduleSelect.value,
    leftFile,
    rightFile,
  };
  const currentToken = ++token;
  setBusy(true);
  try {
    const [leftSource, rightSource] = await Promise.all([
      fetchText(leftFile.downloadUrl),
      fetchText(rightFile.downloadUrl),
      ensureDiffAssets(),
    ]);
    if (currentToken !== token) return;
    renderCompare(leftSource, rightSource, options);
    setLinks(leftFile, rightFile);
    setResultUi(true, true);
    lastRender = {
      kind: activeKind,
      single: false,
      leftSource,
      rightSource,
      options,
    };
    rememberSelection();
    updateUrl();
  } catch {
    if (currentToken === token)
      showError('Couldnt compare these files. Please try again.');
  } finally {
    if (currentToken === token) setBusy(false);
  }
}

const renderSettings = () => {
  const values = activeSource.readSettings();
  settingsBody.replaceChildren(
    ...activeSource.settings.map(({ key, label }) => {
      const row = document.createElement('label');
      row.className = 'settings-row';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.name = key;
      input.checked = values[key]!;
      const text = document.createElement('span');
      text.textContent = label;
      row.append(input, text);
      return row;
    }),
  );
};

const closeSettings = () => settingsModal.close();

kindButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    const kind = toKind(button.dataset.kind);
    if (kind === activeKind) return;
    rememberSelection();
    setBusy(true);
    try {
      await setKind(kind);
      await refreshReleases(selectionMemory.get(kind) || {});
      updateUrl();
    } catch {
      showError('Couldnt load this source. Please try again.');
    } finally {
      setBusy(false);
    }
  });
});

[leftSelect, rightSelect].forEach((select) =>
  select.addEventListener('change', () => {
    clearResult();
    refreshModules(moduleSelect.value, nameSelect.value);
  }),
);
moduleSelect.addEventListener('change', () => {
  clearResult();
  refreshNames(nameSelect.value);
});
nameSelect.addEventListener('change', () => {
  clearResult();
  rememberSelection();
  updateUrl();
});
displayButton.addEventListener('click', runDisplay);
runButton.addEventListener('click', runCompare);
fontDecreaseButton.addEventListener('click', () =>
  setFontSize(currentFontSize - 1),
);
fontIncreaseButton.addEventListener('click', () =>
  setFontSize(currentFontSize + 1),
);
swapButton.addEventListener('click', () => {
  [leftSelect.value, rightSelect.value] = [rightSelect.value, leftSelect.value];
  refreshModules(moduleSelect.value, nameSelect.value, true);
});
viewButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.mode === currentViewMode) return;
    setViewMode(button.dataset.mode);
    rerender();
  });
});
settingsButton.addEventListener('click', () => {
  renderSettings();
  openSettingsDialog({ initialFocus: settingsClose, recenter: true });
});
settingsBody.addEventListener('change', () => {
  activeSource.writeSettings(
    Object.fromEntries(
      Array.from(
        settingsBody.querySelectorAll<HTMLInputElement>('input'),
        (input) => [input.name, input.checked],
      ),
    ),
  );
  rerender();
});
settingsClose.addEventListener('click', closeSettings);
byId('diff-settings-done').addEventListener('click', closeSettings);
byId('diff-settings-reset').addEventListener('click', () => {
  activeSource.resetSettings();
  renderSettings();
  rerender();
});
settingsModal.addEventListener('click', (event) => {
  if (event.target === settingsModal) closeSettings();
});
maximizeButton.addEventListener('click', () => setMaximized(!isMaximized));
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || settingsModal.open || !isMaximized) return;
  event.preventDefault();
  setMaximized(false);
});
document.addEventListener('nv:theme-change', () => {
  if (lastRender) applyRenderedTheme();
});

setFontSize(storageGet(FONT_SIZE_KEY, String(DEFAULT_FONT_SIZE)), false);
(async () => {
  setBusy(true);
  try {
    const state = readUrlState();
    await setKind(state.kind);
    setViewMode(state.mode);
    await refreshReleases(state);
  } catch {
    showError('Couldnt load the diff explorer. Please reload the page.');
  } finally {
    setBusy(false);
  }
})();
