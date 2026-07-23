/* Copyright (c) 2026 Nohuto */
(function attachNoverseBitmask(global) {
  'use strict';

  let bitmaskCleanup = null;

  global.NoverseBitmask = {
    create({ initFloatingTool }) {
    bitmaskCleanup?.();
    const layer = document.getElementById('bitmask-layer');
    const dialog = document.getElementById('bitmask-window');
    const handle = document.getElementById('bitmask-drag');
    const closeButton = document.getElementById('bitmask-close');
    const field = document.getElementById('bitmask-field');
    const decInput = document.getElementById('bitmask-dec');
    const hexInput = document.getElementById('bitmask-hex');
    const binInput = document.getElementById('bitmask-bin');
    if (!layer || !dialog || !handle || !closeButton || !field || !decInput || !hexInput || !binInput) return () => {};

    let value = 0n;
    const maxValue = (1n << 32n) - 1n;
    const bitControls = [];
    const bitControlByButton = new WeakMap();

    for (let byte = 3; byte >= 0; byte -= 1) {
      const group = document.createElement('div');
      group.className = 'bitmask-byte';
      for (let offset = 7; offset >= 0; offset -= 1) {
        const bit = byte * 8 + offset;
        const mask = 1n << BigInt(bit);
        const cell = document.createElement('div');
        const label = document.createElement('span');
        const button = document.createElement('button');
        const strong = document.createElement('strong');
        cell.className = 'bitmask-bit-cell';
        label.className = 'bitmask-bit-index';
        label.textContent = String(bit);
        button.type = 'button';
        button.className = 'bitmask-bit';
        button.setAttribute('aria-pressed', 'false');
        strong.textContent = '0';
        button.appendChild(strong);
        const control = { button, strong, bit, mask };
        bitControls.push(control);
        bitControlByButton.set(button, control);
        cell.append(label, button);
        group.appendChild(cell);
      }
      field.appendChild(group);
    }

    const render = source => {
      bitControls.forEach(({ button, strong, bit, mask }) => {
        const active = (value & mask) !== 0n;
        const activeText = active ? '1' : '0';
        button.setAttribute('aria-pressed', String(active));
        button.setAttribute('aria-label', `Bit ${bit}: ${active ? 'on' : 'off'}`);
        if (strong.textContent !== activeText) strong.textContent = activeText;
      });
      [
        [decInput, value.toString(10)],
        [hexInput, `0x${value.toString(16).toUpperCase().padStart(8, '0')}`],
        [binInput, value.toString(2).padStart(32, '0').match(/.{8}/g).join(' ')]
      ].forEach(([input, formatted]) => {
        if (input !== source) input.value = formatted;
        input.removeAttribute('aria-invalid');
      });
    };

    const parseValue = input => {
      let raw = input.value.trim();
      let pattern;
      let prefix;
      if (input === binInput) {
        raw = raw.replace(/\s+/g, '').replace(/^0b/i, '');
        pattern = /^[01]{1,32}$/;
        prefix = '0b';
      } else if (input === hexInput) {
        raw = raw.replace(/^0x/i, '');
        pattern = /^[0-9a-f]{1,8}$/i;
        prefix = '0x';
      } else {
        pattern = /^\d{1,10}$/;
        prefix = '';
      }
      if (!pattern.test(raw)) return null;
      const parsed = BigInt(`${prefix}${raw}`);
      return parsed <= maxValue ? parsed : null;
    };

    const updateFromInput = input => {
      const parsed = parseValue(input);
      if (parsed === null) {
        input.setAttribute('aria-invalid', 'true');
        return;
      }
      value = parsed;
      render(input);
    };

    field.addEventListener('click', event => {
      const button = event.target.closest('.bitmask-bit');
      if (!button) return;
      const control = bitControlByButton.get(button);
      if (!control) return;
      value ^= control.mask;
      render();
    });
    [decInput, hexInput, binInput].forEach(input => {
      input.addEventListener('input', () => updateFromInput(input));
      input.addEventListener('blur', () => render());
      input.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        input.blur();
      });
    });
    dialog.querySelector('.bitmask-actions').addEventListener('click', event => {
      const action = event.target.closest('[data-bitmask-action]')?.dataset.bitmaskAction;
      if (!action) return;
      if (action === 'clear') value = 0n;
      if (action === 'all') value = maxValue;
      if (action === 'invert') value ^= maxValue;
      render();
    });
    const tool = initFloatingTool({
      layer,
      dialog,
      handle,
      closeButton,
      hash: 'bitmask',
      focusTarget: () => bitControls[0]?.button
    });
    bitmaskCleanup = () => {
      tool.cleanup();
    };
    render();
    return tool.open;
    }
  };
})(window);
