export interface FloatingToolConfig {
  layer: HTMLElement;
  dialog: HTMLElement;
  handle: HTMLElement;
  closeButton: HTMLElement;
  hash: string;
  focusTarget: () => HTMLElement | undefined;
}

export interface FloatingToolHandle {
  open(): void;
  cleanup(): void;
}

export interface TerminalToolContext {
  initFloatingTool(config: FloatingToolConfig): FloatingToolHandle;
  clampNumber(value: number, min: number, max: number): number;
}

export interface TerminalTool {
  create(context: TerminalToolContext): () => void;
}
