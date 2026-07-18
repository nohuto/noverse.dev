/* Copyright (c) 2026 Nohuto */
(function attachPseudocodeDiffSource(global) {
  'use strict';

  const API_BASE = 'https://api.github.com/repos/nohuto/decompiled-pseudocode/contents';
  const RAW_BASE = 'https://raw.githubusercontent.com/nohuto/decompiled-pseudocode/main';
  const BLOB_BASE = 'https://github.com/nohuto/decompiled-pseudocode/blob/main';
  const TREE_BASE = 'https://api.github.com/repos/nohuto/decompiled-pseudocode/git/trees';
  const CACHE_KEY = 'nv-diff-pseudocode-name-cache-v1';
  const SETTINGS_KEY = 'nv-diff-pseudocode-settings-v1';
  const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
  const CACHE_MAX_ENTRIES = 6;
  const DEFAULT_LEFT_RELEASE = '11-23H2';
  const DEFAULT_RIGHT_RELEASE = '11-24H2';
  const DEFAULT_MODULE = 'ntoskrnl';
  const COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const entriesCache = new Map();
  const nameCache = new Map();

  const normalizationDefaults = () => ({
    stripCrossReferenceMetadata: true,
    normalizeRelocationSymbols: true,
    stripStorageLocationComments: true,
    normalizeDecompilerIdentifiers: true,
    normalizeNumericNotation: true,
    normalizeGeneratedLabels: false,
    normalizePrototypeExpansionArgs: false,
    trimTrailingWhitespace: true,
    ...(global.Normalization?.DEFAULTS || {})
  });

  const encodePath = parts => parts.filter(Boolean).map(encodeURIComponent).join('/');
  const joinPath = parts => parts.filter(Boolean).join('/');

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

  const fetchJson = async url => {
    const response = await fetch(url, {
      cache: 'force-cache',
      headers: { Accept: 'application/vnd.github+json' }
    });
    if (!response.ok) throw new Error(`GitHub request failed (${response.status})`);
    return response.json();
  };

  const fetchEntries = path => {
    const key = joinPath(path);
    if (!entriesCache.has(key)) {
      const suffix = encodePath(path);
      const url = `${suffix ? `${API_BASE}/${suffix}` : API_BASE}?ref=main`;
      entriesCache.set(key, fetchJson(url).then(json => Array.isArray(json) ? json : []));
    }
    return entriesCache.get(key);
  };

  const fetchTree = sha => {
    const key = `tree:${sha}`;
    if (!entriesCache.has(key)) {
      entriesCache.set(key, fetchJson(`${TREE_BASE}/${sha}?recursive=1`).then(json => ({
        truncated: Boolean(json?.truncated),
        tree: Array.isArray(json?.tree) ? json.tree : []
      })));
    }
    return entriesCache.get(key);
  };

  const listDirectories = async path => {
    const entries = await fetchEntries(path);
    return entries
      .filter(entry => entry?.type === 'dir' && typeof entry.name === 'string' && !entry.name.startsWith('.'))
      .map(entry => entry.name)
      .sort((a, b) => COLLATOR.compare(a, b));
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

  const makeFile = (path, name) => ({
    name,
    fileName: name,
    downloadUrl: `${RAW_BASE}/${encodePath([...path, name])}`
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

    const parentEntries = await fetchEntries(path.slice(0, -1));
    const directory = parentEntries.find(entry => entry.type === 'dir' && entry.name === path[path.length - 1]);
    if (!directory?.sha) throw new Error(`Unable to locate directory SHA for ${key}`);

    const result = await fetchTree(directory.sha);
    if (result.truncated) throw new Error(`Function tree for ${key} is truncated`);

    const names = result.tree
      .filter(entry => entry?.type === 'blob' && typeof entry.path === 'string' && !entry.path.includes('/') && entry.path.toLowerCase().endsWith('.c'))
      .map(entry => entry.path)
      .sort((a, b) => COLLATOR.compare(a, b));
    nameCache.set(key, names);
    saveNames(key, names);
    return fromNames(names);
  };

  const readSettings = () => {
    const normalize = candidate => {
      const defaults = normalizationDefaults();
      const result = { ...defaults };
      Object.keys(defaults).forEach(key => {
        if (candidate?.[key] !== undefined) result[key] = Boolean(candidate[key]);
      });
      return result;
    };

    try {
      const parsed = JSON.parse(storageGet(SETTINGS_KEY, ''));
      return {
        normalization: normalize(parsed?.normalization),
        showFullFunction: parsed?.showFullFunction !== undefined ? Boolean(parsed.showFullFunction) : true
      };
    } catch {
      return { normalization: normalizationDefaults(), showFullFunction: true };
    }
  };

  const writeSettings = settings => {
    storageSet(SETTINGS_KEY, JSON.stringify({
      normalization: settings.normalization,
      showFullFunction: Boolean(settings.showFullFunction)
    }));
  };

  const resetSettings = () => {
    const settings = { normalization: normalizationDefaults(), showFullFunction: true };
    writeSettings(settings);
    return settings;
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
    const inputs = {
      stripCrossReferenceMetadata: addSetting(body, 'diff-setting-strip-cross-reference-metadata', 'Hide XREF comments', settings.normalization.stripCrossReferenceMetadata),
      normalizeRelocationSymbols: addSetting(body, 'diff-setting-normalize-relocation-symbols', 'Hide build specific addresses/symbols', settings.normalization.normalizeRelocationSymbols),
      stripStorageLocationComments: addSetting(body, 'diff-setting-strip-storage-location-comments', 'Hide register/stack comments', settings.normalization.stripStorageLocationComments),
      normalizeDecompilerIdentifiers: addSetting(body, 'diff-setting-normalize-decompiler-identifiers', 'Normalize autogenerated variable/argument names', settings.normalization.normalizeDecompilerIdentifiers),
      normalizeNumericNotation: addSetting(body, 'diff-setting-normalize-numeric', 'Treat equivalent numbers as same (hex/dec/suffix)', settings.normalization.normalizeNumericNotation),
      normalizeGeneratedLabels: addSetting(body, 'diff-setting-normalize-labels', 'Ignore generated label number changes', settings.normalization.normalizeGeneratedLabels),
      normalizePrototypeExpansionArgs: addSetting(body, 'diff-setting-normalize-prototype', 'Ignore extra trailing default arguments', settings.normalization.normalizePrototypeExpansionArgs),
      showFullFunction: addSetting(body, 'diff-setting-show-full', 'Show full function', settings.showFullFunction),
      trimTrailingWhitespace: addSetting(body, 'diff-setting-trim-whitespace', 'Ignore whitespace only changes', settings.normalization.trimTrailingWhitespace)
    };

    const sync = () => {
      writeSettings({
        normalization: {
          stripCrossReferenceMetadata: inputs.stripCrossReferenceMetadata.checked,
          normalizeRelocationSymbols: inputs.normalizeRelocationSymbols.checked,
          stripStorageLocationComments: inputs.stripStorageLocationComments.checked,
          normalizeDecompilerIdentifiers: inputs.normalizeDecompilerIdentifiers.checked,
          normalizeNumericNotation: inputs.normalizeNumericNotation.checked,
          normalizeGeneratedLabels: inputs.normalizeGeneratedLabels.checked,
          normalizePrototypeExpansionArgs: inputs.normalizePrototypeExpansionArgs.checked,
          trimTrailingWhitespace: inputs.trimTrailingWhitespace.checked
        },
        showFullFunction: inputs.showFullFunction.checked
      });
      onChange();
    };
    Object.values(inputs).forEach(input => input.addEventListener('change', sync));
  };

  const normalizeText = source => String(source || '').replace(/\r\n?/g, '\n');

  const preparePair = (leftSource, rightSource) => {
    const settings = readSettings();
    const result = global.Normalization?.preparePair
      ? global.Normalization.preparePair(leftSource, rightSource, settings.normalization)
      : { leftText: normalizeText(leftSource), rightText: normalizeText(rightSource), equivalent: false };
    const fullContext = Math.max(result.leftText.split('\n').length, result.rightText.split('\n').length) + 2;
    return {
      leftText: result.leftText,
      rightText: result.rightText,
      equivalent: Boolean(result.equivalent),
      context: settings.showFullFunction ? fullContext : 4
    };
  };

  const prepareSingle = source => {
    const settings = readSettings();
    return global.Normalization?.normalize
      ? global.Normalization.normalize(source, settings.normalization).text
      : normalizeText(source);
  };

  global.NVDiffSources = global.NVDiffSources || {};
  global.NVDiffSources.pseudocode = {
    defaultLeft: DEFAULT_LEFT_RELEASE,
    defaultRight: DEFAULT_RIGHT_RELEASE,
    defaultModule: DEFAULT_MODULE,
    extraScripts: ['main/min/normalization.min.js'],
    listReleases: () => listDirectories([]),
    listModules: release => listDirectories([release]),
    listNames: (release, module) => listFiles([release, module]),
    sourceUrl: file => file.downloadUrl,
    blobUrl: (release, module, file) => `${BLOB_BASE}/${encodePath([release, module, file.fileName])}`,
    fileLabel: (release, module, file) => `${release}/${module}/${file.fileName}`,
    preparePair,
    prepareSingle,
    renderSettings,
    resetSettings,
    highlightBlockComments: true
  };
})(window);
