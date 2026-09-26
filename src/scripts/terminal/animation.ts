interface TerminalAnimationOptions {
  output: HTMLElement;
  form: HTMLFormElement;
  addNodeLine(node: Node, className: string): HTMLElement;
  addLine(text: string, className?: string): void;
  scrollToBottom(): void;
  stop(): void;
  setCleanup(cleanup: () => void): void;
}

export function startTerminalAnimation(options: TerminalAnimationOptions, requestedWidth: number | null = null, requestedHeight: number | null = null): void {
  const { output, form, addNodeLine, addLine, scrollToBottom, stop, setCleanup } = options;
      stop();

      const container = document.createElement('div');
      container.className = 'console-animation console-animation-trippy';

      const gridContainer = document.createElement('div');
      gridContainer.className = 'trippy-grid-container';

      const canvas = document.createElement('canvas');
      canvas.className = 'trippy-grid';
      canvas.setAttribute('aria-label', 'Terminal animation');

      gridContainer.appendChild(canvas);
      container.appendChild(gridContainer);

      const line = addNodeLine(container, 'console-animation-line');
      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) {
        addLine('animation unavailable - canvas is not supported', 'muted');
        line.remove();
        return;
      }

      const charRangeStart = 33;
      const charRangeEnd = 126;
      const charRangeMax = charRangeEnd - charRangeStart;
      const targetFrameMs = 1000 / 30;
      let cellWidth = 10;
      let cellHeight = 10;
      let colCount = 0;
      let rowCount = 0;
      let canvasWidth = 0;
      let canvasHeight = 0;
      let xTerms = new Float32Array(0);
      let yTerms = new Float32Array(0);
      let glyphAtlas: HTMLCanvasElement[][] = [];
      let palette: string[] = [];
      let rafId = 0;
      let lastFrame = 0;
      let stopped = false;

      const getThemePalette = () => {
        const rootStyle = getComputedStyle(document.documentElement);
        const nextPalette = [
          rootStyle.getPropertyValue('--accent').trim(),
          rootStyle.getPropertyValue('--accent-2').trim(),
          rootStyle.getPropertyValue('--text').trim(),
          rootStyle.getPropertyValue('--muted').trim(),
          rootStyle.getPropertyValue('--success').trim(),
          rootStyle.getPropertyValue('--warning').trim()
        ].filter(Boolean);
        return nextPalette.length ? nextPalette : ['#ffffff'];
      };

      const applyRequestedSize = () => {
        const lineWidth = Math.max(1, line.clientWidth);
        const outputHeight = Math.max(1, output.clientHeight);
        const inputHeight = form.offsetHeight || 0;
        const maxWidth = lineWidth;
        const maxHeight = Math.max(80, outputHeight - inputHeight - 12);
        const nextWidth = requestedWidth ? Math.min(requestedWidth, maxWidth) : maxWidth;
        const nextHeight = requestedHeight ? Math.min(requestedHeight, maxHeight) : Math.min(Math.max(145, outputHeight * 0.26), 230, maxHeight);
        gridContainer.style.width = `${Math.floor(nextWidth)}px`;
        gridContainer.style.height = `${Math.floor(nextHeight)}px`;
      };

      const buildGlyphAtlas = font => {
        glyphAtlas = palette.map(color => {
          const colorGlyphs: HTMLCanvasElement[] = [];
          for (let code = 0; code < charRangeMax; code += 1) {
            const glyphCanvas = document.createElement('canvas');
            glyphCanvas.width = Math.ceil(cellWidth);
            glyphCanvas.height = Math.ceil(cellHeight);
            const glyphCtx = glyphCanvas.getContext('2d', { alpha: true });
            if (glyphCtx) {
              glyphCtx.font = font;
              glyphCtx.textBaseline = 'top';
              glyphCtx.fillStyle = color;
              glyphCtx.fillText(String.fromCharCode(charRangeStart + code), 0, 0);
            }
            colorGlyphs.push(glyphCanvas);
          }
          return colorGlyphs;
        });
      };

      const updateSize = () => {
        if (stopped) return;

        applyRequestedSize();

        const rect = gridContainer.getBoundingClientRect();
        const nextWidth = Math.max(1, Math.floor(rect.width));
        const nextHeight = Math.max(1, Math.floor(rect.height));
        const gridStyle = getComputedStyle(canvas);
        const fontSize = parseFloat(gridStyle.fontSize) || 10;
        const lineHeight = parseFloat(gridStyle.lineHeight) || fontSize;
        const font = `${fontSize}px ${gridStyle.fontFamily}`;

        ctx.font = font;
        ctx.textBaseline = 'top';
        cellWidth = Math.max(1, ctx.measureText('M').width);
        cellHeight = Math.max(1, lineHeight);
        colCount = Math.max(1, Math.floor(nextWidth / cellWidth));
        rowCount = Math.max(1, Math.floor(nextHeight / cellHeight));
        canvasWidth = Math.ceil(colCount * cellWidth);
        canvasHeight = Math.ceil(rowCount * cellHeight);

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        canvas.style.width = `${canvasWidth}px`;
        canvas.style.height = `${canvasHeight}px`;

        ctx.imageSmoothingEnabled = false;
        palette = getThemePalette();
        buildGlyphAtlas(font);

        xTerms = new Float32Array(colCount);
        yTerms = new Float32Array(rowCount);
        const cx = Math.floor(colCount / 2);
        const cy = Math.floor(rowCount / 2);
        for (let x = 0; x < colCount; x += 1) xTerms[x] = Math.cos((x - cx) / 8.0);
        for (let y = 0; y < rowCount; y += 1) yTerms[y] = Math.sin((y - cy) / 8.0);

        scrollToBottom();
      };

      const render = ticks => {
        if (stopped || !line.isConnected) return;
        rafId = requestAnimationFrame(render);
        if (ticks - lastFrame < targetFrameMs) return;
        lastFrame = ticks;

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        const t = 100 + (ticks * 0.001);

        for (let y = 0; y < rowCount; y += 1) {
          const yTerm = yTerms[y];
          const drawY = y * cellHeight;
          for (let x = 0; x < colCount; x += 1) {
            const v = (xTerms[x] + yTerm + t) * 16;
            const charVal = Math.floor(v % charRangeMax);
            const glyphIndex = (charVal + charRangeMax) % charRangeMax;
            const colorIndex = glyphIndex % palette.length;
            ctx.drawImage(glyphAtlas[colorIndex][glyphIndex], x * cellWidth, drawY);
          }
        }
      };

      const resizeObserver = window.ResizeObserver ? new ResizeObserver(updateSize) : null;
      const handleThemeChange = updateSize;
      resizeObserver?.observe(line);
      resizeObserver?.observe(output);
      document.addEventListener('nv:theme-change', handleThemeChange);
      requestAnimationFrame(() => {
        updateSize();
        rafId = requestAnimationFrame(render);
      });

      setCleanup(() => {
        stopped = true;
        if (rafId) cancelAnimationFrame(rafId);
        resizeObserver?.disconnect();
        document.removeEventListener('nv:theme-change', handleThemeChange);
        if (line.isConnected) line.remove();
      });
}
