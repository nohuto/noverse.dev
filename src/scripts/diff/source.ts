/* Copyright (c) 2026 nohuto */
import { storageGet, storageSet } from '../shell/storage';
import type { DiffFile, DiffSource, Settings, SourceConfig } from './types';

export const fetchText = async (url: string) => {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Couldnt load ${url} (${response.status})`);
  return response.text();
};

const encodePath = (parts: string[]) => parts.map(encodeURIComponent).join('/');

const decodeNames = (text: string) => {
  let previous = '';
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((row) => {
      const split = row.indexOf('\t');
      previous =
        previous.slice(0, Number(row.slice(0, split))) + row.slice(split + 1);
      return previous;
    });
};

export function createSource({
  repository,
  dataset,
  settingsKey,
  defaultModule,
  settings,
  displayName = (fileName) => fileName,
  prepare,
  highlightBlockComments = false,
}: SourceConfig): DiffSource {
  const manifestBase = `/main/data/diff/${dataset}`;
  const names = new Map<string, Promise<DiffFile[]>>();
  let manifest:
    | Promise<{ releases: string[]; modules: Record<string, string[]> }>
    | undefined;

  const loadManifest = () =>
    (manifest ||= fetchText(`${manifestBase}/index.json`)
      .then(JSON.parse)
      .catch((error) => {
        manifest = undefined;
        throw error;
      }));

  const listNames = (release: string, module: string) => {
    const key = `${release}/${module}`;
    let list = names.get(key);
    if (!list) {
      list = fetchText(
        `${manifestBase}/names/${encodePath([release, module])}.txt`,
      )
        .then((text) =>
          decodeNames(text).map((fileName) => ({
            name: displayName(fileName),
            fileName,
            downloadUrl: `https://raw.githubusercontent.com/${repository}/main/${encodePath([release, module, fileName])}`,
          })),
        )
        .catch((error) => {
          names.delete(key);
          throw error;
        });
      names.set(key, list);
    }
    return list;
  };

  const readSettings = (): Settings => {
    let saved: Settings = {};
    try {
      saved = JSON.parse(storageGet(settingsKey, '{}'));
    } catch {}
    return Object.fromEntries(
      settings.map(({ key, value }) => [
        key,
        typeof saved[key] === 'boolean' ? saved[key] : value,
      ]),
    );
  };

  const prepareText = (text: string, file: DiffFile, values: Settings) =>
    prepare(text.replace(/\r\n?/g, '\n'), file, values);

  return {
    defaultModule,
    settings,
    highlightBlockComments,
    listReleases: async () => (await loadManifest()).releases,
    listModules: async (release) =>
      (await loadManifest()).modules[release] ?? [],
    listNames,
    blobUrl: (release, module, file) =>
      `https://github.com/${repository}/blob/main/${encodePath([release, module, file.fileName])}`,
    readSettings,
    writeSettings: (values) => storageSet(settingsKey, JSON.stringify(values)),
    resetSettings: () => storageSet(settingsKey, '{}'),
    prepareSingle: (text, file) => prepareText(text, file, readSettings()),
    preparePair: (left, right, file) => {
      const values = readSettings();
      const leftText = prepareText(left, file, values);
      const rightText = prepareText(right, file, values);
      return {
        leftText,
        rightText,
        context:
          values.showFullFunction === false
            ? 4
            : Math.max(
                leftText.split('\n').length,
                rightText.split('\n').length,
              ) + 2,
      };
    },
  };
}
