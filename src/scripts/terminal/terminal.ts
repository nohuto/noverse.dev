/* Copyright (c) 2026 nohuto */
import { trackPointer } from '../dialogs/draggable';
import { applyBackground } from '../shell/background';
import { setTheme } from '../shell/theme';
import { pageRoutes } from '../../data/navigation';
import { backgrounds, themes, THEME_SYSTEM } from '../../data/themes';

const consoleHistory: string[] = [];
let consoleHistoryIndex = -1;
let consoleAnimationCleanup: (() => void) | null = null;

const ASCII_ART = [
  '  \\  |                                    ',
  '   \\ |   _ \\ \\ \\   /  _ \\   __|  __|   _ \\',
  ' |\\  |  (   | \\ \\ /   __/  |   \\__ \\   __/',
  '_| \\_| \\___/   \\_/  \\___| _|   ____/ \\___|',
];

const GITHUB_URL = 'https://github.com/nohuto';
const DISCORD_URL = 'https://discord.noverse.dev';

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(min, value), max);

function stopConsoleAnimation() {
  if (!consoleAnimationCleanup) return;
  consoleAnimationCleanup();
  consoleAnimationCleanup = null;
}

function initConsoleWindow() {
  const windowEl = document.getElementById('console-window')!;
  const handle = document.getElementById('console-drag')!;
  const parent = windowEl.parentElement!;
  let floatingStyles: string | null = null;
  let dragged = false;

  const isFloating = () => getComputedStyle(windowEl).position === 'absolute';

  const place = (left: number, top: number) => {
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    const x = clampNumber(left, 0, Math.max(0, width - windowEl.offsetWidth));
    const y = clampNumber(top, 0, Math.max(0, height - windowEl.offsetHeight));
    Object.assign(windowEl.style, {
      inset: 'auto',
      margin: '0',
      left: `${x}px`,
      top: `${y}px`,
      maxWidth: `${width - x}px`,
      maxHeight: `${height - y}px`,
    });
  };

  new ResizeObserver(() => {
    if (!isFloating()) {
      floatingStyles ??= windowEl.style.cssText;
      windowEl.style.cssText = '';
      return;
    }
    if (floatingStyles !== null) {
      windowEl.style.cssText = floatingStyles;
      floatingStyles = null;
    }
    if (dragged) return place(windowEl.offsetLeft, windowEl.offsetTop);
    windowEl.style.maxWidth = windowEl.style.maxHeight = '';
    place(
      (parent.clientWidth - windowEl.offsetWidth) / 2,
      (parent.clientHeight - windowEl.offsetHeight) / 2,
    );
  }).observe(parent);

  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !isFloating()) return;
    event.preventDefault();
    dragged = true;
    const startX = event.clientX - windowEl.offsetLeft;
    const startY = event.clientY - windowEl.offsetTop;
    trackPointer(handle, event, (current) =>
      place(current.clientX - startX, current.clientY - startY),
    );
  });
}

