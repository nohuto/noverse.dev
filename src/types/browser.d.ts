import type {
  DiffSource,
  DiffSettingsStore,
  DiffManifestOptions,
  ManifestSource,
} from '../scripts/diff/types';
import type { TerminalTool } from '../scripts/terminal/types';

declare global {
  interface Window {
    NVDiffSources: Partial<
      Record<'type' | 'globals' | 'pseudocode', DiffSource>
    >;
    createNVDiffSettingsStore<T extends object>(options: {
      key: string;
      defaults: T | (() => T);
      normalize: (candidate: Partial<T> | null, defaults: T) => T;
    }): DiffSettingsStore<T>;
    createNVDiffManifestSource(options: DiffManifestOptions): ManifestSource;
    Normalization?: {
      normalize(
        source: string,
        settings?: Record<string, boolean>,
      ): { text: string; facts: Record<string, unknown> };
      preparePair(
        left: string,
        right: string,
        settings?: Record<string, boolean>,
      ): { leftText: string; rightText: string; equivalent: boolean };
    };
    Diff: { createTwoFilesPatch(...args: unknown[]): string };
    Diff2HtmlUI: new (
      target: HTMLElement,
      patch: string,
      options: Record<string, unknown>,
      highlight: unknown,
    ) => { draw(): void };
    hljs: unknown;
    NoverseBitmask?: TerminalTool;
    NoverseCalculator?: TerminalTool;
  }
}

export {};
