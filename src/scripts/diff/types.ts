export interface DiffFile {
  name: string;
  fileName: string;
  downloadUrl: string;
}

export type Settings = Record<string, boolean>;

export interface SourceConfig {
  repository: string;
  dataset: string;
  settingsKey: string;
  defaultModule: string;
  settings: { key: string; label: string; value: boolean }[];
  displayName?: (fileName: string) => string;
  prepare: (text: string, file: DiffFile, settings: Settings) => string;
  highlightBlockComments?: boolean;
}

export interface DiffSource {
  defaultModule: string;
  settings: SourceConfig['settings'];
  highlightBlockComments: boolean;
  listReleases(): Promise<string[]>;
  listModules(release: string): Promise<string[]>;
  listNames(release: string, module: string): Promise<DiffFile[]>;
  blobUrl(release: string, module: string, file: DiffFile): string;
  readSettings(): Settings;
  writeSettings(values: Settings): void;
  resetSettings(): void;
  prepareSingle(text: string, file: DiffFile): string;
  preparePair(
    left: string,
    right: string,
    file: DiffFile,
  ): { leftText: string; rightText: string; context: number };
}
