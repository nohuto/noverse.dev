import { trackPointer } from '../dialogs/draggable';
import { copyText, emailAddress } from '../shell/clipboard';
import { applyBackground } from '../shell/background';
import { isInteractiveTarget } from '../shell/typing-target';
import { setTheme } from '../shell/theme';
import {
  formatDisplayPath,
  getNavigationTarget,
  listDirs,
  resolvePath,
  rootPath,
} from './paths';
import { completeCommand, parseCommand } from './commands';
import { backgrounds, themes, THEME_SYSTEM } from '../../data/themes';

const TIMESTAMP_REFRESH_MS = 60_000;
const consoleHistory: string[] = [];
let consoleHistoryIndex = -1;
let consoleAnimationCleanup: (() => void) | null = null;
let consoleAnimationRequest = 0;

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
  consoleAnimationRequest++;
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
  const input = document.getElementById(
    'console-command',
  ) as HTMLTextAreaElement;
  const preview = document.getElementById('console-preview')!;

  initConsoleWindow();

  const promptUser = 'nohuto';
  const promptHost = 'noverse';
  let currentPath = rootPath;
  const promptEl = consoleRoot.querySelector('.console-prompt');
  const timestampEl = document.getElementById('console-timestamp');
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
    const day = new Intl.DateTimeFormat('en-US', {
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

  const getCompletion = () =>
    completeCommand(input.value, {
      dirs: listDirs(currentPath),
      commandNames,
      themeNames,
      backgroundNames,
    });

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
      stopConsoleAnimation();
      const request = consoleAnimationRequest;
      const { startTerminalAnimation } = await import('./animation');
      if (request !== consoleAnimationRequest) return;
      consoleAnimationCleanup = startTerminalAnimation(
        { output, form, addNodeLine, scrollToBottom },
        requestedWidth,
        requestedHeight,
      );
    } catch (error) {
      console.error(error);
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
      } catch (error) {
        console.error(error);
        tool = undefined;
        addLine('Tool unavailable. Please try again.', 'muted');
      }
    };
  };

  const openBitmaskTool = createLazyTool(() => import('./bitmask'));
  const openCalculatorTool = createLazyTool(() => import('./calculator'));

  const navigateToPath = (nextPath: string) => {
    const target = getNavigationTarget(nextPath, location.pathname);
    if (target) location.href = target;
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
    contact: async () => {
      const copied = await copyText(emailAddress());
      addLine('contact:');
      addKeyValueLines([
        [
          'email',
          copied
            ? 'copied to the clipboard'
            : 'copy failed, use the email icon on noverse.dev',
        ],
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
      const entries = listDirs(currentPath);
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
      const nextPath = resolvePath(target, currentPath);
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
      const applied = applyBackground(next, { persist: true });
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

  const runCommand = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    addLineParts([
      { text: `${promptLabel()} `, className: 'console-prompt-text' },
      { text: trimmed, className: 'console-muted' },
    ]);
    const { command, args } = parseCommand(trimmed);
    const handler = Object.hasOwn(commands, command)
      ? commands[command]
      : undefined;
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
    if ((e.key === 'Tab' && !e.shiftKey) || e.key === 'ArrowRight') {
      const value = input.value;
      const completion = getCompletion();
      const canApply =
        input.selectionStart === value.length &&
        completion &&
        completion !== value &&
        completion.startsWith(value);
      if (!canApply) return;
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
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
    if (isInteractiveTarget(e.target)) return;
    input.focus({ preventScroll: true });
  });

  updatePrompt();
  updatePromptIndent();
  updateTimestamp();
  setInterval(updateTimestamp, TIMESTAMP_REFRESH_MS);

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
