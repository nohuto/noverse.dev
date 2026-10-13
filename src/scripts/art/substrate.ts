// after Jared Tarbells Substrate

type Crack = { x: number; y: number; t: number; side: number };

const BLOCKED = -1e4;
const EMPTY = 1e4;

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function substrate(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  bandX: number,
  bandY: number,
) {
  const rand = mulberry32(seed);
  const deg = Math.PI / 180;
  const steps = 16;
  const left = Math.max(0, Math.round(w / 2 - bandX));
  const right = Math.min(w, Math.round(w / 2 + bandX));
  const top = Math.max(0, Math.round(h / 2 - bandY));
  const bottom = Math.min(h, Math.round(h / 2 + bandY));
  const free = w * h - (right - left) * (bottom - top);
  if (free <= 0) return () => 1;
  const grid = new Float32Array(w * h).fill(EMPTY);
  for (let y = top; y < bottom; y++)
    grid.fill(BLOCKED, y * w + left, y * w + right);

  const sideOf =
    bottom - top < h
      ? (k: number) => (k < (h / 2) * w ? 0 : 1)
      : (k: number) => (k % w < w / 2 ? 0 : 1);
  const cracked: number[][] = [[], []];
  for (let seeds = 0; seeds < 16;) {
    const k = ((rand() * h) | 0) * w + ((rand() * w) | 0);
    if (grid[k] !== EMPTY || cracked[sideOf(k)]!.length >= 8) continue;
    grid[k] = rand() * 360;
    cracked[sideOf(k)]!.push(k);
    seeds++;
  }

  const begin = (side: number, c: Crack = { x: 0, y: 0, t: 0, side }) => {
    const pool = cracked[side]!;
    const k = pool[(rand() * pool.length) | 0]!;
    const t = grid[k]! + (rand() < 0.5 ? 90 : -90) + rand() * 4 - 2;
    c.x = (k % w) + 0.61 * Math.cos(t * deg);
    c.y = ((k / w) | 0) + 0.61 * Math.sin(t * deg);
    c.t = t;
    return c;
  };
  const move = (c: Crack) => {
    c.x += 0.42 * Math.cos(c.t * deg);
    c.y += 0.42 * Math.sin(c.t * deg);
    const x = (c.x + rand() * 0.66 - 0.33) | 0;
    const y = (c.y + rand() * 0.66 - 0.33) | 0;
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    const k = y * w + x;
    const g = grid[k]!;
    if (g >= EMPTY) {
      grid[k] = c.t;
      cracked[c.side]!.push(k);
      return true;
    }
    return Math.abs(g - c.t) < 5;
  };
  const sand = (c: Crack) => {
    const dx = -Math.sin(c.t * deg);
    const dy = Math.cos(c.t * deg);
    let d = 3;
    for (; d < 800; d++) {
      const x = (c.x + dx * d) | 0;
      const y = (c.y + dy * d) | 0;
      if (x < 0 || y < 0 || x >= w || y >= h || grid[y * w + x]! < EMPTY) break;
    }
    for (let i = 0; i < 6; i++) {
      const r = d * rand() ** 2.5;
      ctx.fillRect(c.x + dx * r, c.y + dy * r, 1, 1);
    }
  };

  const cracks = [begin(0), begin(1), begin(0), begin(1)];
  const target = free / 30;
  const restarts = [(free / 300) | 0, (free / 300) | 0];
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  return () => {
    const active = [0, 0];
    for (const c of cracks) active[c.side]!++;
    const ahead = (side: number) =>
      active[1 - side]! > 0 &&
      cracked[side]!.length - cracked[1 - side]!.length > target * 0.03;
    ctx.beginPath();
    for (let i = cracks.length; i--;) {
      const c = cracks[i]!;
      if (ahead(c.side)) continue;
      ctx.moveTo(c.x, c.y);
      let s = 0;
      while (s++ < steps && move(c));
      ctx.lineTo(c.x, c.y);
      sand(c);
      if (cracked[c.side]!.length >= target) cracks.splice(i, 1);
      else if (s <= steps) {
        if (restarts[c.side]!-- > 0) {
          begin(c.side, c);
          if (active[c.side]!++ < 100) cracks.push(begin(c.side));
        } else cracks.splice(i, 1);
      }
    }
    ctx.stroke();
    if (!cracks.length) return 1;
    return Math.min(
      0.99,
      (cracked[0]!.length + cracked[1]!.length) / target / 2,
    );
  };
}

export function mountArt(el: HTMLElement, main: HTMLElement) {
  const seed = (Math.random() * 1e6) | 0;
  const narrow = matchMedia('(max-width: 51rem)');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let drawn = { w: 0, h: 0 };
  let raf = 0;

  const draw = (animate: boolean) => {
    cancelAnimationFrame(raf);
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (!w || !h) return;
    drawn = { w, h };
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const frame = narrow.matches
      ? substrate(ctx, w, h, seed, w, h * 0.32)
      : substrate(ctx, w, h, seed, main.clientWidth / 2, h);
    if (animate) el.replaceChildren(canvas);
    let start = 0;
    let done = 0;
    const loop = (now: number) => {
      start ||= now;
      const goal = animate ? (now - start) / 2500 : 1;
      const end = performance.now() + 8;
      while (done < goal && done < 1 && performance.now() < end) done = frame();
      if (done < 1) return void (raf = requestAnimationFrame(loop));
      if (!animate) el.replaceChildren(canvas);
    };
    raf = requestAnimationFrame(loop);
  };

  draw(!still);
  narrow.addEventListener('change', () => draw(false));

  let timer: ReturnType<typeof setTimeout>;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const dw = Math.abs(el.clientWidth - drawn.w) / (drawn.w || 1);
      const dh = Math.abs(el.clientHeight - drawn.h) / (drawn.h || 1);
      if (dw > 0.15 || dh > 0.25) draw(false);
    }, 300);
  });
}
