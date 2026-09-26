export interface DiffFile {
  name: string;
  fileName: string;
  downloadUrl: string;
}

export interface DiffPair {
  leftText: string;
  rightText: string;
  equivalent: boolean;
  context: number;
}

export interface ManifestSource {
  listReleases(): Promise<string[]>;
  listModules(release: string): Promise<string[]>;
  listNames(release: string, module: string): Promise<DiffFile[]>;
  sourceUrl(file: DiffFile): string;
  blobUrl(release: string, module: string, file: DiffFile): string;
  fileLabel(release: string, module: string, file: DiffFile): string;
}

export interface DiffSource extends ManifestSource {
  defaultLeft: string;
  defaultRight: string;
  defaultModule: string;
  preparePair(left: string, right: string, leftFile: DiffFile, rightFile: DiffFile): DiffPair;
  prepareSingle(source: string, file: DiffFile): string;
  renderSettings(body: HTMLElement, onChange: () => void): void;
  resetSettings(): unknown;
  highlightBlockComments: boolean;
}

export interface DiffSettingsStore<T extends object> {
  read(): T;
  write(values: T): T;
  reset(): T;
  addCheckbox(body: HTMLElement, id: string, label: string, checked: boolean): HTMLInputElement;
}

export interface DiffManifestOptions {
  repository: string;
  dataset: string;
  cacheKey: string;
  displayName?: (fileName: string) => string;
}