function initConsole() {
  const consoleRoot = document.getElementById('console')!;
  const output = document.getElementById('console-output')!;
  const lines = document.getElementById('console-lines')!;
  const form = document.getElementById('console-form') as HTMLFormElement;
  const input = document.getElementById('console-command') as HTMLInputElement;
  const preview = document.getElementById('console-preview')!;

  initConsoleWindow();

  const promptUser = 'nohuto';
  const promptHost = 'noverse';
  const rootPath = '~/terminal';
  let currentPath = rootPath;
  const promptEl = consoleRoot.querySelector('.console-prompt');
  const timestampEl = document.getElementById('console-timestamp');
  const DOCS_ROOT_PATH = `${rootPath}/docs`;
  const URL_PATTERN = /https?:\/\/[^\s<>"'`]+/i;
  let promptIndent = '';
  let promptMetricsDirty = true;
  let caretRaf = 0;
  let pendingLineFragment: DocumentFragment | null = null;
  const typedBeforeCaret = document.createTextNode('');
  const typedAfterCaret = document.createTextNode('');
  const caret = document.createElement('span');
  caret.className = 'console-block-cursor';
  const suggestion = document.createElement('span');
  suggestion.className = 'console-suggestion';
  preview.replaceChildren(typedBeforeCaret, caret, typedAfterCaret, suggestion);

  const setInputActive = (active: boolean) => {
    consoleRoot.dataset.inputActive = active ? 'true' : 'false';
  };

  const outputHasSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString())
      return false;
    return (
      output.contains(selection.anchorNode) ||
      output.contains(selection.focusNode)
    );
  };

  const invalidatePromptMetrics = () => {
    promptMetricsDirty = true;
  };

  const formatDisplayPath = (path: string) => {
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

  const promptLabel = () =>
    `${promptUser}@${promptHost}:${formatDisplayPath(currentPath)}$`;

  const updateTimestamp = () => {
    if (!timestampEl) return;
    const now = new Date();
    const day = new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
    }).format(now);
    const time = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(now);
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
      const options = listDirs().map((option) =>
        useBackslash ? option.replace(/\//g, '\\') : option,
      );
      const match = options.find((option) => option.startsWith(seed));
      return match ? `cd ${match}` : '';
    }
    if (
      (head === 'theme' || head === 'bg') &&
      (parts.length > 1 || hasTrailingSpace)
    ) {
      const seed = parts.length > 1 ? parts.slice(1).join(' ') : '';
      const options = head === 'theme' ? themeNames : backgroundNames;
      const match = options.find((option) => option.startsWith(seed));
      return match ? `${head} ${match}` : '';
    }
    if (parts.length > 1) return '';
    const commandMatch = commandNames.find((option) => option.startsWith(head));
    if (commandMatch) return commandMatch;
    return aliasNames.find((option) => option.startsWith(head)) || '';
  };

  const updatePreview = (value: string, pos: number) => {
    const completion = pos === value.length ? getCompletion() : '';
    const hint =
      completion !== value && completion.startsWith(value)
        ? completion.slice(value.length)
        : '';
    const code = value.codePointAt(pos);
    const next = code === undefined ? '' : String.fromCodePoint(code);
    const onChar = next !== '' && next !== '\n';
    typedBeforeCaret.nodeValue = value.slice(0, pos);
    caret.textContent = onChar ? next : hint[0] || ' ';
    caret.classList.toggle('console-suggestion', !onChar && hint !== '');
    typedAfterCaret.nodeValue = value.slice(onChar ? pos + next.length : pos);
    suggestion.textContent = hint.slice(1);
  };

  const resizeInput = () => {
    input.style.height = 'auto';
    input.style.height = `${input.scrollHeight}px`;
  };

  const updateCaret = () => {
    updatePromptIndent();
    resizeInput();
    const value = input.value;
    const pos =
      typeof input.selectionStart === 'number'
        ? input.selectionStart
        : value.length;
    updatePreview(value, pos);
  };

  const scheduleCaretUpdate = () => {
    if (caretRaf) return;
    caretRaf = requestAnimationFrame(() => {
      caretRaf = 0;
      updateCaret();
    });
  };

  const appendConsoleLine = (line: HTMLElement) => {
    if (pendingLineFragment) {
      pendingLineFragment.appendChild(line);
      return;
    }
    lines.appendChild(line);
    scrollToBottom();
  };

  const withLineBatch = (callback: () => void) => {
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

  const addLine = (text: string, className = '') => {
    const line = document.createElement('div');
    line.className = className ? `console-line ${className}` : 'console-line';
    line.textContent = text;
    appendConsoleLine(line);
  };

  const addLineParts = (
    parts: { text: string; className?: string }[],
    className = '',
  ) => {
    const line = document.createElement('div');
    line.className = className ? `console-line ${className}` : 'console-line';
    parts.forEach((part) => {
      const span = document.createElement('span');
      span.textContent = part.text;
      if (part.className) span.className = part.className;
      if (URL_PATTERN.test(part.text || '')) span.classList.add('link');
      line.appendChild(span);
    });
    appendConsoleLine(line);
  };

  const addNodeLine = (node: Node, className: string) => {
    const line = document.createElement('div');
    line.className = className ? `console-line ${className}` : 'console-line';
    line.appendChild(node);
    appendConsoleLine(line);
    return line;
  };

  const addIndentedLines = (items: readonly string[], className = '') => {
    items.forEach((item) => addLine(`  ${item}`, className));
  };

  const parseAnimationDimension = (value: string | undefined) => {
    if (value == null || value === '') return null;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return null;
    const match = normalized.match(/^(\d{1,5})(?:px)?$/);
    if (!match) return Number.NaN;
    const parsed = Number.parseInt(match[1], 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN;
  };

  const startTrippyAnimation = async (
    requestedWidth: number | null = null,
    requestedHeight: number | null = null,
  ) => {
    try {
      const { startTerminalAnimation } = await import('./animation');
      stopConsoleAnimation();
      consoleAnimationCleanup = startTerminalAnimation(
        { output, form, addNodeLine, scrollToBottom },
        requestedWidth,
        requestedHeight,
      );
    } catch {
      addLine('animation unavailable', 'muted');
    }
  };

  const extractFirstUrl = (text: string) => {
    if (!text) return null;
    const match = text.match(URL_PATTERN);
    return match ? match[0] : null;
  };

  const openConsoleUrlFromEvent = (event: MouseEvent) => {
    if (!(event.ctrlKey || event.metaKey)) return false;
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return false;

    const clickable = target.closest('a');
    if (clickable && clickable.getAttribute('href')) return false;

    const span = target.closest('span');
    const line = target.closest('.console-line');
    const url =
      extractFirstUrl(span?.textContent || '') ||
      extractFirstUrl(line?.textContent || '');
    if (!url) return false;

    event.preventDefault();
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  };

  const addKeyValueLines = (entries: [string, string][]) => {
    const width = entries.reduce((max, [key]) => Math.max(max, key.length), 0);
    entries.forEach(([key, value]) => {
      if (!value) {
        addLine(`  ${key}`);
        return;
      }
      addLineParts([
        { text: `  ${key.padEnd(width + 2)}` },
        { text: value, className: 'console-comment' },
      ]);
    });
  };

  const createLazyTool = (
    load: () => Promise<{ create: () => () => void }>,
  ) => {
    let tool: Promise<() => void> | undefined;
    return async () => {
      try {
        (await (tool ??= load().then((module) => module.create())))();
      } catch {
        tool = undefined;
        addLine('Tool unavailable. Please try again.', 'muted');
      }
    };
  };

  const openBitmaskTool = createLazyTool(() => import('./bitmask'));
  const openCalculatorTool = createLazyTool(() => import('./calculator'));

  const NAV_MAP: Record<string, string> = Object.fromEntries(
    pageRoutes.map((route) => [route.slug, route.path]),
  );
  const rootDirectories = [
    ...pageRoutes
      .filter((route) => route.slug !== 'terminal')
      .map((route) => route.slug),
    'docs',
  ];
  const normalizePath = (input: string) =>
    (input || '').replace(/\\/g, '/').trim();
  const trimSlashes = (value: string) =>
    (value || '').replace(/^\/+|\/+$/g, '');

  const resolvePath = (input: string) => {
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

    if (segments.length === 1 && rootDirectories.includes(segments[0])) {
      return `${rootPath}/${segments[0]}`;
    }
    return null;
  };

  const listDirs = () => {
    if (currentPath === rootPath) {
      return rootDirectories;
    }
    return ['..'];
  };

  const navigateToPath = (nextPath: string) => {
    if (
      nextPath === DOCS_ROOT_PATH ||
      nextPath.startsWith(`${DOCS_ROOT_PATH}/`)
    ) {
      const docsRelative =
        nextPath === DOCS_ROOT_PATH
          ? ''
          : nextPath.slice(DOCS_ROOT_PATH.length + 1);
      const cleanRelative = trimSlashes(docsRelative);
      const target = cleanRelative ? `/docs/${cleanRelative}/` : '/docs/';
      const currentPathname = location.pathname || '/';
      const normalizedCurrent = currentPathname.endsWith('/')
        ? currentPathname
        : `${currentPathname}/`;
      if (normalizedCurrent === target) return;
      location.href = target;
      return;
    }

    const segment =
      nextPath === rootPath
        ? 'terminal'
        : nextPath.slice(nextPath.lastIndexOf('/') + 1);
    const target = NAV_MAP[segment];
    if (!target) return;
    const currentPath = location.pathname.replace(/\/+$/g, '') || '/';
    if (currentPath === target) return;
    location.href = target;
  };

  const aliases: Readonly<Record<string, string>> = Object.freeze({
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
    cdiff: 'cd diff',
    cpolicies: 'cd policies',
    cdocs: 'cd docs',
    cabout: 'about',
    calculator: 'calc',
    quit: 'exit',
    '..': 'cd ..',
  });

  const expandAlias = (input: string) => {
    const parts = input.trim().split(/\s+/);
    const key = parts[0];
    const expansion = aliases[key];
    if (!expansion) return input;
    const rest = parts.slice(1).join(' ');
    return rest ? `${expansion} ${rest}` : expansion;
  };

  const themeNames: readonly string[] = themes.map(([value]) => value);
  const backgroundNames: readonly string[] = backgrounds;

  const commands: Record<string, (args: string[]) => void | Promise<void>> = {
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
        ['animation [x y]', 'some cool animation (x,y = pixels)'],
      ];
      const width = entries.reduce(
        (max, [cmd]) => Math.max(max, cmd.length),
        0,
      );
      entries.forEach(([cmd, desc]) => {
        addLineParts([
          { text: `  ${cmd.padEnd(width + 2)}` },
          { text: desc, className: 'console-comment' },
        ]);
      });
    },
    about: () => {
      addLine('about:');
      addKeyValueLines([
        ['name', 'nohuto (Discord: ".nohuto", 836853057235976232)'],
        ['proprietor', 'Noverse'],
        ['github', GITHUB_URL],
        ['discord', DISCORD_URL],
      ]);
    },
    bitmask: openBitmaskTool,
    calc: openCalculatorTool,
    contact: () => {
      addLine('contact:');
      addKeyValueLines([
        ['email', 'use the email icon to copy it'],
        ['discord', DISCORD_URL],
      ]);
    },
    github: () => {
      location.href = GITHUB_URL;
    },
    discord: () => {
      location.href = DISCORD_URL;
    },
    ascii: () => {
      ASCII_ART.forEach((line) => addLine(line, 'art'));
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
    cd: (args) => {
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
      addIndentedLines(themeNames);
    },
    bg: (args) => {
      if (!args.length) {
        addLine(`current bg: ${document.documentElement.dataset.bg}`);
        addLine('backgrounds:', 'muted');
        addIndentedLines(backgroundNames);
        return;
      }
      const next = args.join(' ').trim();
      if (!backgroundNames.includes(next)) {
        addLine(`bg not found: ${next}`, 'muted');
        return;
      }
      const applied = applyBackground(next, true);
      addLine(`bg set: ${applied}`);
    },
    theme: (args) => {
      if (!args.length) {
        addLine(
          `current theme: ${document.documentElement.dataset.themeSetting || THEME_SYSTEM}`,
        );
        return;
      }
      const next = args.join(' ').trim();
      if (!themeNames.includes(next)) {
        addLine(`theme not found: ${next}`, 'muted');
        return;
      }
      setTheme(next);
      addLine(`theme set: ${next}`);
    },
    animation: (args) => {
      const requestedWidth = parseAnimationDimension(args[0]);
      const requestedHeight = parseAnimationDimension(args[1]);
      if (
        Number.isNaN(requestedWidth) ||
        Number.isNaN(requestedHeight) ||
        args.length > 2
      ) {
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
      location.href = '/';
    },
  };
  const commandNames = Object.keys(commands).sort((a, b) => a.localeCompare(b));
  const aliasNames = Object.keys(aliases).sort((a, b) => a.localeCompare(b));

  const runCommand = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    addLineParts([
      { text: `${promptLabel()} `, className: 'console-prompt-text' },
      { text: trimmed, className: 'console-muted' },
    ]);
    const expanded = expandAlias(trimmed);
    const [head = '', ...args] = expanded.split(' ').filter(Boolean);
    const command = head.toLowerCase();
    const handler = commands[command];
    if (!handler) {
      addLine(`unknown command: ${command}`, 'muted');
      addLine('type "help" to list commands.', 'muted');
      return;
    }
    await handler(args);
  };

  const autocomplete = () => {
    const completion = getCompletion();
    if (!completion) return;
    input.value = completion;
    updateCaret();
  };

  form.addEventListener('submit', async (e) => {
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

  ['input', 'keyup', 'click', 'focus'].forEach((eventName) => {
    input.addEventListener(eventName, scheduleCaretUpdate);
  });
  new ResizeObserver(scheduleCaretUpdate).observe(form);
  input.addEventListener('focus', () => {
    setInputActive(true);
    scheduleCaretUpdate();
  });
  input.addEventListener('blur', () => {
    setInputActive(false);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
      return;
    }
    if (e.key === 'Tab' || e.key === 'ArrowRight') {
      if (e.key === 'ArrowRight') {
        const value = input.value;
        const pos =
          typeof input.selectionStart === 'number'
            ? input.selectionStart
            : value.length;
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
      consoleHistoryIndex = Math.min(
        consoleHistory.length,
        consoleHistoryIndex + 1,
      );
      input.value = consoleHistory[consoleHistoryIndex] || '';
      scheduleCaretUpdate();
    }
  });

  output.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    input.blur();
    setInputActive(false);
  });

  output.addEventListener('click', (event) => {
    if (openConsoleUrlFromEvent(event)) return;
    if (outputHasSelection()) return;
    input.focus();
  });

  document.addEventListener('keydown', (e) => {
    if (
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      ['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)
    )
      return;
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.tagName === 'BUTTON' ||
      target.isContentEditable
    )
      return;
    input.focus({ preventScroll: true });
  });

  updatePrompt();
  updatePromptIndent();
  updateTimestamp();
  setInterval(updateTimestamp, 60000);

  requestAnimationFrame(() => {
    input.focus({ preventScroll: true });
    setInputActive(true);
    scheduleCaretUpdate();
  });

  document.fonts.ready.then(() => {
    invalidatePromptMetrics();
    scheduleCaretUpdate();
  });

  withLineBatch(() => {
    ASCII_ART.forEach((line) => addLine(line, 'art'));
    addLine(' ');
    addLine(
      'A yet minimal terminal for navigation, customization, and webtools.',
      'muted',
    );
    addLine(' ');
    commands.help([]);
  });
  if (location.hash.toLowerCase() === '#bitmask') {
    openBitmaskTool();
  } else if (location.hash.toLowerCase() === '#calc') {
    openCalculatorTool();
  }
}
initConsole();
