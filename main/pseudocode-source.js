/* Copyright (c) 2026 Nohuto */
(function attachPseudocodeDiffSource(global) {
  'use strict';

  const RAW_BASE = 'https://raw.githubusercontent.com/nohuto/decompiled-pseudocode/main';
  const BLOB_BASE = 'https://github.com/nohuto/decompiled-pseudocode/blob/main';
  const MANIFEST_BASE = 'main/data/diff/decompiled-pseudocode';
  const CACHE_KEY = 'nv-diff-pseudocode-name-cache-v1';
  const SETTINGS_KEY = 'nv-diff-pseudocode-settings-v1';
  const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
  const CACHE_MAX_ENTRIES = 6;
  const DEFAULT_LEFT_RELEASE = '11-23H2';
  const DEFAULT_RIGHT_RELEASE = '11-24H2';
  const DEFAULT_MODULE = 'ntoskrnl';
  const COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const nameCache = new Map();
  let manifestPromise;

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

    const manifestResult = await manifestNames(path);
    if (manifestResult) {
      nameCache.set(key, manifestResult);
      saveNames(key, manifestResult);
      return fromNames(manifestResult);
    }

    return [];
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
