/* Copyright (c) 2026 Nohuto */
(function attachTerminal(global) {
  'use strict';

let consoleHistory = [];
let consoleHistoryIndex = -1;
let consoleTimestampTimer;
let consoleFocusListener;
let consoleResizeHandler;
let consolePageShowHandler;
let consolePointerUpHandler;
let consoleModeMedia;
let consoleModeChangeHandler;
let consoleClampRaf = 0;
let consoleAnimationCleanup = null;

const ASCII_ART = [
  '  \\  |                                    ',
  '   \\ |   _ \\ \\ \\   /  _ \\   __|  __|   _ \\',
  ' |\\  |  (   | \\ \\ /   __/  |   \\__ \\   __/',
  '_| \\_| \\___/   \\_/  \\___| _|   ____/ \\___|'
];

const GITHUB_URL = 'https://github.com/nohuto';
const DISCORD_URL = 'https://discord.noverse.dev';

const clampNumber = (value, min, max) => Math.min(Math.max(min, value), max);

function stopConsoleAnimation() {
  if (!consoleAnimationCleanup) return;
  consoleAnimationCleanup();
  consoleAnimationCleanup = null;
}

function initConsoleWindow() {
  const windowEl = document.getElementById('console-window');
  const handle = document.getElementById('console-drag');
  if (!windowEl || !handle) return;
  if (windowEl.dataset.ready === 'true') return;
  windowEl.dataset.ready = 'true';

  const parent = windowEl.parentElement;
  const compactMedia = window.matchMedia('(max-width: 720px)');
  let mode = '';
  let desktopGeometry = null;
  let positionTries = 0;
  let syncSizeRaf = 0;

  const getParentSize = () => {
    const rect = parent.getBoundingClientRect();
    return {
      width: Math.max(0, parent.clientWidth || rect.width || 0),
      height: Math.max(0, parent.clientHeight || rect.height || 0)
    };
  };

  const getWindowSize = () => ({
    width: Math.max(0, windowEl.offsetWidth || windowEl.getBoundingClientRect().width || 0),
    height: Math.max(0, windowEl.offsetHeight || windowEl.getBoundingClientRect().height || 0)
  });

  const getMetrics = () => {
    const parentSize = getParentSize();
    const windowSize = getWindowSize();
    return {
      parentWidth: parentSize.width,
      parentHeight: parentSize.height,
      windowWidth: windowSize.width,
      windowHeight: windowSize.height,
      maxLeft: Math.max(0, parentSize.width - windowSize.width),
      maxTop: Math.max(0, parentSize.height - windowSize.height)
    };
  };

  const isAbsoluteWindow = () => getComputedStyle(windowEl).position === 'absolute';

  const hasMetrics = metrics => metrics.parentWidth && metrics.parentHeight && metrics.windowWidth && metrics.windowHeight;

  const getSavedNumber = value => {
    const number = Number.parseFloat(value);
    return Number.isFinite(number) ? number : null;
  };

  const readDesktopGeometry = () => {
    const parentRect = parent.getBoundingClientRect();
    const rect = windowEl.getBoundingClientRect();
    return {
      left: getSavedNumber(windowEl.style.left) ?? rect.left - parentRect.left,
      top: getSavedNumber(windowEl.style.top) ?? rect.top - parentRect.top,
      width: windowEl.offsetWidth,
      height: windowEl.offsetHeight,
      userPositioned: windowEl.dataset.userPositioned === 'true' || Boolean(windowEl.style.width || windowEl.style.height)
    };
  };

  const rememberDesktopGeometry = (force = false) => {
    if (mode !== 'floating') return;
    if (compactMedia.matches && !force) return;
    desktopGeometry = readDesktopGeometry();
  };

  const clearGeometryStyles = () => {
    windowEl.style.transform = '';
    windowEl.style.inset = '';
    windowEl.style.margin = '';
    windowEl.style.left = '';
    windowEl.style.top = '';
    windowEl.style.width = '';
    windowEl.style.height = '';
    windowEl.style.maxWidth = '';
    windowEl.style.maxHeight = '';
    windowEl.style.willChange = '';
  };

  const updateResizeLimits = () => {
    if (mode !== 'floating') return;
    const parentSize = getParentSize();
    const left = getSavedNumber(windowEl.style.left) ?? windowEl.offsetLeft;
    const top = getSavedNumber(windowEl.style.top) ?? windowEl.offsetTop;
    windowEl.style.maxWidth = `${Math.max(0, parentSize.width - left)}px`;
    windowEl.style.maxHeight = `${Math.max(0, parentSize.height - top)}px`;
  };

  const syncRenderedSize = () => {
    if (mode !== 'floating') return;
    if (!windowEl.style.width && !windowEl.style.height) return;
    windowEl.style.width = `${windowEl.offsetWidth}px`;
    windowEl.style.height = `${windowEl.offsetHeight}px`;
    updateResizeLimits();
    desktopGeometry = readDesktopGeometry();
  };

  const scheduleSyncRenderedSize = () => {
    if (syncSizeRaf) return;
    syncSizeRaf = requestAnimationFrame(() => {
      syncSizeRaf = 0;
      syncRenderedSize();
    });
  };

  const setPosition = (left, top, metrics = getMetrics()) => {
    windowEl.style.transform = 'none';
    windowEl.style.right = 'auto';
    windowEl.style.bottom = 'auto';
    windowEl.style.margin = '0';
    windowEl.style.left = `${clampNumber(left, 0, metrics.maxLeft)}px`;
    windowEl.style.top = `${clampNumber(top, 0, metrics.maxTop)}px`;
    updateResizeLimits();
    windowEl.dataset.positioned = 'true';
  };

  const centerPosition = () => {
    if (mode !== 'floating' || !isAbsoluteWindow()) return true;
    const metrics = getMetrics();
    if (!hasMetrics(metrics)) {
      if (positionTries < 8) {
        positionTries += 1;
        requestAnimationFrame(centerPosition);
      }
      return false;
    }
    positionTries = 0;
    setPosition(metrics.maxLeft / 2, metrics.maxTop / 2, metrics);
    rememberDesktopGeometry();
    return true;
  };

  const materializeCurrentPosition = () => {
    if (mode !== 'floating' || !isAbsoluteWindow()) return;
    if (windowEl.dataset.positioned === 'true') {
      setPosition(windowEl.offsetLeft, windowEl.offsetTop);
      return;
    }
    const parentRect = parent.getBoundingClientRect();
    const rect = windowEl.getBoundingClientRect();
    setPosition(rect.left - parentRect.left, rect.top - parentRect.top);
  };

  const clampPosition = () => {
    if (mode !== 'floating') return;
    if (windowEl.dataset.userPositioned !== 'true') {
      centerPosition();
      return;
    }
    if (desktopGeometry) {
      const parentSize = getParentSize();
      if (desktopGeometry.width) {
        windowEl.style.width = `${Math.min(desktopGeometry.width, parentSize.width)}px`;
      }
      if (desktopGeometry.height) {
        windowEl.style.height = `${Math.min(desktopGeometry.height, parentSize.height)}px`;
      }
      setPosition(desktopGeometry.left, desktopGeometry.top);
      return;
    }
    setPosition(windowEl.offsetLeft, windowEl.offsetTop);
  };

  const scheduleClampPosition = () => {
    if (!document.contains(windowEl)) return;
    if (mode !== 'floating') return;
    if (consoleClampRaf) return;
    consoleClampRaf = requestAnimationFrame(() => {
      consoleClampRaf = 0;
      positionTries = 0;
      clampPosition();
    });
  };

  const restoreDesktopGeometry = () => {
    if (!desktopGeometry) {
      centerPosition();
      return;
    }
    const parentSize = getParentSize();
    if (desktopGeometry.width) {
      windowEl.style.width = `${Math.min(desktopGeometry.width, parentSize.width)}px`;
    }
    if (desktopGeometry.height) {
      windowEl.style.height = `${Math.min(desktopGeometry.height, parentSize.height)}px`;
    }
    if (desktopGeometry.userPositioned) {
      windowEl.dataset.userPositioned = 'true';
      setPosition(desktopGeometry.left, desktopGeometry.top);
      return;
    }
    delete windowEl.dataset.userPositioned;
    centerPosition();
  };

  const enterCompactMode = () => {
    if (mode === 'floating') rememberDesktopGeometry(true);
    mode = 'compact';
    windowEl.dataset.mode = 'compact';
    if (consoleClampRaf) {
      cancelAnimationFrame(consoleClampRaf);
      consoleClampRaf = 0;
    }
    clearGeometryStyles();
  };

  const enterFloatingMode = () => {
    mode = 'floating';
    windowEl.dataset.mode = 'floating';
    clearGeometryStyles();
    requestAnimationFrame(restoreDesktopGeometry);
  };

  const syncMode = () => {
    const nextMode = compactMedia.matches ? 'compact' : 'floating';
    if (nextMode === mode) {
      if (mode === 'floating') scheduleClampPosition();
      return;
    }
    if (nextMode === 'compact') {
      enterCompactMode();
      return;
    }
    enterFloatingMode();
  };

  if (consoleClampRaf) {
    cancelAnimationFrame(consoleClampRaf);
    consoleClampRaf = 0;
  }

  if (consoleResizeHandler) {
    window.removeEventListener('resize', consoleResizeHandler);
    window.visualViewport?.removeEventListener('resize', consoleResizeHandler);
  }
  if (consolePageShowHandler) {
    window.removeEventListener('pageshow', consolePageShowHandler);
  }
  if (consolePointerUpHandler) {
    window.removeEventListener('pointerup', consolePointerUpHandler);
  }
  if (consoleModeMedia && consoleModeChangeHandler) {
    if (consoleModeMedia.removeEventListener) {
      consoleModeMedia.removeEventListener('change', consoleModeChangeHandler);
    } else {
      consoleModeMedia.removeListener?.(consoleModeChangeHandler);
    }
  }
  consoleResizeHandler = syncMode;
  consolePageShowHandler = syncMode;
  consolePointerUpHandler = scheduleSyncRenderedSize;
  consoleModeMedia = compactMedia;
  consoleModeChangeHandler = syncMode;
  window.addEventListener('resize', consoleResizeHandler);
  window.visualViewport?.addEventListener('resize', consoleResizeHandler);
  window.addEventListener('pageshow', consolePageShowHandler);
  window.addEventListener('pointerup', consolePointerUpHandler);
  if (compactMedia.addEventListener) {
    compactMedia.addEventListener('change', consoleModeChangeHandler);
  } else {
    compactMedia.addListener?.(consoleModeChangeHandler);
  }

  syncMode();

  handle.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    if (mode !== 'floating' || !isAbsoluteWindow()) return;
    e.preventDefault();
    materializeCurrentPosition();
    windowEl.dataset.userPositioned = 'true';
    windowEl.style.transform = 'none';
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = windowEl.offsetLeft;
    const startTop = windowEl.offsetTop;
    const { maxLeft, maxTop } = getMetrics();
    let rafId = 0;
    let pendingX = startX;
    let pendingY = startY;
    let lastLeft = startLeft;
    let lastTop = startTop;

    handle.setPointerCapture(e.pointerId);
    windowEl.style.willChange = 'transform';

    const paintDrag = () => {
      rafId = 0;
      const dx = pendingX - startX;
      const dy = pendingY - startY;
      const nextLeft = clampNumber(startLeft + dx, 0, maxLeft);
      const nextTop = clampNumber(startTop + dy, 0, maxTop);
      lastLeft = nextLeft;
      lastTop = nextTop;
      windowEl.style.transform = `translate3d(${nextLeft - startLeft}px, ${nextTop - startTop}px, 0)`;
    };

    const onMove = ev => {
      pendingX = ev.clientX;
      pendingY = ev.clientY;
      if (rafId) return;
      rafId = requestAnimationFrame(paintDrag);
    };

    const onUp = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      paintDrag();
      windowEl.style.transform = 'none';
      windowEl.style.left = `${lastLeft}px`;
      windowEl.style.top = `${lastTop}px`;
      windowEl.style.willChange = '';
      if (handle.hasPointerCapture(e.pointerId)) {
        handle.releasePointerCapture(e.pointerId);
      }
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      desktopGeometry = readDesktopGeometry();
      clampPosition();
    };

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  });
}

