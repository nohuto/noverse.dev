/* Copyright (c) 2026 Nohuto */
(function attachNoverseCalculator(global) {
  'use strict';

  let calcCleanup = null;

  global.NoverseCalculator = {
    create({ initFloatingTool, clampNumber }) {
    calcCleanup?.();
    const layer = document.getElementById('calc-layer');
    const dialog = document.getElementById('calc-window');
    const handle = document.getElementById('calc-drag');
    const closeButton = document.getElementById('calc-close');
    const input = document.getElementById('calc-input');
    const output = document.getElementById('calc-output');
    const resultEl = document.getElementById('calc-result');
    const meta = document.getElementById('calc-meta');
    const keypads = dialog?.querySelector('.calc-keypads');
    if (!layer || !dialog || !handle || !closeButton || !input || !output || !resultEl || !meta || !keypads) {
      return () => {};
    }

    const touchKeyboardMedia = window.matchMedia('(pointer: coarse), (hover: none)');
    const syncTouchKeyboard = () => {
      const suppressKeyboard = touchKeyboardMedia.matches;
      input.readOnly = suppressKeyboard;
      input.inputMode = suppressKeyboard ? 'none' : 'text';
    };

    let lastAnswer = 0;
    const constants = Object.freeze({
      pi: Math.PI,
      e: Math.E,
      tau: Math.PI * 2
    });
    const functions = Object.freeze({
      abs: Math.abs,
      acos: Math.acos,
      asin: Math.asin,
      atan: Math.atan,
      ceil: Math.ceil,
      cos: Math.cos,
      floor: Math.floor,
      ln: Math.log,
      log: Math.log10,
      max: Math.max,
      min: Math.min,
      pow: Math.pow,
      round: Math.round,
      sin: Math.sin,
      sqrt: Math.sqrt,
      tan: Math.tan
    });
    const binaryOps = Object.freeze({
      '+': { precedence: 1, assoc: 'left', fn: (a, b) => a + b },
      '-': { precedence: 1, assoc: 'left', fn: (a, b) => a - b },
      '*': { precedence: 2, assoc: 'left', fn: (a, b) => a * b },
      '/': { precedence: 2, assoc: 'left', fn: (a, b) => {
        if (b === 0) throw new Error('division by zero');
        return a / b;
      } },
      '%': { precedence: 2, assoc: 'left', fn: (a, b) => {
        if (b === 0) throw new Error('modulo by zero');
        return a % b;
      } },
      '^': { precedence: 4, assoc: 'right', fn: (a, b) => a ** b }
    });
    const previewOps = new Set(['+', '*', '/', '%', '^', '!']);
    const normalizers = Object.freeze({
      '\u00f7': '/',
      '\u2212': '-',
      '\u221a': 'sqrt',
      '\u03c0': 'pi'
    });

    const normalizeExpression = value => String(value || '')
      .replace(/[\u00f7\u2212\u221a\u03c0]/g, char => normalizers[char] || char)
      .replace(/\s+/g, '');

    const factorial = value => {
      if (!Number.isInteger(value) || value < 0 || value > 170) {
        throw new Error('factorial supports integers from 0 to 170');
      }
      let result = 1;
      for (let i = 2; i <= value; i += 1) result *= i;
      return result;
    };

    const formatNumber = value => {
      const number = Object.is(value, -0) ? 0 : value;
      if (!Number.isFinite(number)) throw new Error('result is not finite');
      const abs = Math.abs(number);
      const text = abs >= 1e12 || (abs > 0 && abs < 1e-9)
        ? number.toExponential(10)
        : Number(number.toPrecision(14)).toString();
      return text.replace(/(\.\d*?)0+(e|$)/, '$1$2').replace(/\.(e|$)/, '$1');
    };

    const updateMeta = value => {
      if (!Number.isSafeInteger(value) || value < 0) {
        meta.textContent = '';
        return;
      }
      meta.textContent = `hex 0x${value.toString(16).toUpperCase()}  bin 0b${value.toString(2)}`;
    };

    const renderDisplay = (result = null) => {
      let nextResult = result;
      const raw = input.value.trim();
      if (nextResult === null && raw && shouldPreviewExpression(raw)) {
        try {
          nextResult = formatNumber(evaluateExpression(raw));
        } catch {
          nextResult = '';
        }
      }
      if (nextResult === null) nextResult = '';
      resultEl.textContent = nextResult;
    };

    const readNumber = (source, start) => {
      if (source.startsWith('0x', start) || source.startsWith('0X', start)) {
        let index = start + 2;
        while (/[0-9a-f]/i.test(source[index] || '')) index += 1;
        if (index === start + 2) throw new Error('invalid hex number');
        return { value: Number.parseInt(source.slice(start + 2, index), 16), index };
      }
      if (source.startsWith('0b', start) || source.startsWith('0B', start)) {
        let index = start + 2;
        while (/[01]/.test(source[index] || '')) index += 1;
        if (index === start + 2) throw new Error('invalid binary number');
        return { value: Number.parseInt(source.slice(start + 2, index), 2), index };
      }
      const match = source.slice(start).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
      if (!match) throw new Error('invalid number');
      return { value: Number(match[0]), index: start + match[0].length };
    };

    const tokenize = source => {
      const rawTokens = [];
      for (let index = 0; index < source.length;) {
        const char = source[index];
        if (/\d|\./.test(char)) {
          const number = readNumber(source, index);
          rawTokens.push({ type: 'number', value: number.value });
          index = number.index;
          continue;
        }
        if (/[a-z_]/i.test(char)) {
          let end = index + 1;
          while (/[a-z0-9_]/i.test(source[end] || '')) end += 1;
          rawTokens.push({ type: 'name', value: source.slice(index, end).toLowerCase() });
          index = end;
          continue;
        }
        if ('+-*/%^!(),'.includes(char)) {
          rawTokens.push({ type: char === '(' || char === ')' ? 'paren' : char === ',' ? 'comma' : 'op', value: char });
          index += 1;
          continue;
        }
        throw new Error(`unexpected token: ${char}`);
      }
      const tokens = [];
      const endsValue = token => token && (token.type === 'number' || token.type === 'name' || token.value === ')' || token.value === '!');
      const startsValue = token => token && (token.type === 'number' || token.type === 'name' || token.value === '(');
      rawTokens.forEach(token => {
        const previous = tokens[tokens.length - 1];
        const isFunctionCall = previous?.type === 'name' && functions[previous.value] && token.value === '(';
        if (endsValue(previous) && startsValue(token) && !isFunctionCall) {
          tokens.push({ type: 'op', value: '*' });
        }
        tokens.push(token);
      });
      return tokens;
    };

    const shouldPreviewExpression = source => {
      let tokens;
      try {
        tokens = tokenize(normalizeExpression(source));
      } catch {
        return false;
      }
      return tokens.some((token, index) => {
        if (token.type === 'comma') return true;
        if (token.type === 'op' && previewOps.has(token.value)) return true;
        if (token.type === 'op' && token.value === '-' && index > 0) return true;
        if (token.type === 'name' && functions[token.value] && tokens[index + 1]?.value === '(') return true;
        return false;
      });
    };

    const evaluateExpression = source => {
      const tokens = tokenize(normalizeExpression(source));
      let position = 0;
      const peek = () => tokens[position];
      const consume = () => tokens[position++];

      const parseExpression = (minPrecedence = 0) => {
        let left = parseUnary();
        while (binaryOps[peek()?.value] && binaryOps[peek().value].precedence >= minPrecedence) {
          const op = consume().value;
          const { precedence, assoc, fn } = binaryOps[op];
          const right = parseExpression(precedence + (assoc === 'left' ? 1 : 0));
          left = fn(left, right);
        }
        return left;
      };

      const parseUnary = () => {
        const token = peek();
        if (token?.type === 'op' && token.value === '+') {
          consume();
          return parseUnary();
        }
        if (token?.type === 'op' && token.value === '-') {
          consume();
          return -parseExpression(3);
        }
        let value = parsePrimary();
        while (peek()?.type === 'op' && peek().value === '!') {
          consume();
          value = factorial(value);
        }
        return value;
      };

      const readArguments = () => {
        const args = [];
        if (peek()?.value === ')') {
          consume();
          return args;
        }
        for (;;) {
          args.push(parseExpression());
          const next = peek();
          if (next?.type === 'comma') {
            consume();
            continue;
          }
          if (next?.value !== ')') throw new Error('missing closing parenthesis');
          consume();
          return args;
        }
      };

      const parsePrimary = () => {
        const token = consume();
        if (!token) throw new Error('empty expression');
        if (token.type === 'number') return token.value;
        if (token.type === 'name') {
          if (token.value === 'ans') return lastAnswer;
          if (constants[token.value] !== undefined) return constants[token.value];
          const fn = functions[token.value];
          if (!fn) throw new Error(`unknown function: ${token.value}`);
          if (consume()?.value !== '(') throw new Error(`missing arguments for ${token.value}`);
          return fn(...readArguments());
        }
        if (token.value === '(') {
          const value = parseExpression();
          if (consume()?.value !== ')') throw new Error('missing closing parenthesis');
          return value;
        }
        throw new Error(`unexpected token: ${token.value}`);
      };

      const result = parseExpression();
      if (position < tokens.length) throw new Error(`unexpected token: ${tokens[position].value}`);
      if (!Number.isFinite(result)) throw new Error('result is not finite');
      return result;
    };

    const setInput = value => {
      input.value = value || '';
      input.focus({ preventScroll: true });
      input.setSelectionRange(input.value.length, input.value.length);
      renderDisplay();
    };

    const evaluateCurrent = () => {
      const raw = input.value.trim();
      if (!raw) return 0;
      const value = evaluateExpression(raw);
      const formatted = formatNumber(value);
      lastAnswer = value;
      input.value = raw;
      input.setSelectionRange(input.value.length, input.value.length);
      renderDisplay(formatted);
      updateMeta(value);
      return value;
    };

    const showError = error => {
      resultEl.textContent = '';
      meta.textContent = error.message || 'invalid expression';
      input.setAttribute('aria-invalid', 'true');
    };

    const insertText = text => {
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

    const handleAction = action => {
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
        const next = clampNumber(pos + (action === 'move-left' ? -1 : 1), 0, input.value.length);
        input.focus({ preventScroll: true });
        input.setSelectionRange(next, next);
        return;
      }
      if (action === 'negate') {
        const raw = input.value.trim();
        setInput(raw.startsWith('-(') && raw.endsWith(')') ? raw.slice(2, -1) : `-(${raw || 0})`);
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

    keypads.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.dataset.calcValue !== undefined) {
        insertText(button.dataset.calcValue);
        return;
      }
      handleAction(button.dataset.calcAction);
    });

    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleAction('evaluate');
        return;
      }
      if (event.key === 'Dead' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        insertText('^');
      }
    });
    input.addEventListener('input', () => {
      input.removeAttribute('aria-invalid');
      meta.textContent = '';
      renderDisplay();
    });
    output.addEventListener('click', event => {
      if (event.target.closest('.calc-result')) return;
      if (event.target !== input) input.focus({ preventScroll: true });
    });
    const tool = initFloatingTool({
      layer,
      dialog,
      handle,
      closeButton,
      hash: 'calc',
      focusTarget: () => input
    });
    if (touchKeyboardMedia.addEventListener) {
      touchKeyboardMedia.addEventListener('change', syncTouchKeyboard);
    } else {
      touchKeyboardMedia.addListener?.(syncTouchKeyboard);
    }
    calcCleanup = () => {
      if (touchKeyboardMedia.removeEventListener) {
        touchKeyboardMedia.removeEventListener('change', syncTouchKeyboard);
      } else {
        touchKeyboardMedia.removeListener?.(syncTouchKeyboard);
      }
      tool.cleanup();
    };
    syncTouchKeyboard();
    renderDisplay();
    return tool.open;
    }
  };
})(window);
