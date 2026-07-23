/* Copyright (c) 2026 Nohuto */
(function attachTypeLayoutDiffSource(global) {
  'use strict';

  const SETTINGS_KEY = 'nv-diff-type-settings-v1';
  const DEFAULT_LEFT_RELEASE = '11-23H2';
  const DEFAULT_RIGHT_RELEASE = '11-24H2';
  const DEFAULT_MODULE = 'ntdll';
  const SETTINGS_DEFAULTS = Object.freeze({ showDependencies: false, hideComments: false });
  const settingsStore = global.createNVDiffSettingsStore({
    key: SETTINGS_KEY,
    defaults: SETTINGS_DEFAULTS,
    normalize: candidate => ({
      showDependencies: Boolean(candidate?.showDependencies),
      hideComments: Boolean(candidate?.hideComments)
    })
  });
  const source = global.createNVDiffManifestSource({
    repository: 'nohuto/type-layouts',
    dataset: 'type-layouts',
    cacheKey: 'nv-diff-type-name-cache-v1',
    displayName: fileName => String(fileName || '').replace(/\.cpp$/i, '')
  });
  const normalizeText = source => String(source || '').replace(/\r\n?/g, '\n');

  const readSettings = settingsStore.read;
  const writeSettings = settingsStore.write;
  const resetSettings = settingsStore.reset;

  const expectedTypeNames = typeName => {
    const names = new Set([typeName]);
    if (typeName.startsWith('-')) {
      const unnamed = typeName.replace(/^-/, '').replace(/_\d+$/i, '').replace(/-$/, '');
      if (unnamed) names.add(`<${unnamed}>`);
    }
    return names;
  };

  const findBlockEnd = (source, openIndex) => {
    let depth = 0;
    let state = 'code';
    let escape = false;
    for (let i = openIndex; i < source.length; i += 1) {
      const char = source[i];
      const next = source[i + 1] || '';
      if (state === 'code') {
        if (char === '/' && next === '*') {
          state = 'block';
          i += 1;
        } else if (char === '/' && next === '/') {
          state = 'line';
          i += 1;
        } else if (char === '"') {
          state = 'string';
          escape = false;
        } else if (char === '\'') {
          state = 'char';
          escape = false;
        } else if (char === '{') {
          depth += 1;
        } else if (char === '}') {
          depth -= 1;
          if (depth === 0) {
            let end = i + 1;
            while (/[ \t]/.test(source[end] || '')) end += 1;
            if (source[end] === ';') end += 1;
            if (source[end] === '\r' && source[end + 1] === '\n') end += 2;
            else if (source[end] === '\n') end += 1;
            return end;
          }
        }
      } else if (state === 'block' && char === '*' && next === '/') {
        state = 'code';
        i += 1;
      } else if (state === 'line' && char === '\n') {
        state = 'code';
      } else if (state === 'string' || state === 'char') {
        if (escape) escape = false;
        else if (char === '\\') escape = true;
        else if ((state === 'string' && char === '"') || (state === 'char' && char === '\'')) state = 'code';
      }
    }
    return source.length;
  };

  const extractPrimaryLayout = (source, typeName) => {
    const text = normalizeText(source);
    const declaration = /^(struct|union|enum)\s+([^\s/{]+|<[^>]+>)(?=\s|\/|\{|$)/gm;
    const wanted = expectedTypeNames(typeName);
    const blocks = [];
    let match;
    while ((match = declaration.exec(text))) {
      const openIndex = text.indexOf('{', declaration.lastIndex);
      if (openIndex === -1) break;
      const end = findBlockEnd(text, openIndex);
      blocks.push({ name: match[2], start: match.index, end });
      declaration.lastIndex = end;
    }
    const selected = blocks.find(block => wanted.has(block.name)) || blocks[blocks.length - 1];
    return selected ? `${text.slice(selected.start, selected.end).trimEnd()}\n` : text;
  };

  const stripComments = source => {
    let state = 'code';
    let escape = false;
    let output = '';
    for (let i = 0; i < source.length; i += 1) {
      const char = source[i];
      const next = source[i + 1] || '';
      if (state === 'code') {
        if (char === '/' && next === '/') {
          state = 'line';
          i += 1;
          continue;
        }
        if (char === '/' && next === '*') {
          state = 'block';
          i += 1;
          continue;
        }
        if (char === '"') {
          state = 'string';
          escape = false;
        } else if (char === '\'') {
          state = 'char';
          escape = false;
        }
        output += char;
        continue;
      }
      if (state === 'line') {
        if (char === '\n') {
          output = `${output.trimEnd()}\n`;
          state = 'code';
        }
        continue;
      }
      if (state === 'block') {
        if (char === '*' && next === '/') {
          state = 'code';
          i += 1;
        }
        continue;
      }
      output += char;
      if (escape) escape = false;
      else if (char === '\\') escape = true;
      else if ((state === 'string' && char === '"') || (state === 'char' && char === '\'')) state = 'code';
    }
    return `${output.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
  };

  const prepareSource = (source, file) => {
    const settings = readSettings();
    let prepared = settings.showDependencies ? normalizeText(source) : extractPrimaryLayout(source, file.name);
    if (settings.hideComments) prepared = stripComments(prepared);
    return prepared;
  };

  const renderSettings = (body, onChange) => {
    const settings = readSettings();
    body.replaceChildren();
    const showDependencies = settingsStore.addCheckbox(body, 'diff-setting-show-dependencies', 'Show dependencies', settings.showDependencies);
    const hideComments = settingsStore.addCheckbox(body, 'diff-setting-hide-comments', 'Hide comments', settings.hideComments);
    [showDependencies, hideComments].forEach(input => {
      input.addEventListener('change', () => {
        writeSettings({
          showDependencies: showDependencies.checked,
          hideComments: hideComments.checked
        });
        onChange();
      });
    });
  };

  const preparePair = (leftSource, rightSource, file) => {
    const leftText = prepareSource(leftSource, file);
    const rightText = prepareSource(rightSource, file);
    return {
      leftText,
      rightText,
      equivalent: false,
      context: Math.max(leftText.split('\n').length, rightText.split('\n').length) + 2
    };
  };

  global.NVDiffSources = global.NVDiffSources || {};
  global.NVDiffSources.type = {
    ...source,
    defaultLeft: DEFAULT_LEFT_RELEASE,
    defaultRight: DEFAULT_RIGHT_RELEASE,
    defaultModule: DEFAULT_MODULE,
    extraScripts: [],
    preparePair,
    prepareSingle: prepareSource,
    renderSettings,
    resetSettings,
    highlightBlockComments: false
  };
})(window);