function initConsole() {
  const consoleRoot = document.getElementById('console');
  const output = document.getElementById('console-output');
  const lines = document.getElementById('console-lines');
  const form = document.getElementById('console-form');
  const input = document.getElementById('console-command');
  const previewText = document.getElementById('console-preview-text');
  const suggestion = document.getElementById('console-suggestion');
  const caret = document.getElementById('console-cursor');
  const measure = document.getElementById('console-measure');
  if (!consoleRoot || !output || !lines || !form || !input || !previewText || !suggestion || !caret || !measure) return;
  if (consoleRoot.dataset.ready === 'true') return;
  consoleRoot.dataset.ready = 'true';

  initConsoleWindow();

  const promptUser = 'nohuto';
  const promptHost = 'noverse';
  const rootPath = '~/terminal';
  let currentPath = rootPath;
  const promptEl = consoleRoot.querySelector('.console-prompt');
  const timestampEl = document.getElementById('console-timestamp');
  const DOCS_ROOT_PATH = `${rootPath}/docs`;
  const URL_PATTERN = /https?:\/\/[^\s<>"'`]+/i;
  const CARET_HEIGHT_RATIO = 0.78;
  const CARET_Y_OFFSET = -2;
  let promptIndent = 0;
  let promptMetricsDirty = true;
  let caretRaf = 0;
  let pendingLineFragment = null;
  let measureState = {
    width: 0,
    font: '',
    lineHeight: '',
    lineHeightPx: 0,
    promptIndent: -1
  };
  const measureText = document.createTextNode('');
  const measureMarker = document.createElement('span');
  measureMarker.textContent = '\u200b';
  measure.append(measureText, measureMarker);

  const setInputActive = active => {
    consoleRoot.dataset.inputActive = active ? 'true' : 'false';
  };

  const outputHasSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString()) return false;
    return output.contains(selection.anchorNode) || output.contains(selection.focusNode);
  };

  const invalidatePromptMetrics = () => {
    promptMetricsDirty = true;
    measureState.promptIndent = -1;
  };

  const formatDisplayPath = path => {
    if (path === rootPath) return rootPath;
    if (path === DOCS_ROOT_PATH) return '~/docs';
    if (String(path || '').startsWith(`${DOCS_ROOT_PATH}/`)) {
      return String(path).replace(`${DOCS_ROOT_PATH}/`, '~/docs/');
    }
    if (String(path || '').startsWith(`${rootPath}/`)) {
      return String(path).replace(`${rootPath}/`, '~/');
    }
    return path;
  };

  const updatePrompt = () => {
    if (promptEl) {
      promptEl.textContent = `${promptUser}@${promptHost}:${formatDisplayPath(currentPath)}$`;
      invalidatePromptMetrics();
    }
  };

  const updatePromptIndent = (force = false) => {
    if (!promptEl) return promptIndent;
    if (!force && !promptMetricsDirty) return promptIndent;
    const nextIndent = `${promptEl.textContent.length + 1}ch`;
    if (nextIndent !== promptIndent) {
      promptIndent = nextIndent;
      form.style.setProperty('--console-prompt-indent', promptIndent);
    }
    promptMetricsDirty = false;
    return promptIndent;
  };

  const promptLabel = () => `${promptUser}@${promptHost}:${formatDisplayPath(currentPath)}$`;

  const updateTimestamp = () => {
    if (!timestampEl) return;
    const now = new Date();
    const day = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(now);
    const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(now);
    timestampEl.textContent = `${day} at ${time}`;
  };

  const scrollToBottom = () => {
    output.scrollTop = output.scrollHeight;
  };

  const getCompletion = () => {
    const raw = input.value;
    if (!raw) return '';
    const hasTrailingSpace = /\s$/.test(raw);
    const parts = raw.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    const head = parts[0];
    if (head === 'cd') {
      const cdMatch = raw.match(/^cd\s+(.+)$/);
      if (!cdMatch) return '';
      const seed = cdMatch[1];
      if (!seed) return '';
      const useBackslash = seed.startsWith('.\\');
      const options = listDirs().map(option => useBackslash ? option.replace(/\//g, '\\') : option);
      const match = options.find(option => option.startsWith(seed));
      return match ? `cd ${match}` : '';
    }
    if ((head === 'theme' || head === 'bg') && (parts.length > 1 || hasTrailingSpace)) {
      const seed = parts.length > 1 ? parts.slice(1).join(' ') : '';
      const options = head === 'theme' ? listThemes() : listBackgrounds();
      const match = options.find(option => option.startsWith(seed));
      return match ? `${head} ${match}` : '';
    }
    if (parts.length > 1) return '';
    const commandMatch = commandNames.find(option => option.startsWith(head));
    if (commandMatch) return commandMatch;
    return aliasNames.find(option => option.startsWith(head)) || '';
  };

  const updateSuggestion = (value, pos) => {
    previewText.textContent = value;
    if (!value || pos !== value.length) {
      suggestion.textContent = '';
      return;
    }
    const completion = getCompletion();
    if (!completion || completion === value || !completion.startsWith(value)) {
      suggestion.textContent = '';
      return;
    }
    suggestion.textContent = completion.slice(value.length);
  };

  const resizeInput = () => {
    if (!input.value.includes('\n')) {
      input.style.height = '';
      return;
    }
    input.style.height = 'auto';
    input.style.height = `${input.scrollHeight}px`;
  };

  const syncMeasureStyles = () => {
    const inputStyle = getComputedStyle(input);
    const width = input.clientWidth;
    const font = inputStyle.font;
    const lineHeight = inputStyle.lineHeight;
    if (
      width !== measureState.width ||
      font !== measureState.font ||
      lineHeight !== measureState.lineHeight ||
      promptIndent !== measureState.promptIndent
    ) {
      measure.style.width = `${width}px`;
      measure.style.font = font;
      measure.style.lineHeight = lineHeight;
      measureState = {
        width,
        font,
        lineHeight,
        lineHeightPx: Number.parseFloat(lineHeight) || input.offsetHeight,
        promptIndent
      };
    }
    return measureState;
  };

  const measureCaret = (value, pos) => {
    const metrics = syncMeasureStyles();
    measureText.nodeValue = value.slice(0, pos);
    const measureRect = measure.getBoundingClientRect();
    const markerRect = measureMarker.getBoundingClientRect();
    return {
      left: markerRect.left - measureRect.left,
      top: markerRect.top - measureRect.top,
      lineHeight: metrics.lineHeightPx
    };
  };

  const updateCaret = () => {
    updatePromptIndent();
    resizeInput();
    const value = input.value;
    const pos = typeof input.selectionStart === 'number' ? input.selectionStart : value.length;
    const caretBox = measureCaret(value, pos);
    const caretHeight = Math.round(caretBox.lineHeight * CARET_HEIGHT_RATIO);
    caret.style.left = `${caretBox.left + 1}px`;
    caret.style.top = `${Math.round(caretBox.top + (caretBox.lineHeight - caretHeight) / 2 + CARET_Y_OFFSET)}px`;
    caret.style.height = `${caretHeight}px`;
    updateSuggestion(value, pos);
  };

  const scheduleCaretUpdate = () => {
    if (caretRaf) return;
    caretRaf = requestAnimationFrame(() => {
      caretRaf = 0;
      updateCaret();
    });
  };

  const appendConsoleLine = line => {
    if (pendingLineFragment) {
      pendingLineFragment.appendChild(line);
      return;
    }
    lines.appendChild(line);
    scrollToBottom();
  };

  const withLineBatch = callback => {
    const previousFragment = pendingLineFragment;
    const fragment = document.createDocumentFragment();
    pendingLineFragment = fragment;
    try {
      callback();
    } finally {
      pendingLineFragment = previousFragment;
      if (previousFragment) {
        previousFragment.appendChild(fragment);
      } else {
        lines.appendChild(fragment);
        scrollToBottom();
      }
    }
  };

  const addLine = (text, className) => {
    const line = document.createElement('div');
    line.className = className ? `console-line ${className}` : 'console-line';
    line.textContent = text;
    appendConsoleLine(line);
  };

  const addLineParts = (parts, className) => {
    const line = document.createElement('div');
    line.className = className ? `console-line ${className}` : 'console-line';
    parts.forEach(part => {
      const span = document.createElement('span');
      span.textContent = part.text;
      if (part.className) span.className = part.className;
      if (URL_PATTERN.test(part.text || '')) span.classList.add('console-url');
      line.appendChild(span);
    });
    appendConsoleLine(line);
  };

  const addNodeLine = (node, className) => {
    const line = document.createElement('div');
    line.className = className ? `console-line ${className}` : 'console-line';
    line.appendChild(node);
    appendConsoleLine(line);
    return line;
  };

  const addIndentedLines = (items, className) => {
    items.forEach(item => addLine(`  ${item}`, className));
  };

  const parseAnimationDimension = value => {
    if (value == null || value === '') return null;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return null;
    const match = normalized.match(/^(\d{1,5})(?:px)?$/);
    if (!match) return Number.NaN;
    const parsed = Number.parseInt(match[1], 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN;
  };

  const startTrippyAnimation = (requestedWidth = null, requestedHeight = null) => {
    stopConsoleAnimation();

    const container = document.createElement('div');
    container.className = 'console-animation console-animation-trippy';

    const gridContainer = document.createElement('div');
    gridContainer.className = 'trippy-grid-container';

    const canvas = document.createElement('canvas');
    canvas.className = 'trippy-grid';
    canvas.setAttribute('aria-label', 'Terminal animation');

    gridContainer.appendChild(canvas);
    container.appendChild(gridContainer);

    const line = addNodeLine(container, 'console-animation-line');
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      addLine('animation unavailable: canvas is not supported', 'muted');
      line.remove();
      return;
    }

    const charRangeStart = 33;
    const charRangeEnd = 126;
    const charRangeMax = charRangeEnd - charRangeStart;
    const targetFrameMs = 1000 / 30;
    let cellWidth = 10;
    let cellHeight = 10;
    let colCount = 0;
    let rowCount = 0;
    let canvasWidth = 0;
    let canvasHeight = 0;
    let xTerms = new Float32Array(0);
    let yTerms = new Float32Array(0);
    let glyphAtlas = [];
    let palette = [];
    let rafId = 0;
    let lastFrame = 0;
    let stopped = false;

    const getThemePalette = () => {
      const rootStyle = getComputedStyle(document.documentElement);
      const nextPalette = [
        rootStyle.getPropertyValue('--accent').trim(),
        rootStyle.getPropertyValue('--accent-2').trim(),
        rootStyle.getPropertyValue('--text').trim(),
        rootStyle.getPropertyValue('--muted').trim(),
        rootStyle.getPropertyValue('--success').trim(),
        rootStyle.getPropertyValue('--warning').trim()
      ].filter(Boolean);
      return nextPalette.length ? nextPalette : ['#ffffff'];
    };

    const applyRequestedSize = () => {
      const lineWidth = Math.max(1, line.clientWidth);
      const outputHeight = Math.max(1, output.clientHeight);
      const inputHeight = form.offsetHeight || 0;
      const maxWidth = lineWidth;
      const maxHeight = Math.max(80, outputHeight - inputHeight - 12);
      const nextWidth = requestedWidth ? Math.min(requestedWidth, maxWidth) : maxWidth;
      const nextHeight = requestedHeight ? Math.min(requestedHeight, maxHeight) : Math.min(Math.max(145, outputHeight * 0.26), 230, maxHeight);
      gridContainer.style.width = `${Math.floor(nextWidth)}px`;
      gridContainer.style.height = `${Math.floor(nextHeight)}px`;
    };

    const buildGlyphAtlas = font => {
      glyphAtlas = palette.map(color => {
        const colorGlyphs = [];
        for (let code = 0; code < charRangeMax; code += 1) {
          const glyphCanvas = document.createElement('canvas');
          glyphCanvas.width = Math.ceil(cellWidth);
          glyphCanvas.height = Math.ceil(cellHeight);
          const glyphCtx = glyphCanvas.getContext('2d', { alpha: true });
          if (glyphCtx) {
            glyphCtx.font = font;
            glyphCtx.textBaseline = 'top';
            glyphCtx.fillStyle = color;
            glyphCtx.fillText(String.fromCharCode(charRangeStart + code), 0, 0);
          }
          colorGlyphs.push(glyphCanvas);
        }
        return colorGlyphs;
      });
    };

    const updateSize = () => {
      if (stopped) return;

      applyRequestedSize();

      const rect = gridContainer.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.floor(rect.width));
      const nextHeight = Math.max(1, Math.floor(rect.height));
      const gridStyle = getComputedStyle(canvas);
      const fontSize = parseFloat(gridStyle.fontSize) || 10;
      const lineHeight = parseFloat(gridStyle.lineHeight) || fontSize;
      const font = `${fontSize}px ${gridStyle.fontFamily}`;

      ctx.font = font;
      ctx.textBaseline = 'top';
      cellWidth = Math.max(1, ctx.measureText('M').width);
      cellHeight = Math.max(1, lineHeight);
      colCount = Math.max(1, Math.floor(nextWidth / cellWidth));
      rowCount = Math.max(1, Math.floor(nextHeight / cellHeight));
      canvasWidth = Math.ceil(colCount * cellWidth);
      canvasHeight = Math.ceil(rowCount * cellHeight);

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;

      ctx.imageSmoothingEnabled = false;
      palette = getThemePalette();
      buildGlyphAtlas(font);

      xTerms = new Float32Array(colCount);
      yTerms = new Float32Array(rowCount);
      const cx = Math.floor(colCount / 2);
      const cy = Math.floor(rowCount / 2);
      for (let x = 0; x < colCount; x += 1) xTerms[x] = Math.cos((x - cx) / 8.0);
      for (let y = 0; y < rowCount; y += 1) yTerms[y] = Math.sin((y - cy) / 8.0);

      scrollToBottom();
    };

    const render = ticks => {
      if (stopped || !line.isConnected) return;
      rafId = requestAnimationFrame(render);
      if (ticks - lastFrame < targetFrameMs) return;
      lastFrame = ticks;

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      const t = 100 + (ticks * 0.001);

      for (let y = 0; y < rowCount; y += 1) {
        const yTerm = yTerms[y];
        const drawY = y * cellHeight;
        for (let x = 0; x < colCount; x += 1) {
          const v = (xTerms[x] + yTerm + t) * 16;
          const charVal = Math.floor(v % charRangeMax);
          const glyphIndex = (charVal + charRangeMax) % charRangeMax;
          const colorIndex = glyphIndex % palette.length;
          ctx.drawImage(glyphAtlas[colorIndex][glyphIndex], x * cellWidth, drawY);
        }
      }
    };

    const resizeObserver = window.ResizeObserver ? new ResizeObserver(updateSize) : null;
    const handleThemeChange = updateSize;
    resizeObserver?.observe(line);
    resizeObserver?.observe(output);
    document.addEventListener('nv:theme-change', handleThemeChange);
    requestAnimationFrame(() => {
      updateSize();
      rafId = requestAnimationFrame(render);
    });

    consoleAnimationCleanup = () => {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      document.removeEventListener('nv:theme-change', handleThemeChange);
      if (line.isConnected) line.remove();
    };
  };

  const extractFirstUrl = text => {
    if (!text) return null;
    const match = text.match(URL_PATTERN);
    return match ? match[0] : null;
  };

  const openConsoleUrlFromEvent = event => {
    if (!(event.ctrlKey || event.metaKey)) return false;
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return false;

    const clickable = target.closest('a');
    if (clickable && clickable.getAttribute('href')) return false;

    const span = target.closest('span');
    const line = target.closest('.console-line');
    const url = extractFirstUrl(span?.textContent || '') || extractFirstUrl(line?.textContent || '');
    if (!url) return false;

    event.preventDefault();
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  };

  const addKeyValueLines = entries => {
    const width = entries.reduce((max, [key]) => Math.max(max, key.length), 0);
    entries.forEach(([key, value]) => {
      if (!value) {
        addLine(`  ${key}`);
        return;
      }
      addLineParts([
        { text: `  ${key.padEnd(width + 2)}` },
        { text: value, className: 'console-comment' }
      ]);
    });
  };

  const initFloatingTool = ({ layer, dialog, handle, closeButton, hash, focusTarget }) => {
    let restoreFocus = null;
    const targetHash = `#${hash}`;
    const isHashActive = () => location.hash.toLowerCase() === targetHash;
    const syncHash = active => {
      if (active === isHashActive()) return;
      const nextHash = active ? targetHash : '';
      history.replaceState(history.state, '', `${location.pathname}${location.search}${nextHash}`);
    };
    const clamp = () => {
      if (layer.hidden) return;
      const maxLeft = Math.max(12, layer.clientWidth - dialog.offsetWidth - 12);
      const maxTop = Math.max(12, layer.clientHeight - dialog.offsetHeight - 12);
      dialog.style.left = `${clampNumber(dialog.offsetLeft, 12, maxLeft)}px`;
      dialog.style.top = `${clampNumber(dialog.offsetTop, 12, maxTop)}px`;
    };
    const center = () => {
      dialog.style.left = `${Math.max(12, (layer.clientWidth - dialog.offsetWidth) / 2)}px`;
      const freeY = layer.clientHeight - dialog.offsetHeight;
      const centerY = freeY / 2;
      const topBiased = layer.clientWidth <= 580 || dialog.offsetHeight > layer.clientHeight * 0.6;
      dialog.style.top = `${Math.max(12, topBiased ? Math.min(centerY, 24) : centerY)}px`;
    };
    const close = (syncUrl = true) => {
      layer.hidden = true;
      if (syncUrl) syncHash(false);
      restoreFocus?.focus({ preventScroll: true });
    };
    const open = (syncUrl = true) => {
      if (syncUrl) syncHash(true);
      if (!layer.hidden) return;
      restoreFocus = document.activeElement;
      layer.hidden = false;
      requestAnimationFrame(() => {
        if (dialog.dataset.positioned !== 'true') center();
        else clamp();
        focusTarget?.()?.focus({ preventScroll: true });
      });
    };
    const onLayerClick = event => {
      if (event.target === layer) close();
    };
    const onKeyDown = event => {
      if (event.key === 'Escape' && !layer.hidden) close();
    };
    const onHashChange = () => {
      if (isHashActive()) open(false);
      else if (!layer.hidden) close(false);
    };
    const onCloseClick = () => close();
    const onDragStart = event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      event.preventDefault();
      const startX = event.clientX;
      const startY = event.clientY;
      const startLeft = dialog.offsetLeft;
      const startTop = dialog.offsetTop;
      const maxLeft = Math.max(12, layer.clientWidth - dialog.offsetWidth - 12);
      const maxTop = Math.max(12, layer.clientHeight - dialog.offsetHeight - 12);
      handle.setPointerCapture(event.pointerId);

      const move = moveEvent => {
        dialog.style.left = `${clampNumber(startLeft + moveEvent.clientX - startX, 12, maxLeft)}px`;
        dialog.style.top = `${clampNumber(startTop + moveEvent.clientY - startY, 12, maxTop)}px`;
      };
      const stop = () => {
        dialog.dataset.positioned = 'true';
        if (handle.hasPointerCapture(event.pointerId)) {
          handle.releasePointerCapture(event.pointerId);
        }
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', stop);
        handle.removeEventListener('pointercancel', stop);
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', stop);
      handle.addEventListener('pointercancel', stop);
    };

    closeButton.addEventListener('click', onCloseClick);
    layer.addEventListener('click', onLayerClick);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('hashchange', onHashChange);
    handle.addEventListener('pointerdown', onDragStart);

    const resizeObserver = window.ResizeObserver ? new ResizeObserver(clamp) : null;
    resizeObserver?.observe(dialog);
    window.addEventListener('resize', clamp);
    const directOpenFrame = requestAnimationFrame(onHashChange);
    return {
      open,
      close,
      cleanup: () => {
        cancelAnimationFrame(directOpenFrame);
        resizeObserver?.disconnect();
        closeButton.removeEventListener('click', onCloseClick);
        layer.removeEventListener('click', onLayerClick);
        document.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('hashchange', onHashChange);
        window.removeEventListener('resize', clamp);
        handle.removeEventListener('pointerdown', onDragStart);
      }
    };
  };

  const loadTerminalTool = (() => {
    const promises = new Map();
    return src => {
      if (!promises.has(src)) {
        promises.set(src, new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = src;
          script.async = true;
          script.onload = resolve;
          script.onerror = () => {
            promises.delete(src);
            reject(new Error(`failed to load ${src}`));
          };
          document.head.appendChild(script);
        }));
      }
      return promises.get(src);
    };
  })();

  const createLazyTool = (src, globalName, createOptions) => {
    let open = null;
    return async () => {
      try {
        await loadTerminalTool(src);
      } catch (error) {
        addLine(error.message, 'muted');
        return;
      }
      open ||= global[globalName]?.create(createOptions());
      open?.();
    };
  };

  const openBitmaskTool = createLazyTool(
    '/main/min/terminal-bitmask.min.js',
    'NoverseBitmask',
    () => ({ initFloatingTool })
  );
  const openCalculatorTool = createLazyTool(
    '/main/min/terminal-calc.min.js',
    'NoverseCalculator',
    () => ({ initFloatingTool, clampNumber })
  );

  const normalizePath = input => (input || '').replace(/\\/g, '/').trim();
  const trimSlashes = value => (value || '').replace(/^\/+|\/+$/g, '');

  const resolvePath = input => {
    if (!input) return rootPath;
    let raw = normalizePath(input);
    if (!raw || raw === '~' || raw === '/' || raw === rootPath) return rootPath;
    if (raw === '.' || raw === './' || raw === '.\\') return currentPath;
    if (raw === '..' || raw.startsWith('../')) return rootPath;
    if (raw.startsWith('~/')) raw = raw.slice(2);
    if (raw.startsWith(`${rootPath}/`)) raw = raw.slice(rootPath.length + 1);
    if (raw.startsWith('./')) raw = raw.slice(2);
    if (raw === 'terminal') return rootPath;
    if (raw.startsWith('terminal/')) raw = raw.slice(9);
    raw = raw.replace(/^\/+/, '');

    const segments = raw.split('/').filter(Boolean);
    if (!segments.length) return rootPath;
    if (segments[0] === 'terminal') return rootPath;

    if (segments[0] === 'docs') {
      const docsTail = trimSlashes(segments.slice(1).join('/'));
      return docsTail ? `${DOCS_ROOT_PATH}/${docsTail}` : DOCS_ROOT_PATH;
    }

    if (segments.length === 1 && ['product', 'projects', 'bin-diff', 'policies'].includes(segments[0])) {
      return `${rootPath}/${segments[0]}`;
    }
    return null;
  };

  const listDirs = () => {
    if (currentPath === rootPath) {
      return ['product', 'projects', 'bin-diff', 'policies', 'docs'];
    }
    return ['..'];
  };

  const NAV_MAP = Object.fromEntries((window.NV_MAIN_ROUTES || [
    { slug: 'terminal', clean: '/' },
    { slug: 'product', clean: '/product' },
    { slug: 'projects', clean: '/projects' },
    { slug: 'bin-diff', clean: '/bin-diff' },
    { slug: 'policies', clean: '/policies' }
  ]).map(route => [route.slug, route.clean]));

  const navigateToPath = nextPath => {
    if (nextPath === DOCS_ROOT_PATH || nextPath.startsWith(`${DOCS_ROOT_PATH}/`)) {
      const docsRelative = nextPath === DOCS_ROOT_PATH ? '' : nextPath.slice(DOCS_ROOT_PATH.length + 1);
      const cleanRelative = trimSlashes(docsRelative);
      const target = cleanRelative ? `docs/${cleanRelative}/` : 'docs/';
      const currentPathname = (location.pathname || '').replace(/^\/+/, '');
      const normalizedCurrent = currentPathname.endsWith('/') ? currentPathname : `${currentPathname}/`;
      if (normalizedCurrent === target) return;
      location.href = target;
      return;
    }

    const segment = nextPath === rootPath ? 'terminal' : nextPath.split('/').pop();
    const target = NAV_MAP[segment];
    if (!target) return;
    const currentPath = location.pathname.replace(/\/+$/g, '') || '/';
    if (currentPath === target) return;
    loadPage(target);
  };

  const aliases = Object.freeze({
    h: 'help',
    '?': 'help',
    usage: 'help',
    cmds: 'help',
    commands: 'help',
    cls: 'clear',
    dir: 'ls',
    ll: 'ls',
    la: 'ls',
    cprod: 'cd product',
    cproj: 'cd projects',
    cbindiff: 'cd bin-diff',
    cpolicies: 'cd policies',
    cdocs: 'cd docs',
    cabout: 'about',
    calculator: 'calc',
    quit: 'exit',
    '..': 'cd ..'
  });

  const expandAlias = input => {
    const parts = input.trim().split(/\s+/);
    const key = parts[0];
    const expansion = aliases[key];
    if (!expansion) return input;
    const rest = parts.slice(1).join(' ');
    return rest ? `${expansion} ${rest}` : expansion;
  };

  const listThemes = () => {
    const select = document.getElementById('theme-select');
    if (!select) return [];
    return Array.from(select.options).map(option => option.value);
  };

  const listBackgrounds = () => {
    const keys = window.NV_BACKGROUND_KEYS;
    return Array.isArray(keys) ? keys.slice() : [];
  };

  const commands = {
    help: () => {
      addLine('commands:');
      const entries = [
        ['help', 'show this command list'],
        ['about', 'about me + links'],
        ['contact', 'email + discord'],
        ['github', 'redirection to profile'],
        ['discord', 'redirection to server'],
        ['bitmask', '32 bit bitmask calculator'],
        ['calc', 'scientific calculator'],
        ['bg', 'list background names'],
        ['bg <name>', 'set background'],
        ['themes', 'list theme names'],
        ['theme <name>', 'set theme'],
        ['ascii', 'print the banner'],
        ['animation [x y]', 'some cool animation (x,y = pixels)']
      ];
      const width = entries.reduce((max, [cmd]) => Math.max(max, cmd.length), 0);
      entries.forEach(([cmd, desc]) => {
        addLineParts([
          { text: `  ${cmd.padEnd(width + 2)}` },
          { text: desc, className: 'console-comment' }
        ]);
      });
    },
    about: () => {
      addLine('about:');
      addKeyValueLines([
        ['name', 'nohuto (Discord: ".nohuto", 836853057235976232)'],
        ['proprietor', 'Noverse'],
        ['github', GITHUB_URL],
        /*['youtube', 'https://www.youtube.com/@5Noverse'],*/
        ['discord', DISCORD_URL]
      ]);
    },
    bitmask: openBitmaskTool,
    calc: openCalculatorTool,
    contact: () => {
      addLine('contact:');
      addKeyValueLines([
        ['email', 'use the footer icon to copy it'],
        ['discord', DISCORD_URL]
      ]);
    },
    github: () => {
      location.href = GITHUB_URL;
    },
    discord: () => {
      location.href = DISCORD_URL;
    },
    ascii: () => {
      ASCII_ART.forEach(line => addLine(line, 'art'));
    },
    ls: () => {
      const entries = listDirs();
      if (!entries.length) {
        addLine('empty', 'muted');
        return;
      }
      addLine(entries.join('  '), 'muted');
    },
    pwd: () => {
      addLine(formatDisplayPath(currentPath));
    },
    cd: args => {
      const target = args.join(' ');
      const nextPath = resolvePath(target);
      if (!nextPath) {
        addLine(`cd: no such directory: ${target || ''}`.trim(), 'muted');
        return;
      }
      currentPath = nextPath;
      updatePrompt();
      navigateToPath(nextPath);
    },
    themes: () => {
      addLine('themes:', 'muted');
      addIndentedLines(listThemes());
    },
    bg: args => {
      const backgrounds = listBackgrounds();
      if (!backgrounds.length) return;
      if (!args.length) {
        addLine(`current bg: ${document.documentElement.getAttribute('data-bg') || 'dots'}`);
        addLine('backgrounds:', 'muted');
        addIndentedLines(backgrounds);
        return;
      }
      const next = args.join(' ').trim();
      if (!backgrounds.includes(next)) {
        addLine(`bg not found: ${next}`, 'muted');
        return;
      }
      const applied = typeof window.NV_APPLY_BACKGROUND === 'function'
        ? window.NV_APPLY_BACKGROUND(next)
        : next;
      addLine(`bg set: ${applied}`);
    },
    theme: args => {
      const select = document.getElementById('theme-select');
      if (!select) return;
      if (!args.length) {
        addLine(`current theme: ${select.value}`);
        return;
      }
      const next = args.join(' ').trim();
      if (!hasSelectOption(select, next)) {
        addLine(`theme not found: ${next}`, 'muted');
        return;
      }
      select.value = next;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      addLine(`theme set: ${next}`);
    },
    animation: args => {
      const requestedWidth = parseAnimationDimension(args[0]);
      const requestedHeight = parseAnimationDimension(args[1]);
      if (Number.isNaN(requestedWidth) || Number.isNaN(requestedHeight) || args.length > 2) {
        addLine('usage: animation [width] [height]', 'muted');
        addLine('example: animation 900 180', 'muted');
        return;
      }
      addLine('animation', 'muted');
      startTrippyAnimation(requestedWidth, requestedHeight);
    },
    clear: () => {
      stopConsoleAnimation();
      lines.replaceChildren();
      scrollToBottom();
    },
    exit: () => {
      stopConsoleAnimation();
      terminalExited = true;
      applyTerminalExitState();
      loadPage('/projects');
    },
  };
  const commandNames = Object.keys(commands).sort((a, b) => a.localeCompare(b));
  const aliasNames = Object.keys(aliases).sort((a, b) => a.localeCompare(b));

  const runCommand = async raw => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    addLineParts([
      { text: `${promptLabel()} `, className: 'console-prompt-text' },
      { text: trimmed, className: 'console-muted' }
    ]);
    const expanded = expandAlias(trimmed);
    const parts = expanded.split(' ').filter(Boolean);
    const command = parts.shift().toLowerCase();
    const handler = commands[command];
    if (!handler) {
      addLine(`unknown command: ${command}`, 'muted');
      addLine('type "help" to list commands.', 'muted');
      return;
    }
    await handler(parts);
  };

  const autocomplete = () => {
    const completion = getCompletion();
    if (!completion) return;
    input.value = completion;
    updateCaret();
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const value = input.value;
    if (value.trim()) {
      consoleHistory.push(value);
      consoleHistoryIndex = consoleHistory.length;
    }
    input.value = '';
    scheduleCaretUpdate();
    await runCommand(value);
    scrollToBottom();
  });

  ['input', 'keyup', 'click', 'focus'].forEach(eventName => {
    input.addEventListener(eventName, scheduleCaretUpdate);
  });
  input.addEventListener('focus', () => {
    setInputActive(true);
    scheduleCaretUpdate();
  });
  input.addEventListener('blur', () => {
    setInputActive(false);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
      return;
    }
    if (e.key === 'Tab' || e.key === 'ArrowRight') {
      if (e.key === 'ArrowRight') {
        const value = input.value;
        const pos = typeof input.selectionStart === 'number' ? input.selectionStart : value.length;
        const completion = getCompletion();
        const canApply =
          pos === value.length &&
          completion &&
          completion !== value &&
          completion.startsWith(value);
        if (!canApply) return;
      }
      e.preventDefault();
      autocomplete();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (consoleHistory.length === 0) return;
      consoleHistoryIndex = Math.max(0, consoleHistoryIndex - 1);
      input.value = consoleHistory[consoleHistoryIndex] || '';
      scheduleCaretUpdate();
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (consoleHistory.length === 0) return;
      consoleHistoryIndex = Math.min(consoleHistory.length, consoleHistoryIndex + 1);
      input.value = consoleHistory[consoleHistoryIndex] || '';
      scheduleCaretUpdate();
    }
  });

  output.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    input.blur();
    setInputActive(false);
  });

  output.addEventListener('click', event => {
    if (openConsoleUrlFromEvent(event)) return;
    if (outputHasSelection()) return;
    input.focus();
  });

  if (!consoleFocusListener) {
    consoleFocusListener = e => {
      const activeInput = document.getElementById('console-command');
      if (!activeInput) return;
      if (e.ctrlKey || e.metaKey || e.altKey || ['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) return;
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.tagName === 'BUTTON' || target.isContentEditable)) {
        return;
      }
      activeInput.focus({ preventScroll: true });
    };
    document.addEventListener('keydown', consoleFocusListener);
  }

  updatePrompt();
  updatePromptIndent();
  updateTimestamp();
  if (consoleTimestampTimer) {
    clearInterval(consoleTimestampTimer);
  }
  consoleTimestampTimer = setInterval(updateTimestamp, 60000);

  requestAnimationFrame(() => {
    input.focus({ preventScroll: true });
    setInputActive(true);
    scheduleCaretUpdate();
  });

  withLineBatch(() => {
    ASCII_ART.forEach(line => addLine(line, 'art'));
    addLine(' ');
    addLine('A yet minimal terminal for navigation, customization, and webtools. Use the top sections if it feels unfamiliar.', 'muted');
    addLine(' ');
    commands.help();
  });
  if (location.hash.toLowerCase() === '#bitmask') {
    openBitmaskTool();
  } else if (location.hash.toLowerCase() === '#calc') {
    openCalculatorTool();
  }
}
  global.stopConsoleAnimation = stopConsoleAnimation;
  global.initConsole = initConsole;
})(window);
