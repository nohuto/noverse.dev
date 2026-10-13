declare global {
  interface Window {
    Diff: { createTwoFilesPatch(...args: unknown[]): string };
    Diff2HtmlUI: new (
      target: HTMLElement,
      patch: string,
      options: Record<string, unknown>,
      highlight: unknown,
    ) => { draw(): void };
    hljs: unknown;
  }
}

export {};
