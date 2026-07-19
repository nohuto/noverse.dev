/* Copyright (c) 2026 Nohuto */
(function attachDiff(global) {
  'use strict';

  const DRIVER_SCRIPTS = Object.freeze({
    type: 'main/min/type-layout-source.min.js',
    pseudocode: 'main/min/pseudocode-source.min.js'
  });
  const DIFF_STYLES = ['main/vendor/highlight-github-dark.min.css', 'main/vendor/diff2html.min.css'];
  const DIFF_SCRIPTS = [
    'main/vendor/highlight.common.min.js',
    'main/vendor/diff.min.js',
    'main/vendor/diff2html-ui-base.min.js'
  ];
  const SOURCE_ORDER = ['type', 'pseudocode'];
  const FONT_SIZE_KEY = 'nv-diff-font-size';
  const DEFAULT_FONT_SIZE = 12;
  const MIN_FONT_SIZE = 9;
  const MAX_FONT_SIZE = 18;
  const COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const assetPromises = new Map();
  let diffAssetsPromise;

  const estimateReleaseRank = release => {
    const value = String(release || '').trim();
    const win11 = value.match(/^(\d+)-(\d{2})H([12])$/i);
    if (win11) return Number(win11[1]) * 100000 + (2000 + Number(win11[2])) * 10 + Number(win11[3]);
    const win10 = value.match(/^(\d{2})H([12])$/i);
    if (win10) return (2000 + Number(win10[1])) * 10 + Number(win10[2]);
    return /^\d{4}$/.test(value) ? Number(value) : Number.NEGATIVE_INFINITY;
  };

  const compareReleaseNames = (left, right) => {
    const leftRank = estimateReleaseRank(left);
    const rightRank = estimateReleaseRank(right);
    if (leftRank !== rightRank) return rightRank - leftRank;
    return COLLATOR.compare(right, left);
  };

  const hasScript = src => Array.from(document.scripts).some(script => {
    const current = script.getAttribute('src') || '';
    return current === src || current.endsWith(`/${src}`);
  });

  const hasStyle = href => Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(link => {
    const current = link.getAttribute('href') || '';
    return current === href || current.endsWith(`/${href}`);
  });

  const ensureScript = src => {
    if (hasScript(src)) return Promise.resolve();
    if (assetPromises.has(src)) return assetPromises.get(src);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
    assetPromises.set(src, promise);
    return promise;
  };

  const ensureStyle = href => {
    if (hasStyle(href)) return Promise.resolve();
    if (assetPromises.has(href)) return assetPromises.get(href);
    const promise = new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      link.onerror = () => reject(new Error(`Failed to load ${href}`));
      document.head.appendChild(link);
    });
    assetPromises.set(href, promise);
    return promise;
  };

  const ensureSource = async kind => {
    const sourceKind = SOURCE_ORDER.includes(kind) ? kind : 'type';
    if (!global.NVDiffSources?.[sourceKind]) await ensureScript(DRIVER_SCRIPTS[sourceKind]);
    if (!global.NVDiffSources?.[sourceKind]) throw new Error(`Source didnt register: ${sourceKind}`);
  };

  const ensureDiffAssets = async source => {
    if (!diffAssetsPromise) {
      diffAssetsPromise = (async () => {
        for (const href of DIFF_STYLES) await ensureStyle(href);
        for (const src of DIFF_SCRIPTS) await ensureScript(src);
      })();
    }
    await diffAssetsPromise;
    for (const src of source.extraScripts || []) await ensureScript(src);
  };

  const replaceOptions = (select, options, preferred) => {
    select.replaceChildren();
    options.forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
    const selected = options.includes(preferred) ? preferred : options[0] || '';
    if (selected) select.value = selected;
    select.dispatchEvent(new CustomEvent('nv:options-updated', { detail: { resetSearch: true } }));
    return selected;
  };

  const lineList = source => {
    const text = String(source || '').replace(/\r\n?/g, '\n');
    if (!text) return [];
    return text.endsWith('\n') ? text.slice(0, -1).split('\n') : text.split('\n');
  };

  const buildNoChangePatch = (leftLabel, rightLabel, source) => {
    const lines = lineList(source);
    const count = lines.length;
    const start = count > 0 ? 1 : 0;
    return [
      '===================================================================',
      `--- ${leftLabel}`,
      `+++ ${rightLabel}`,
      `@@ -${start},${count} +${start},${count} @@`,
      ...lines.map(line => ` ${line}`),
      ''
    ].join('\n');
  };

  const colorScheme = () => {
    const lightThemes = global.LIGHT_THEMES || new Set(['light', 'gruvbox-light', 'kanagawa-lotus', 'catppuccin-latte', 'solarized-light', 'one-light', 'ayu-light', 'everforest-light']);
    return lightThemes.has(document.documentElement.getAttribute('data-theme') || global.DEFAULT_THEME || 'gruvbox-dark') ? 'light' : 'dark';
  };

  const storageGet = (key, fallback) => {
    try {
      return localStorage.getItem(key) || fallback;
    } catch {
      return fallback;
    }
  };

  const storageSet = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
    }
  };

  const clampFontSize = value => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return DEFAULT_FONT_SIZE;
    return Math.min(Math.max(parsed, MIN_FONT_SIZE), MAX_FONT_SIZE);
  };

  function initDiff() {
    const root = document.getElementById('diff-app');
    if (!root || root.dataset.ready === 'true') return;
    root.dataset.ready = 'true';

    const leftSelect = document.getElementById('diff-left-release');
    const rightSelect = document.getElementById('diff-right-release');
    const moduleSelect = document.getElementById('diff-module');
    const nameSelect = document.getElementById('diff-name');
    const nameLabel = document.querySelector('label[for="diff-name"]');
    const kindButtons = Array.from(document.querySelectorAll('#diff-kind-toggle button[data-kind]'));
    const displayButton = document.getElementById('diff-display');
    const runButton = document.getElementById('diff-run');
    const viewTools = document.getElementById('diff-view-tools');
    const fontTools = document.getElementById('diff-font-tools');
    const fontDecreaseButton = document.getElementById('diff-font-decrease');
    const fontIncreaseButton = document.getElementById('diff-font-increase');
    const viewButtons = Array.from(document.querySelectorAll('#diff-view-mode .bindiff-view-button'));
    const swapButton = document.getElementById('diff-swap');
    const settingsButton = document.getElementById('diff-settings');
    const maximizeButton = document.getElementById('diff-maximize');
    const output = document.getElementById('diff-output');
    const links = document.getElementById('diff-links');
    const leftLink = document.getElementById('diff-left-link');
    const rightLink = document.getElementById('diff-right-link');
    const settingsModal = document.getElementById('diff-settings-modal');
    const settingsDialog = document.getElementById('diff-settings-dialog');
    const settingsHeader = document.getElementById('diff-settings-header');
    const settingsBody = document.getElementById('diff-settings-body');
    const settingsClose = document.getElementById('diff-settings-close');
    const settingsDone = document.getElementById('diff-settings-done');
    const settingsReset = document.getElementById('diff-settings-reset');

    if (!leftSelect || !rightSelect || !moduleSelect || !nameSelect || !nameLabel || !kindButtons.length || !displayButton || !runButton || !viewTools || !fontTools || !fontDecreaseButton || !fontIncreaseButton || !viewButtons.length || !swapButton || !settingsButton || !maximizeButton || !output || !links || !leftLink || !rightLink || !settingsModal || !settingsDialog || !settingsHeader || !settingsBody || !settingsClose || !settingsDone || !settingsReset) return;

    let activeKind = 'type';
    let activeSource = null;
    let leftFiles = new Map();
    let rightFiles = new Map();
    let token = 0;
    let currentViewMode = 'side-by-side';
    let currentFontSize = DEFAULT_FONT_SIZE;
    let isMaximized = false;
    let lastRender = null;
    const selectionMemory = new Map();

    const setBusy = busy => {
      root.setAttribute('aria-busy', busy ? 'true' : 'false');
    };

    const setMaximized = maximized => {
      const next = Boolean(maximized);
      if (isMaximized === next) return;
      isMaximized = next;
      root.classList.toggle('bindiff-maximized', next);
      document.body.classList.toggle('bindiff-maximized', next);
      maximizeButton.setAttribute('aria-pressed', next ? 'true' : 'false');
      maximizeButton.setAttribute('aria-label', next ? 'Restore size' : 'Maximize');
      maximizeButton.title = next ? 'Restore size' : 'Maximize';
    };

    const setFontSize = (size, persist = true) => {
      currentFontSize = clampFontSize(size);
      output.style.setProperty('--bindiff-font-size', `${currentFontSize}px`);
      fontDecreaseButton.disabled = currentFontSize <= MIN_FONT_SIZE;
      fontIncreaseButton.disabled = currentFontSize >= MAX_FONT_SIZE;
      if (persist) storageSet(FONT_SIZE_KEY, String(currentFontSize));
    };

    const setResultUi = (visible, comparison = visible) => {
      [links, settingsButton, maximizeButton].forEach(node => {
        node.hidden = !visible;
      });
      fontTools.hidden = !visible;
      root.classList.toggle('bindiff-display-result', visible && !comparison);
      [viewTools, swapButton].forEach(node => {
        node.hidden = !comparison;
      });
      if (!visible) setMaximized(false);
    };

    const clearResult = () => {
      output.classList.remove('bindiff-single-source');
      output.replaceChildren();
      links.hidden = true;
      setResultUi(false);
      lastRender = null;
    };

    const readUrlState = () => {
      const params = new URLSearchParams(location.search);
      const kind = params.get('kind') === 'pseudocode' ? 'pseudocode' : 'type';
      return {
        kind,
        left: params.get('left') || '',
        right: params.get('right') || '',
        module: params.get('module') || '',
        name: params.get('name') || '',
        mode: params.get('mode') || ''
      };
    };

    const updateUrl = () => {
      const params = new URLSearchParams();
      params.set('kind', activeKind);
      params.set('left', leftSelect.value);
      params.set('right', rightSelect.value);
      params.set('module', moduleSelect.value);
      params.set('name', nameSelect.value);
      params.set('mode', currentViewMode);
      history.replaceState({ ...(history.state || {}), url: `/diff?${params}` }, '', `/diff?${params}`);
    };

    const rememberSelection = () => {
      selectionMemory.set(activeKind, {
        left: leftSelect.value,
        right: rightSelect.value,
        module: moduleSelect.value,
        name: nameSelect.value
      });
    };

    const setKind = kind => {
      activeKind = SOURCE_ORDER.includes(kind) ? kind : 'type';
      activeSource = global.NVDiffSources[activeKind];
      const nameText = activeKind === 'pseudocode' ? 'Function' : 'Type';
      nameLabel.textContent = nameText;
      nameSelect.closest('.select-ui')?.querySelector('.select-trigger')?.setAttribute('aria-label', nameText);
      kindButtons.forEach(button => {
        const active = button.dataset.kind === activeKind;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    };

    const setViewMode = mode => {
      currentViewMode = mode === 'line-by-line' ? 'line-by-line' : 'side-by-side';
      viewButtons.forEach(button => {
        const active = button.dataset.mode === currentViewMode;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    };

    setFontSize(storageGet(FONT_SIZE_KEY, getComputedStyle(output).getPropertyValue('--bindiff-font-size') || DEFAULT_FONT_SIZE), false);

    const setLinks = (leftFile, rightFile = null) => {
      leftLink.href = activeSource.blobUrl(leftSelect.value, moduleSelect.value, leftFile);
      leftLink.hidden = false;
      if (rightFile) {
        rightLink.href = activeSource.blobUrl(rightSelect.value, moduleSelect.value, rightFile);
        rightLink.hidden = false;
      } else {
        rightLink.hidden = true;
      }
      links.hidden = false;
    };

    const applyRenderedTheme = () => {
      const schemeClass = colorScheme() === 'light' ? 'd2h-light-color-scheme' : 'd2h-dark-color-scheme';
      output.querySelectorAll('.d2h-wrapper').forEach(wrapper => {
        wrapper.classList.remove('d2h-light-color-scheme', 'd2h-dark-color-scheme', 'd2h-auto-color-scheme');
        wrapper.classList.add(schemeClass);
      });
    };

    const applyHeaderFormatting = () => {
      output.querySelectorAll('.d2h-file-name').forEach(node => {
        node.textContent = (node.textContent || '').replace(/\u2192|\u00e2\u2020\u2019|\u00c3\u00a2\u00e2\u20ac\u00a0\u00e2\u20ac\u2122/g, '->');
      });
      output.querySelectorAll('.d2h-file-name-wrapper .d2h-icon').forEach(icon => icon.remove());
    };

    const highlightBlockComments = () => {
      if (!activeSource.highlightBlockComments) return;
      output.querySelectorAll('.d2h-file-side-diff, .d2h-file-diff').forEach(container => {
        let inBlockComment = false;
        container.querySelectorAll('.d2h-code-line-ctn').forEach(line => {
          const text = line.textContent || '';
          const start = text.indexOf('/*');
          const end = text.indexOf('*/');
          if (inBlockComment || start !== -1) line.classList.add('hljs-comment', 'bindiff-comment-line');
          if (inBlockComment && end !== -1) inBlockComment = false;
          else if (!inBlockComment && start !== -1 && !(end !== -1 && end > start)) inBlockComment = true;
        });
      });
    };

    const drawPatch = (patch, mode) => {
      const ui = new global.Diff2HtmlUI(output, patch.replace(/^(---|\+\+\+) ([^\n\t]+)\t$/gm, '$1 $2'), {
        drawFileList: false,
        matching: 'lines',
        outputFormat: mode,
        colorScheme: colorScheme(),
        synchronisedScroll: true,
        highlight: true,
        fileListToggle: false,
        fileContentToggle: false,
        stickyFileHeaders: true,
        renderNothingWhenEmpty: false
      }, global.hljs);
      ui.draw();
      applyHeaderFormatting();
      highlightBlockComments();
      applyRenderedTheme();
    };

    const renderCompare = (leftSource, rightSource, options) => {
      output.classList.remove('bindiff-single-source');
      const prepared = activeSource.preparePair(leftSource, rightSource, options.leftFile, options.rightFile);
      const leftLabel = activeSource.fileLabel(options.leftRelease, options.module, options.leftFile);
      const rightLabel = activeSource.fileLabel(options.rightRelease, options.module, options.rightFile);
      const patch = prepared.equivalent || prepared.leftText === prepared.rightText
        ? buildNoChangePatch(leftLabel, rightLabel, prepared.leftText)
        : global.Diff.createTwoFilesPatch(leftLabel, rightLabel, prepared.leftText, prepared.rightText, '', '', { context: prepared.context });
      drawPatch(patch, currentViewMode);
    };

    const renderDisplay = (source, options) => {
      output.classList.add('bindiff-single-source');
      const prepared = activeSource.prepareSingle(source, options.leftFile);
      const label = activeSource.fileLabel(options.leftRelease, options.module, options.leftFile);
      drawPatch(buildNoChangePatch(label, label, prepared), 'line-by-line');
    };

    const rerender = () => {
      if (!lastRender) return;
      if (lastRender.kind !== activeKind) return;
      if (lastRender.single) {
        renderDisplay(lastRender.leftSource, lastRender.options);
        setResultUi(true, false);
      } else {
        renderCompare(lastRender.leftSource, lastRender.rightSource, lastRender.options);
        setResultUi(true, true);
      }
      updateUrl();
    };

    const refreshNames = async (preferredName = '', autoRun = false) => {
      const left = leftSelect.value;
      const right = rightSelect.value;
      const module = moduleSelect.value;
      if (!left || !right || !module) return;
      const currentToken = ++token;
      setBusy(true);
      displayButton.disabled = true;
      runButton.disabled = true;
      try {
        const [leftList, rightList] = await Promise.all([
          activeSource.listNames(left, module),
          activeSource.listNames(right, module)
        ]);
        if (currentToken !== token) return;
        leftFiles = new Map(leftList.map(file => [file.name, file]));
        rightFiles = new Map(rightList.map(file => [file.name, file]));
        const rightNames = new Set(rightList.map(file => file.name));
        const names = leftList.map(file => file.name).filter(name => rightNames.has(name)).sort((a, b) => COLLATOR.compare(a, b));
        const selected = replaceOptions(nameSelect, names, preferredName);
        displayButton.disabled = names.length === 0;
        runButton.disabled = names.length === 0;
        if (!names.length) clearResult();
        else if (autoRun && selected) await runCompare();
      } catch {
        if (currentToken === token) clearResult();
      } finally {
        if (currentToken === token) setBusy(false);
      }
    };

    const refreshModules = async (preferredModule = '', preferredName = '', autoRun = false) => {
      const left = leftSelect.value;
      const right = rightSelect.value;
      if (!left || !right) return;
      const currentToken = ++token;
      setBusy(true);
      displayButton.disabled = true;
      runButton.disabled = true;
      try {
        const [leftModules, rightModules] = await Promise.all([
          activeSource.listModules(left),
          activeSource.listModules(right)
        ]);
        if (currentToken !== token) return;
        const rightSet = new Set(rightModules);
        const modules = leftModules.filter(module => rightSet.has(module)).sort((a, b) => COLLATOR.compare(a, b));
        const selected = replaceOptions(moduleSelect, modules, preferredModule || activeSource.defaultModule || '');
        if (!modules.length) clearResult();
        else await refreshNames(preferredName, autoRun && Boolean(selected));
      } catch {
        if (currentToken === token) clearResult();
      } finally {
        if (currentToken === token) setBusy(false);
      }
    };

    const refreshReleases = async preferred => {
      const currentToken = ++token;
      setBusy(true);
      clearResult();
      displayButton.disabled = true;
      runButton.disabled = true;
      try {
        const releases = (await activeSource.listReleases()).sort(compareReleaseNames);
        if (currentToken !== token || !releases.length) return;
        const leftDefault = releases.includes(preferred.left) ? preferred.left : releases.includes(activeSource.defaultLeft) ? activeSource.defaultLeft : releases[0];
        const preferredRight = releases.includes(preferred.right) ? preferred.right : releases.includes(activeSource.defaultRight) ? activeSource.defaultRight : releases.find(release => release !== leftDefault) || leftDefault;
        replaceOptions(leftSelect, releases, leftDefault);
        replaceOptions(rightSelect, releases, preferredRight !== leftDefault ? preferredRight : releases.find(release => release !== leftDefault) || leftDefault);
        await refreshModules(preferred.module, preferred.name, false);
      } catch {
        if (currentToken === token) clearResult();
      } finally {
        if (currentToken === token) setBusy(false);
      }
    };

    const currentFiles = () => {
      const name = nameSelect.value.trim();
      return { name, leftFile: leftFiles.get(name), rightFile: rightFiles.get(name) };
    };

    async function runDisplay() {
      const { name, leftFile } = currentFiles();
      if (!name || !leftFile) return;
      try {
        setBusy(true);
        await ensureDiffAssets(activeSource);
        const leftSource = await fetch(activeSource.sourceUrl(leftFile), { cache: 'force-cache' }).then(response => {
          if (!response.ok) throw new Error(`Failed to fetch source (${response.status})`);
          return response.text();
        });
        const options = { leftRelease: leftSelect.value, module: moduleSelect.value, leftFile };
        renderDisplay(leftSource, options);
        setLinks(leftFile, null);
        setResultUi(true, false);
        lastRender = { kind: activeKind, single: true, leftSource, options };
        rememberSelection();
        updateUrl();
      } catch {
        clearResult();
      } finally {
        setBusy(false);
      }
    }

    async function runCompare() {
      const { name, leftFile, rightFile } = currentFiles();
      if (!name || !leftFile || !rightFile) return;
      try {
        setBusy(true);
        await ensureDiffAssets(activeSource);
        const [leftSource, rightSource] = await Promise.all([leftFile, rightFile].map(file => fetch(activeSource.sourceUrl(file), { cache: 'force-cache' }).then(response => {
          if (!response.ok) throw new Error(`Failed to fetch source (${response.status})`);
          return response.text();
        })));
        const options = { leftRelease: leftSelect.value, rightRelease: rightSelect.value, module: moduleSelect.value, leftFile, rightFile };
        renderCompare(leftSource, rightSource, options);
        setLinks(leftFile, rightFile);
        setResultUi(true, true);
        lastRender = { kind: activeKind, single: false, leftSource, rightSource, options };
        rememberSelection();
        updateUrl();
      } catch {
        clearResult();
      } finally {
        setBusy(false);
      }
    }

    const populateSettings = () => {
      activeSource.renderSettings(settingsBody, rerender);
    };

    const centerSettings = () => {
      settingsDialog.style.left = `${Math.max(0, (settingsModal.clientWidth - settingsDialog.offsetWidth) / 2)}px`;
      settingsDialog.style.top = `${Math.max(0, (settingsModal.clientHeight - settingsDialog.offsetHeight) / 2)}px`;
      settingsDialog.dataset.positioned = 'true';
    };

    const openSettings = () => {
      populateSettings();
      settingsModal.hidden = false;
      document.body.classList.add('bindiff-settings-open');
      requestAnimationFrame(centerSettings);
    };

    const closeSettings = () => {
      settingsModal.hidden = true;
      document.body.classList.remove('bindiff-settings-open');
    };

    settingsHeader.addEventListener('pointerdown', event => {
      if (event.button !== 0 || settingsModal.hidden || event.target.closest('button')) return;
      event.preventDefault();
      if (settingsDialog.dataset.positioned !== 'true') centerSettings();
      const startX = event.clientX;
      const startY = event.clientY;
      const startLeft = settingsDialog.offsetLeft;
      const startTop = settingsDialog.offsetTop;
      const maxLeft = Math.max(0, settingsModal.clientWidth - settingsDialog.offsetWidth);
      const maxTop = Math.max(0, settingsModal.clientHeight - settingsDialog.offsetHeight);
      settingsHeader.setPointerCapture(event.pointerId);
      const onMove = moveEvent => {
        settingsDialog.style.left = `${Math.min(Math.max(0, startLeft + moveEvent.clientX - startX), maxLeft)}px`;
        settingsDialog.style.top = `${Math.min(Math.max(0, startTop + moveEvent.clientY - startY), maxTop)}px`;
      };
      const onUp = () => {
        settingsHeader.releasePointerCapture(event.pointerId);
        settingsHeader.removeEventListener('pointermove', onMove);
        settingsHeader.removeEventListener('pointerup', onUp);
      };
      settingsHeader.addEventListener('pointermove', onMove);
      settingsHeader.addEventListener('pointerup', onUp);
    });

    kindButtons.forEach(button => {
      button.addEventListener('click', async () => {
        const kind = button.dataset.kind;
        if (kind === activeKind) return;
        rememberSelection();
        setBusy(true);
        try {
          await ensureSource(kind);
          setKind(kind);
          await refreshReleases(selectionMemory.get(activeKind) || {});
          updateUrl();
        } finally {
          setBusy(false);
        }
      });
    });

    leftSelect.addEventListener('change', () => {
      clearResult();
      refreshModules(moduleSelect.value, nameSelect.value);
    });
    rightSelect.addEventListener('change', () => {
      clearResult();
      refreshModules(moduleSelect.value, nameSelect.value);
    });
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
    fontDecreaseButton.addEventListener('click', () => setFontSize(currentFontSize - 1));
    fontIncreaseButton.addEventListener('click', () => setFontSize(currentFontSize + 1));
    swapButton.addEventListener('click', () => {
      const previousLeft = leftSelect.value;
      leftSelect.value = rightSelect.value;
      rightSelect.value = previousLeft;
      refreshModules(moduleSelect.value, nameSelect.value, true);
    });
    viewButtons.forEach(button => {
      button.addEventListener('click', () => {
        if (button.dataset.mode === currentViewMode) return;
        setViewMode(button.dataset.mode);
        rerender();
      });
    });
    settingsButton.addEventListener('click', openSettings);
    settingsClose.addEventListener('click', closeSettings);
    settingsDone.addEventListener('click', closeSettings);
    settingsReset.addEventListener('click', () => {
      activeSource.resetSettings();
      populateSettings();
      rerender();
    });
    settingsModal.addEventListener('click', event => {
      if (event.target === settingsModal) closeSettings();
    });
    maximizeButton.addEventListener('click', () => {
      if (lastRender) setMaximized(!isMaximized);
    });
    window.addEventListener('resize', () => {
      if (settingsModal.hidden) return;
      centerSettings();
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (!settingsModal.hidden) {
        event.preventDefault();
        closeSettings();
      } else if (isMaximized) {
        event.preventDefault();
        setMaximized(false);
      }
    });
    document.addEventListener('nv:theme-change', () => {
      if (lastRender) applyRenderedTheme();
    });

    requestAnimationFrame(async () => {
      setBusy(true);
      try {
        const state = readUrlState();
        await ensureSource(state.kind);
        setKind(state.kind);
        setViewMode(state.mode);
        await refreshReleases(state);
      } finally {
        setBusy(false);
      }
    });
  }

  global.initDiff = initDiff;
})(window);
