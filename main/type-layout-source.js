/* Copyright (c) 2026 Nohuto */
(function attachTypeLayoutDiffSource(global) {
  'use strict';

  const RAW_BASE = 'https://raw.githubusercontent.com/nohuto/type-layouts/main';
  const BLOB_BASE = 'https://github.com/nohuto/type-layouts/blob/main';
  const MANIFEST_BASE = 'main/data/diff/type-layouts';
  const CACHE_KEY = 'nv-diff-type-name-cache-v1';
  const SETTINGS_KEY = 'nv-diff-type-settings-v1';
  const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
  const CACHE_MAX_ENTRIES = 6;
  const DEFAULT_LEFT_RELEASE = '11-23H2';
  const DEFAULT_RIGHT_RELEASE = '11-24H2';
  const DEFAULT_MODULE = 'ntdll';
  const SETTINGS_DEFAULTS = Object.freeze({ showDependencies: false, hideComments: false });
  const COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const nameCache = new Map();
  let manifestPromise;

  const encodePath = parts => parts.filter(Boolean).map(encodeURIComponent).join('/');
  const joinPath = parts => parts.filter(Boolean).join('/');
  const fileToTypeName = fileName => String(fileName || '').replace(/\.cpp$/i, '');
  const normalizeText = source => String(source || '').replace(/\r\n?/g, '\n');

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

  const fetchManifest = url => fetch(url, { cache: 'force-cache' })
    .then(response => response.ok ? response.json() : null)
    .catch(() => null);

  const fetchManifestText = url => fetch(url, { cache: 'force-cache' })
    .then(response => response.ok ? response.text() : null)
    .catch(() => null);

  const decodeNames = text => {
    if (typeof text !== 'string') return null;
    let previous = '';
    return text.split('\n').filter(Boolean).map(row => {
      const split = row.indexOf('\t');
      const prefix = Number(row.slice(0, split));
      const name = previous.slice(0, prefix) + row.slice(split + 1);
      previous = name;
      return name;
    });
  };

  const manifest = () => {
    manifestPromise ||= fetchManifest(`${MANIFEST_BASE}/index.json`).then(json => ({
      releases: Array.isArray(json?.releases) ? json.releases : [],
      modules: json?.modules && typeof json.modules === 'object' ? json.modules : {}
    }));
    return manifestPromise;
  };

  const manifestDirectories = async path => {
    const data = await manifest();
    if (path.length === 0) return data.releases;
    if (path.length === 1) return Array.isArray(data.modules[path[0]]) ? data.modules[path[0]] : [];
    return [];
  };

  const manifestNames = async path => {
    if (path.length !== 2) return null;
    return decodeNames(await fetchManifestText(`${MANIFEST_BASE}/names/${encodePath(path)}.txt`));
  };

  const listDirectories = async path => {
    const manifestResult = await manifestDirectories(path);
    return manifestResult.slice().sort((a, b) => COLLATOR.compare(a, b));
  };

  const readNameStore = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || '');
      return parsed?.entries && typeof parsed.entries === 'object' ? parsed : { entries: {} };
    } catch {
      return { entries: {} };
    }
  };

  const writeNameStore = store => {
    const entries = Object.entries(store.entries || {})
      .sort((left, right) => (right[1]?.ts || 0) - (left[1]?.ts || 0))
      .slice(0, CACHE_MAX_ENTRIES);
    storageSet(CACHE_KEY, JSON.stringify({ entries: Object.fromEntries(entries) }));
  };

  const loadNames = key => {
    const entry = readNameStore().entries?.[key];
    if (!entry || !Array.isArray(entry.names) || Date.now() - Number(entry.ts || 0) > CACHE_TTL_MS) return null;
    return entry.names;
  };

  const saveNames = (key, names) => {
    const store = readNameStore();
    store.entries[key] = { ts: Date.now(), names };
    writeNameStore(store);
  };

  const makeFile = (path, fileName) => ({
    name: fileToTypeName(fileName),
    fileName,
    downloadUrl: `${RAW_BASE}/${encodePath([...path, fileName])}`
  });

  const listFiles = async path => {
    const key = joinPath(path);
    const fromNames = names => names.map(name => makeFile(path, name));
    if (nameCache.has(key)) return fromNames(nameCache.get(key));

    const stored = loadNames(key);
    if (stored) {
      nameCache.set(key, stored);
      return fromNames(stored);
    }

    const manifestResult = await manifestNames(path);
    if (manifestResult) {
      nameCache.set(key, manifestResult);
      saveNames(key, manifestResult);
      return fromNames(manifestResult);
    }

    return [];
  };

  const readSettings = () => {
    try {
      const parsed = JSON.parse(storageGet(SETTINGS_KEY, ''));
      return {
        showDependencies: Boolean(parsed?.showDependencies),
        hideComments: Boolean(parsed?.hideComments)
      };
    } catch {
      return { ...SETTINGS_DEFAULTS };
    }
  };

  const writeSettings = settings => {
    storageSet(SETTINGS_KEY, JSON.stringify({
      showDependencies: Boolean(settings.showDependencies),
      hideComments: Boolean(settings.hideComments)
    }));
  };

  const resetSettings = () => {
    const settings = { ...SETTINGS_DEFAULTS };
    writeSettings(settings);
    return settings;
  };

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

  const addSetting = (body, id, label, checked) => {
    const row = document.createElement('label');
    row.className = 'bindiff-setting-row';
    row.htmlFor = id;
    row.innerHTML = `<input id="${id}" type="checkbox"><span>${label}</span>`;
    const input = row.querySelector('input');
    input.checked = checked;
    body.appendChild(row);
    return input;
  };

  const renderSettings = (body, onChange) => {
    const settings = readSettings();
    body.replaceChildren();
    const showDependencies = addSetting(body, 'diff-setting-show-dependencies', 'Show dependencies', settings.showDependencies);
    const hideComments = addSetting(body, 'diff-setting-hide-comments', 'Hide comments', settings.hideComments);
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
    defaultLeft: DEFAULT_LEFT_RELEASE,
    defaultRight: DEFAULT_RIGHT_RELEASE,
    defaultModule: DEFAULT_MODULE,
    extraScripts: [],
    listReleases: () => listDirectories([]),
    listModules: release => listDirectories([release]),
    listNames: (release, module) => listFiles([release, module]),
    sourceUrl: file => file.downloadUrl,
    blobUrl: (release, module, file) => `${BLOB_BASE}/${encodePath([release, module, file.fileName])}`,
    fileLabel: (release, module, file) => `${release}/${module}/${file.fileName}`,
    preparePair,
    prepareSingle: prepareSource,
    renderSettings,
    resetSettings,
    highlightBlockComments: false
  };
})(window);
