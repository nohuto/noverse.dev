/* Copyright (c) 2026 nohuto */
import { createSource } from './source';

export const source = createSource({
  repository: 'nohuto/globals',
  dataset: 'globals',
  settingsKey: 'nv-diff-globals-settings-v1',
  defaultModule: 'ntoskrnl',
  displayName: (fileName) => fileName.replace(/\.cpp$/i, ''),
  settings: [
    { key: 'hideDecimalValue', label: 'Hide decimal value', value: false },
    { key: 'hideMetadata', label: 'Hide RVA, PE section, type', value: false },
  ],
  prepare: (text, _file, settings) => {
    if (settings.hideMetadata)
      text = text.replace(
        /^\/\/[ \t]*(?:RVA\b|PE[ \t]+section\b|Type:).*?(?:\n|$)/gim,
        '',
      );
    if (settings.hideDecimalValue)
      text = text.replace(
        /[ \t]+\/\/[ \t]*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?[ \t]*$/gim,
        '',
      );
    return `${text
      .replace(/^\n+/, '')
      .replace(/[ \t]+$/gm, '')
      .trimEnd()}\n`;
  },
});
