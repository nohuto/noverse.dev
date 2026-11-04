import { initFloatingTool } from './tool';
import {
  evaluateExpression,
  formatNumber,
  shouldPreviewExpression,
} from './calc-engine';

export const create = () => {
  const layer = document.getElementById('calc-layer') as HTMLDialogElement;
  const dialog = document.getElementById('calc-window')!;
  const handle = document.getElementById('calc-drag')!;
  const closeButton = document.getElementById('calc-close')!;
  const input = document.getElementById('calc-input') as HTMLInputElement;
  const output = document.getElementById('calc-output')!;
  const resultEl = document.getElementById('calc-result')!;
  const meta = document.getElementById('calc-meta')!;
  const keypads = dialog.querySelector('.calc-keypads')!;

  const touchKeyboardMedia = window.matchMedia(
    '(pointer: coarse), (hover: none)',
  );
  const syncTouchKeyboard = () => {
    const suppressKeyboard = touchKeyboardMedia.matches;
    input.readOnly = suppressKeyboard;
    input.inputMode = suppressKeyboard ? 'none' : 'text';
  };

  let lastAnswer = 0;

  const updateMeta = (value: number) => {
    if (!Number.isSafeInteger(value) || value < 0) {
      meta.textContent = '';
      return;
    }
    meta.textContent = `hex 0x${value.toString(16).toUpperCase()}  bin 0b${value.toString(2)}`;
  };

  const renderDisplay = (result: string | null = null) => {
    let nextResult = result;
    const raw = input.value.trim();
    if (nextResult === null && raw && shouldPreviewExpression(raw)) {
      try {
        nextResult = formatNumber(evaluateExpression(raw, lastAnswer));
      } catch {
        nextResult = '';
      }
    }
    if (nextResult === null) nextResult = '';
    resultEl.textContent = nextResult;
  };

  const setInput = (value: string) => {
    input.value = value || '';
    input.focus({ preventScroll: true });
    input.setSelectionRange(input.value.length, input.value.length);
    renderDisplay();
  };

  const evaluateCurrent = () => {
    const raw = input.value.trim();
    if (!raw) return 0;
    const value = evaluateExpression(raw, lastAnswer);
    const formatted = formatNumber(value);
    lastAnswer = value;
    input.value = raw;
    input.setSelectionRange(input.value.length, input.value.length);
    renderDisplay(formatted);
    updateMeta(value);
    return value;
  };

  const showError = (error: unknown) => {
    resultEl.textContent = '';
    meta.textContent =
      (error instanceof Error && error.message) || 'invalid expression';
    input.setAttribute('aria-invalid', 'true');
  };

  const insertText = (text: string) => {
    input.removeAttribute('aria-invalid');
    const current = input.value;
    const start = input.selectionStart ?? current.length;
    const end = input.selectionEnd ?? current.length;
    input.value = `${current.slice(0, start)}${text}${current.slice(end)}`;
    const nextPosition = start + text.length;
    input.focus({ preventScroll: true });
    input.setSelectionRange(nextPosition, nextPosition);
    renderDisplay();
  };

  const handleAction = (action: string | undefined) => {
    input.removeAttribute('aria-invalid');
    if (action === 'clear') {
      meta.textContent = '';
      setInput('');
      return;
    }
    if (action === 'delete') {
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      const from = start === end ? Math.max(0, start - 1) : start;
      input.value = `${input.value.slice(0, from)}${input.value.slice(end)}`;
      input.focus({ preventScroll: true });
      input.setSelectionRange(from, from);
      renderDisplay();
      return;
    }
    if (action === 'move-left' || action === 'move-right') {
      const pos = input.selectionStart ?? input.value.length;
      const next = Math.min(
        Math.max(0, pos + (action === 'move-left' ? -1 : 1)),
        input.value.length,
      );
      input.focus({ preventScroll: true });
      input.setSelectionRange(next, next);
      return;
    }
    if (action === 'negate') {
      const raw = input.value.trim();
      setInput(
        raw.startsWith('-(') && raw.endsWith(')')
          ? raw.slice(2, -1)
          : `-(${raw || 0})`,
      );
      return;
    }
    if (action === 'evaluate') {
      try {
        evaluateCurrent();
      } catch (error) {
        showError(error);
      }
    }
  };

  keypads.addEventListener('click', (event) => {
    const button =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>('button')
        : null;
    if (!button) return;
    if (button.dataset.calcValue !== undefined) {
      insertText(button.dataset.calcValue);
      return;
    }
    handleAction(button.dataset.calcAction);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAction('evaluate');
      return;
    }
    if (
      event.key === 'Dead' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      insertText('^');
    }
  });
  input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    meta.textContent = '';
    renderDisplay();
  });
  output.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('.calc-result'))
      return;
    if (event.target !== input) input.focus({ preventScroll: true });
  });
  const open = initFloatingTool({
    layer,
    dialog,
    handle,
    closeButton,
    hash: 'calc',
    focusTarget: () => input,
  });
  touchKeyboardMedia.addEventListener('change', syncTouchKeyboard);
  syncTouchKeyboard();
  renderDisplay();
  return open;
};
