/* Copyright (c) 2026 Nohuto */
(function attachGlobalsDiffSource(global) {
  'use strict';

  const SETTINGS_KEY = 'nv-diff-globals-settings-v1';
  const DEFAULT_LEFT_RELEASE = '11-23H2';
  const DEFAULT_RIGHT_RELEASE = '11-24H2';
  const DEFAULT_MODULE = 'ntoskrnl';
  const SETTINGS_DEFAULTS = Object.freeze({ hideDecimalValue: false, hideMetadata: false });
  const source = global.createNVDiffManifestSource({
    repository: 'nohuto/globals',
    dataset: 'globals',
    cacheKey: 'nv-diff-globals-name-cache-v1',
    displayName: fileName => String(fileName || '').replace(/\.cpp$/i, '')
  });

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

  const readSettings = () => {
    try {
      const parsed = JSON.parse(storageGet(SETTINGS_KEY, ''));
      return {
        hideDecimalValue: Boolean(parsed?.hideDecimalValue),
        hideMetadata: Boolean(parsed?.hideMetadata)
      };
    } catch {
      return { ...SETTINGS_DEFAULTS };
    }
  };

  const writeSettings = settings => {
    storageSet(SETTINGS_KEY, JSON.stringify({
      hideDecimalValue: Boolean(settings.hideDecimalValue),
      hideMetadata: Boolean(settings.hideMetadata)
    }));
  };

  const resetSettings = () => {
    const settings = { ...SETTINGS_DEFAULTS };
    writeSettings(settings);
    return settings;
  };

  const prepareSource = sourceText => {
    const settings = readSettings();
    let text = String(sourceText || '').replace(/\r\n?/g, '\n');
    if (settings.hideMetadata) {
      text = text.replace(/^\/\/[ \t]*(?:RVA\b|PE[ \t]+section\b|Type:).*?(?:\n|$)/gim, '');
    }
    if (settings.hideDecimalValue) {
      text = text.replace(/[ \t]+\/\/[ \t]*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?[ \t]*$/gim, '');
    }
    return `${text.replace(/^\n+/, '').replace(/[ \t]+$/gm, '').trimEnd()}\n`;
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
    const hideDecimalValue = addSetting(body, 'diff-setting-hide-decimal-value', 'Hide decimal value', settings.hideDecimalValue);
    const hideMetadata = addSetting(body, 'diff-setting-hide-global-metadata', 'Hide RVA, PE section, type', settings.hideMetadata);
    [hideDecimalValue, hideMetadata].forEach(input => {
      input.addEventListener('change', () => {
        writeSettings({
          hideDecimalValue: hideDecimalValue.checked,
          hideMetadata: hideMetadata.checked
        });
        onChange();
      });
    });
  };

  const preparePair = (leftSource, rightSource) => {
    const leftText = prepareSource(leftSource);
    const rightText = prepareSource(rightSource);
    return {
      leftText,
      rightText,
      equivalent: false,
      context: Math.max(leftText.split('\n').length, rightText.split('\n').length) + 2
    };
  };

  global.NVDiffSources = global.NVDiffSources || {};
  global.NVDiffSources.globals = {
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
