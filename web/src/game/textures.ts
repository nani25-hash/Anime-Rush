import * as THREE from 'three';

/* ================================================================== */
/* Helpers                                                              */
/* ================================================================== */

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d') };
}

interface TexOpts {
  srgb?: boolean;
  repeat?: boolean;
  repeatXY?: [number, number];
  anisotropy?: number;
}

function toTexture(canvas: HTMLCanvasElement, o: TexOpts = {}): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  if (o.repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  if (o.repeatXY) tex.repeat.set(o.repeatXY[0], o.repeatXY[1]);
  if (o.srgb !== false) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = o.anisotropy ?? 8;
  return tex;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/** Draw `fn` at (x,y) and at wrapped offsets so tiles repeat without seams. */
function wrapDraw(size: number, x: number, y: number, extent: number, fn: (ox: number, oy: number) => void): void {
  const xs = [0];
  const ys = [0];
  if (x - extent < 0) xs.push(size);
  if (x + extent > size) xs.push(-size);
  if (y - extent < 0) ys.push(size);
  if (y + extent > size) ys.push(-size);
  for (const dx of xs) for (const dy of ys) fn(x + dx, y + dy);
}

/* ================================================================== */
/* Cobblestone path (the "road")                                        */
/* ================================================================== */

interface StoneRect {
  x: number;
  y: number;
  w: number;
  h: number;
  tone: number;
}

function stoneLayout(size: number, rows: number, seed: number): StoneRect[] {
  const rand = rng(seed);
  const rects: StoneRect[] = [];
  const rowH = size / rows;
  for (let r = 0; r < rows; r++) {
    const cols = 4 + Math.floor(rand() * 2);
    const raw: number[] = [];
    let sum = 0;
    for (let c = 0; c < cols; c++) {
      const v = 0.7 + rand() * 0.7;
      raw.push(v);
      sum += v;
    }
    let cursor = rand() * size;
    for (let c = 0; c < cols; c++) {
      const w = (raw[c] / sum) * size;
      rects.push({ x: cursor % size, y: r * rowH, w, h: rowH, tone: rand() });
      cursor += w;
    }
  }
  return rects;
}

export function createCobblestoneTexture(): THREE.CanvasTexture {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  if (!ctx) return toTexture(canvas, { repeat: true });
  const rand = rng(77);

  ctx.fillStyle = '#2a2622';
  ctx.fillRect(0, 0, size, size);

  for (const s of stoneLayout(size, 8, 4242)) {
    const hue = 26 + rand() * 24;
    const sat = 5 + rand() * 11;
    const light = 40 + s.tone * 20;
    wrapDraw(size, s.x, s.y, s.w + 8, (ox, oy) => {
      const m = 3;
      roundRect(ctx, ox + m, oy + m, s.w - m * 2, s.h - m * 2, 9);
      const g = ctx.createLinearGradient(ox, oy, ox + s.w, oy + s.h);
      g.addColorStop(0, `hsl(${hue}, ${sat}%, ${light + 7}%)`);
      g.addColorStop(1, `hsl(${hue + 6}, ${sat + 2}%, ${light - 8}%)`);
      ctx.fillStyle = g;
      ctx.fill();

      // speckled grain
      for (let k = 0; k < 46; k++) {
        const px = ox + m + 4 + rand() * (s.w - m * 2 - 8);
        const py = oy + m + 4 + rand() * (s.h - m * 2 - 8);
        ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.12)';
        ctx.fillRect(px, py, 1 + rand() * 2.5, 1 + rand() * 2);
      }
      // bevel highlight (top/left) + shade (bottom/right)
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,245,230,0.22)';
      ctx.beginPath();
      ctx.moveTo(ox + m + 6, oy + m + 1.5);
      ctx.lineTo(ox + s.w - m - 6, oy + m + 1.5);
      ctx.moveTo(ox + m + 1.5, oy + m + 6);
      ctx.lineTo(ox + m + 1.5, oy + s.h - m - 6);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(10,6,16,0.38)';
      ctx.beginPath();
      ctx.moveTo(ox + m + 6, oy + s.h - m - 1.5);
      ctx.lineTo(ox + s.w - m - 6, oy + s.h - m - 1.5);
      ctx.moveTo(ox + s.w - m - 1.5, oy + m + 6);
      ctx.lineTo(ox + s.w - m - 1.5, oy + s.h - m - 6);
      ctx.stroke();

      // moss near edges
      if (rand() < 0.35) {
        const mx = ox + (rand() > 0.5 ? m + 4 : s.w - m - 4);
        const my = oy + s.h - m - 4;
        const mg = ctx.createRadialGradient(mx, my, 1, mx, my, 16 + rand() * 12);
        mg.addColorStop(0, 'rgba(88,120,62,0.45)');
        mg.addColorStop(1, 'rgba(88,120,62,0)');
        ctx.fillStyle = mg;
        ctx.fillRect(mx - 30, my - 30, 60, 60);
      }
      // hairline cracks
      if (rand() < 0.18) {
        ctx.strokeStyle = 'rgba(15,10,10,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const cx0 = ox + s.w * (0.2 + rand() * 0.6);
        ctx.moveTo(cx0, oy + m + 3);
        ctx.lineTo(cx0 + (rand() - 0.5) * 18, oy + s.h * 0.55);
        ctx.lineTo(cx0 + (rand() - 0.5) * 26, oy + s.h - m - 3);
        ctx.stroke();
      }
    });
  }

  // sakura petals resting on the stones
  for (let i = 0; i < 70; i++) {
    const px = rand() * size;
    const py = rand() * size;
    const rot = rand() * Math.PI;
    wrapDraw(size, px, py, 8, (ox, oy) => {
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(rot);
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255,226,238,0.9)' : 'rgba(247,160,200,0.88)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 5.5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  return toTexture(canvas, { repeat: true, repeatXY: [2, 3], anisotropy: 12 });
}

export function createCobblestoneBumpTexture(): THREE.CanvasTexture {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  if (!ctx) return toTexture(canvas, { srgb: false, repeat: true });
  const rand = rng(91);
  ctx.fillStyle = '#202020';
  ctx.fillRect(0, 0, size, size);
  for (const s of stoneLayout(size, 8, 4242)) {
    const base = 150 + Math.floor(rand() * 60);
    wrapDraw(size, s.x, s.y, s.w + 8, (ox, oy) => {
      const m = 3;
      roundRect(ctx, ox + m, oy + m, s.w - m * 2, s.h - m * 2, 9);
      const g = ctx.createRadialGradient(
        ox + s.w / 2,
        oy + s.h / 2,
        4,
        ox + s.w / 2,
        oy + s.h / 2,
        Math.max(s.w, s.h) * 0.62,
      );
      g.addColorStop(0, `rgb(${base + 30},${base + 30},${base + 30})`);
      g.addColorStop(1, `rgb(${base - 40},${base - 40},${base - 40})`);
      ctx.fillStyle = g;
      ctx.fill();
      for (let k = 0; k < 40; k++) {
        const v = 110 + Math.floor(rand() * 140);
        ctx.fillStyle = `rgba(${v},${v},${v},0.5)`;
        ctx.fillRect(ox + m + rand() * (s.w - 2 * m), oy + m + rand() * (s.h - 2 * m), 2, 2);
      }
    });
  }
  return toTexture(canvas, { srgb: false, repeat: true, repeatXY: [2, 3], anisotropy: 8 });
}

/* Backwards-compatible names used by the previous EnvironmentBuilder */
export const createRailwayTrackTexture = createCobblestoneTexture;
export const createRoadBumpTexture = createCobblestoneBumpTexture;

/* ================================================================== */
/* Stone, grass, plaster, roof, shoji, wood                              */
/* ================================================================== */

export function createStoneTexture(): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size, size);
  if (!ctx) return toTexture(canvas, { repeat: true });
  const rand = rng(11);
  ctx.fillStyle = '#9a958d';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 22; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 20 + rand() * 50;
    wrapDraw(size, x, y, r, (ox, oy) => {
      const g = ctx.createRadialGradient(ox, oy, 2, ox, oy, r);
      const l = rand() > 0.5 ? '255,255,255' : '40,36,40';
      g.addColorStop(0, `rgba(${l},0.12)`);
      g.addColorStop(1, `rgba(${l},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(ox - r, oy - r, r * 2, r * 2);
    });
  }
  for (let i = 0; i < 1800; i++) {
    const v = 90 + Math.floor(rand() * 130);
    ctx.fillStyle = `rgba(${v},${v - 3},${v - 8},0.38)`;
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
  }
  // lichen
  for (let i = 0; i < 16; i++) {
    const x = rand() * size;
    const y = rand() * size;
    wrapDraw(size, x, y, 22, (ox, oy) => {
      const g = ctx.createRadialGradient(ox, oy, 1, ox, oy, 12 + rand() * 10);
      g.addColorStop(0, 'rgba(110,140,80,0.35)');
      g.addColorStop(1, 'rgba(110,140,80,0)');
      ctx.fillStyle = g;
      ctx.fillRect(ox - 24, oy - 24, 48, 48);
    });
  }
  return toTexture(canvas, { repeat: true });
}

export function createGrassTexture(): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size, size);
  if (!ctx) return toTexture(canvas, { repeat: true });
  const rand = rng(303);
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, '#2a5a37');
  bg.addColorStop(1, '#21472f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 1500; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const len = 6 + rand() * 12;
    const lean = (rand() - 0.5) * 6;
    const hue = 105 + rand() * 40;
    const light = 22 + rand() * 24;
    wrapDraw(size, x, y, len + 4, (ox, oy) => {
      ctx.strokeStyle = `hsla(${hue}, 44%, ${light}%, 0.8)`;
      ctx.lineWidth = 1 + rand() * 1.3;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.quadraticCurveTo(ox + lean * 0.4, oy - len * 0.5, ox + lean, oy - len);
      ctx.stroke();
    });
  }
  // fallen blossoms
  for (let i = 0; i < 70; i++) {
    const x = rand() * size;
    const y = rand() * size;
    wrapDraw(size, x, y, 6, (ox, oy) => {
      ctx.fillStyle = rand() > 0.4 ? 'rgba(248,166,203,0.9)' : 'rgba(255,230,240,0.9)';
      ctx.beginPath();
      ctx.ellipse(ox, oy, 3.4, 2, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  return toTexture(canvas, { repeat: true });
}

export function createPlasterTexture(): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size, size);
  if (!ctx) return toTexture(canvas, { repeat: true });
  const rand = rng(515);
  ctx.fillStyle = '#e4dccb';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 26; i++) {
    const x = rand() * size;
    const w = 6 + rand() * 18;
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, 'rgba(90,70,50,0)');
    g.addColorStop(0.5, `rgba(90,70,50,${0.04 + rand() * 0.07})`);
    g.addColorStop(1, 'rgba(90,70,50,0)');
    wrapDraw(size, x, 0, w, (ox) => {
      ctx.fillStyle = g;
      ctx.fillRect(ox, 0, w, size);
    });
  }
  for (let i = 0; i < 2600; i++) {
    const v = 190 + Math.floor(rand() * 60);
    ctx.fillStyle = `rgba(${v},${v - 6},${v - 18},0.28)`;
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
  }
  // damp stains near the bottom edge of the tile
  const stain = ctx.createLinearGradient(0, size * 0.75, 0, size);
  stain.addColorStop(0, 'rgba(70,60,50,0)');
  stain.addColorStop(1, 'rgba(70,60,50,0.18)');
  ctx.fillStyle = stain;
  ctx.fillRect(0, size * 0.75, size, size * 0.25);
  return toTexture(canvas, { repeat: true });
}

export function createRoofTileTexture(): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size, size);
  if (!ctx) return toTexture(canvas, { repeat: true });
  const rand = rng(909);
  ctx.fillStyle = '#232a3a';
  ctx.fillRect(0, 0, size, size);
  const cols = 16;
  const rows = 8;
  const cw = size / cols;
  const rh = size / rows;
  for (let c = 0; c < cols; c++) {
    const g = ctx.createLinearGradient(c * cw, 0, (c + 1) * cw, 0);
    g.addColorStop(0, '#171c28');
    g.addColorStop(0.45, '#4a5873');
    g.addColorStop(0.6, '#5d6c8b');
    g.addColorStop(1, '#1a2030');
    ctx.fillStyle = g;
    ctx.fillRect(c * cw, 0, cw - 1, size);
  }
  for (let r = 0; r < rows; r++) {
    const y = r * rh;
    const lg = ctx.createLinearGradient(0, y, 0, y + rh);
    lg.addColorStop(0, 'rgba(0,0,0,0.55)');
    lg.addColorStop(0.18, 'rgba(0,0,0,0)');
    lg.addColorStop(0.82, 'rgba(255,255,255,0.05)');
    lg.addColorStop(1, 'rgba(255,255,255,0.14)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, y, size, rh);
  }
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(${rand() > 0.5 ? '255,255,255' : '0,0,0'},${0.04 + rand() * 0.06})`;
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 3, 1 + rand() * 2);
  }
  return toTexture(canvas, { repeat: true });
}

export function createShojiTexture(): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size, size);
  if (!ctx) return toTexture(canvas);
  const g = ctx.createRadialGradient(size / 2, size * 0.55, 10, size / 2, size / 2, size * 0.75);
  g.addColorStop(0, '#fff0c8');
  g.addColorStop(0.55, '#ffcf86');
  g.addColorStop(1, '#f59a4c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // paper fibres
  const rand = rng(21);
  for (let i = 0; i < 260; i++) {
    ctx.strokeStyle = `rgba(255,255,255,${0.05 + rand() * 0.1})`;
    ctx.lineWidth = 1;
    const x = rand() * size;
    const y = rand() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 16, y + (rand() - 0.5) * 16);
    ctx.stroke();
  }
  // kumiko lattice
  ctx.fillStyle = '#3a2417';
  const bars = 4;
  for (let i = 0; i <= bars; i++) {
    const p = (i / bars) * (size - 10);
    ctx.fillRect(p, 0, 10, size);
  }
  const hbars = 6;
  for (let i = 0; i <= hbars; i++) {
    const p = (i / hbars) * (size - 8);
    ctx.fillRect(0, p, size, 8);
  }
  ctx.fillStyle = 'rgba(255,220,160,0.28)';
  ctx.fillRect(0, 0, size, 3);
  return toTexture(canvas, { anisotropy: 8 });
}

export function createDarkWoodTexture(): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size, size);
  if (!ctx) return toTexture(canvas, { repeat: true });
  const rand = rng(1313);
  ctx.fillStyle = '#4a3326';
  ctx.fillRect(0, 0, size, size);
  for (let x = 0; x < size; x += 2) {
    const v = 0.04 + rand() * 0.14;
    ctx.fillStyle = rand() > 0.5 ? `rgba(20,10,6,${v})` : `rgba(190,130,90,${v * 0.5})`;
    ctx.fillRect(x, 0, 1 + rand() * 2, size);
  }
  for (let i = 0; i < 14; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.strokeStyle = 'rgba(15,8,4,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y, 3 + rand() * 4, 10 + rand() * 20, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  return toTexture(canvas, { repeat: true });
}

export function createWoodGrainTexture(): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size, size);
  if (!ctx) return toTexture(canvas, { repeat: true });
  const rand = rng(1717);
  const base = ctx.createLinearGradient(0, 0, size, 0);
  base.addColorStop(0, '#b92b1f');
  base.addColorStop(0.5, '#d83a28');
  base.addColorStop(1, '#b02419');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 2) {
    const a = 0.04 + rand() * 0.08;
    ctx.fillStyle = y % 4 === 0 ? `rgba(60,10,6,${a})` : `rgba(255,190,160,${a * 0.55})`;
    ctx.fillRect(0, y, size, 1 + rand() * 1.5);
  }
  // lacquer gloss streak
  const gloss = ctx.createLinearGradient(0, 0, size, 0);
  gloss.addColorStop(0.1, 'rgba(255,230,220,0)');
  gloss.addColorStop(0.28, 'rgba(255,230,220,0.28)');
  gloss.addColorStop(0.4, 'rgba(255,230,220,0)');
  ctx.fillStyle = gloss;
  ctx.fillRect(0, 0, size, size);
  return toTexture(canvas, { repeat: true });
}

/* ================================================================== */
/* Lighting sprites & sky                                                */
/* ================================================================== */

export function createRadialShadowTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(128, 128);
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
    grad.addColorStop(0, 'rgba(8, 6, 20, 0.8)');
    grad.addColorStop(0.55, 'rgba(8, 6, 20, 0.38)');
    grad.addColorStop(1, 'rgba(8, 6, 20, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(canvas);
}

export function createSoftGlowTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(128, 128);
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.18, 'rgba(255,255,255,0.65)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.16)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  return toTexture(canvas, { anisotropy: 1 });
}

export function createMoonGlowTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(256, 256);
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 14, 128, 128, 126);
    grad.addColorStop(0, 'rgba(255, 244, 228, 0.95)');
    grad.addColorStop(0.3, 'rgba(255, 214, 232, 0.5)');
    grad.addColorStop(0.65, 'rgba(150, 170, 255, 0.2)');
    grad.addColorStop(1, 'rgba(120, 150, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  return toTexture(canvas, { anisotropy: 1 });
}

export function createMoonTexture(): THREE.CanvasTexture {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  if (ctx) {
    const rand = rng(8);
    const g = ctx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, size / 2);
    g.addColorStop(0, '#fffaf0');
    g.addColorStop(0.8, '#ffeccb');
    g.addColorStop(1, '#ffd9b0');
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 16; i++) {
      const x = size * (0.15 + rand() * 0.7);
      const y = size * (0.15 + rand() * 0.7);
      const r = 20 + rand() * 60;
      const mg = ctx.createRadialGradient(x, y, 2, x, y, r);
      mg.addColorStop(0, 'rgba(190,150,120,0.22)');
      mg.addColorStop(1, 'rgba(190,150,120,0)');
      ctx.fillStyle = mg;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  }
  return toTexture(canvas, { anisotropy: 2 });
}

export function createAnimeTwilightSkyTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const { canvas, ctx } = makeCanvas(w, h);
  if (ctx) {
    const rand = rng(2468);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#080b2b');
    grad.addColorStop(0.3, '#1a2466');
    grad.addColorStop(0.55, '#46489a');
    grad.addColorStop(0.78, '#a275b8');
    grad.addColorStop(1, '#f0aac4');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // moonlit aura behind the (separate) moon disc
    const aura = ctx.createRadialGradient(w / 2, 300, 10, w / 2, 300, 300);
    aura.addColorStop(0, 'rgba(255,236,226,0.75)');
    aura.addColorStop(0.25, 'rgba(255,200,226,0.35)');
    aura.addColorStop(0.7, 'rgba(130,150,255,0.12)');
    aura.addColorStop(1, 'rgba(130,150,255,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, w, h);

    // stars
    for (let i = 0; i < 220; i++) {
      const x = rand() * w;
      const y = rand() * h * 0.5;
      const r = 0.5 + rand() * 1.3;
      ctx.fillStyle = i % 5 === 0 ? 'rgba(255,240,170,0.95)' : 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // layered anime clouds, rim-lit from the moon
    for (let layer = 0; layer < 3; layer++) {
      const baseY = 250 + layer * 60;
      for (let i = 0; i < 9; i++) {
        const cx = rand() * w;
        const cy = baseY + rand() * 36;
        const rw = 90 + rand() * 150;
        const rh2 = 14 + rand() * 20;
        const cg = ctx.createRadialGradient(cx, cy, 4, cx, cy, rw);
        cg.addColorStop(0, `rgba(${90 + layer * 25},${88 + layer * 20},${150 + layer * 20},0.55)`);
        cg.addColorStop(1, 'rgba(80,80,150,0)');
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, rh2 / rw);
        ctx.translate(-cx, -cy);
        ctx.fillStyle = cg;
        ctx.fillRect(cx - rw, cy - rw, rw * 2, rw * 2);
        ctx.restore();
        // thin pink rim on the upper edge
        ctx.strokeStyle = 'rgba(255,205,230,0.28)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy - rh2 * 0.35, rw * 0.55, rh2 * 0.55, 0, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }
    }
  }
  return toTexture(canvas, { anisotropy: 2 });
}

/* ================================================================== */
/* Signs (kept under the old name)                                       */
/* ================================================================== */

export function createNeonSignTexture(
  mainText: string,
  subText: string,
  bgHex: string,
  borderHex: string,
): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(256, 128);
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, bgHex);
    g.addColorStop(1, '#0b0a14');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 128);
    // lacquered board border + inner gold line
    ctx.strokeStyle = borderHex;
    ctx.lineWidth = 7;
    ctx.strokeRect(4, 4, 248, 120);
    ctx.strokeStyle = 'rgba(255,230,160,0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, 232, 104);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = borderHex;
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#fff7e6';
    ctx.font = 'bold 30px "Noto Serif JP", "Yu Mincho", serif';
    ctx.fillText(mainText, 128, 50);
    ctx.shadowBlur = 0;
    ctx.fillStyle = borderHex;
    ctx.font = 'bold 15px "Noto Sans JP", sans-serif';
    ctx.fillText(subText, 128, 92);
  }
  return toTexture(canvas, { anisotropy: 4 });
}

/* ================================================================== */
/* Metro Train textures (Blue & White commuter style per reference)    */
/* ================================================================== */

export function createRushTrainSideTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(512, 256);
  if (ctx) {
    // Sleek pearl-white / cool grey carriage upper body
    const bodyGrad = ctx.createLinearGradient(0, 0, 0, 256);
    bodyGrad.addColorStop(0, '#e2e8f0');
    bodyGrad.addColorStop(0.12, '#f8fafc');
    bodyGrad.addColorStop(0.76, '#e2e8f0');
    bodyGrad.addColorStop(0.78, '#1e293b');
    bodyGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(0, 0, 512, 256);

    // Bold royal blue mid-body band (iconic reference blue stripe)
    const blueGrad = ctx.createLinearGradient(0, 126, 0, 166);
    blueGrad.addColorStop(0, '#2563eb');
    blueGrad.addColorStop(0.5, '#1d4ed8');
    blueGrad.addColorStop(1, '#1e40af');
    ctx.fillStyle = blueGrad;
    ctx.fillRect(0, 128, 512, 34);

    // Thin silver accent pinstripe
    ctx.fillStyle = '#93c5fd';
    ctx.fillRect(0, 125, 512, 3);
    ctx.fillRect(0, 162, 512, 2);

    // Passenger doors & dark tinted side windows
    const bays = [24, 152, 280, 408];
    for (let i = 0; i < bays.length; i++) {
      const bx = bays[i];
      if (i % 2 === 0) {
        // Double sliding commuter door
        ctx.fillStyle = '#cbd5e1';
        roundRect(ctx, bx, 28, 84, 174, 6);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx + 42, 28);
        ctx.lineTo(bx + 42, 202);
        ctx.stroke();
        // Door windows
        for (const dx of [bx + 8, bx + 48]) {
          ctx.fillStyle = '#1e293b';
          roundRect(ctx, dx, 42, 28, 66, 4);
          ctx.fill();
          ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
          ctx.fillRect(dx + 4, 46, 8, 56);
        }
      } else {
        // Wide dark glass passenger window
        ctx.fillStyle = '#0f172a';
        roundRect(ctx, bx, 40, 102, 74, 8);
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3;
        ctx.stroke();
        // Specular diagonal glass sheen
        ctx.fillStyle = 'rgba(186, 230, 253, 0.25)';
        ctx.beginPath();
        ctx.moveTo(bx + 12, 44);
        ctx.lineTo(bx + 38, 44);
        ctx.lineTo(bx + 22, 110);
        ctx.lineTo(bx + 4, 110);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Metallic undercarriage vents
    ctx.fillStyle = '#334155';
    for (let vx = 18; vx < 490; vx += 44) {
      roundRect(ctx, vx, 212, 32, 32, 3);
      ctx.fill();
    }
  }
  return toTexture(canvas, { anisotropy: 8 });
}

export function createRushTrainFrontTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(256, 256);
  if (ctx) {
    // Silver roof crown + metallic bumper base
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, 256, 256);

    // Royal blue front mask matching Train reference sheet
    const blueMask = ctx.createLinearGradient(0, 24, 0, 210);
    blueMask.addColorStop(0, '#3b82f6');
    blueMask.addColorStop(0.35, '#1d4ed8');
    blueMask.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = blueMask;
    roundRect(ctx, 14, 24, 228, 182, 18);
    ctx.fill();

    // Panoramic 3-pane tinted windshield
    ctx.fillStyle = '#0f172a';
    roundRect(ctx, 30, 42, 196, 86, 10);
    ctx.fill();
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Windshield diagonal sheen
    ctx.fillStyle = 'rgba(148, 163, 184, 0.24)';
    ctx.beginPath();
    ctx.moveTo(46, 46);
    ctx.lineTo(84, 46);
    ctx.lineTo(58, 124);
    ctx.lineTo(36, 124);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(92, 42, 4, 86);
    ctx.fillRect(160, 42, 4, 86);

    // Glowing square yellow twin headlights
    for (const hx of [40, 186]) {
      ctx.fillStyle = '#fef08a';
      roundRect(ctx, hx, 152, 30, 24, 5);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, hx + 6, 157, 18, 14, 3);
      ctx.fill();
    }

    // Center destination LED badge
    ctx.fillStyle = '#020617';
    roundRect(ctx, 96, 156, 64, 18, 4);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RUSH', 128, 165);

    // Undercarriage bumper & coupler
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 208, 256, 48);
    ctx.fillStyle = '#475569';
    roundRect(ctx, 104, 214, 48, 28, 4);
    ctx.fill();
  }
  return toTexture(canvas, { anisotropy: 8 });
}

export const createFestivalCartSideTexture = createRushTrainSideTexture;
export const createFestivalCartFrontTexture = createRushTrainFrontTexture;

/* ================================================================== */
/* Brick Wall & Ornate Archway + Uploaded Atlas Loaders                 */
/* ================================================================== */

export function createBrickWallTexture(): THREE.CanvasTexture {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  if (ctx) {
    const rand = rng(7711);
    ctx.fillStyle = '#d6c7b8'; // warm cream mortar
    ctx.fillRect(0, 0, size, size);

    const rows = 12;
    const cols = 6;
    const rowH = size / rows;
    const colW = size / cols;
    const palette = ['#9a2e22', '#b23b2a', '#8c281d', '#c24833', '#a33325'];

    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (colW * 0.5);
      for (let c = -1; c <= cols; c++) {
        const bx = c * colW + offset;
        const by = r * rowH;
        const m = 4;
        ctx.fillStyle = palette[Math.floor(rand() * palette.length)];
        roundRect(ctx, bx + m, by + m, colW - m * 2, rowH - m * 2, 4);
        ctx.fill();

        // Top highlight + bottom shadow
        ctx.fillStyle = 'rgba(255, 220, 195, 0.16)';
        ctx.fillRect(bx + m + 2, by + m + 1, colW - m * 2 - 4, 3);
        ctx.fillStyle = 'rgba(20, 5, 5, 0.24)';
        ctx.fillRect(bx + m + 2, by + rowH - m - 4, colW - m * 2 - 4, 3);
      }
    }
  }
  return toTexture(canvas, { repeat: true, anisotropy: 8 });
}

export function createOrnateArchTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(256, 256);
  if (ctx) {
    const bg = ctx.createLinearGradient(0, 0, 256, 256);
    bg.addColorStop(0, '#ec4899');
    bg.addColorStop(0.5, '#f472b6');
    bg.addColorStop(1, '#db2777');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 256);

    // Turquoise & gold ornate floral swirls matching reference image
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 8;
    for (let y = 24; y < 256; y += 44) {
      ctx.beginPath();
      ctx.arc(64, y, 16, 0, Math.PI * 1.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(192, y + 14, 16, 0.4, Math.PI * 1.9);
      ctx.stroke();
    }
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 240, 240);
  }
  return toTexture(canvas, { repeat: true, anisotropy: 4 });
}

export function loadAtlasCropTexture(
  atlasUrl: string,
  sxRatio: number,
  syRatio: number,
  swRatio: number,
  shRatio: number,
  fallbackPainter: (ctx: CanvasRenderingContext2D, size: number) => void,
  repeat = false,
): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size, size);
  if (ctx) {
    fallbackPainter(ctx, size);
  }
  const tex = toTexture(canvas, { repeat, anisotropy: 8 });

  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.onload = () => {
      if (!ctx || img.width === 0 || img.height === 0) return;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(
        img,
        img.width * sxRatio,
        img.height * syRatio,
        img.width * swRatio,
        img.height * shRatio,
        0,
        0,
        size,
        size,
      );
      tex.needsUpdate = true;
    };
    img.src = atlasUrl;
  }
  return tex;
}

/* ================================================================== */
/* Coin & petals                                                         */
/* ================================================================== */

export function createNekoCoinTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(256, 256);
  if (ctx) {
    const grad = ctx.createRadialGradient(100, 90, 12, 128, 128, 126);
    grad.addColorStop(0, '#fff6b8');
    grad.addColorStop(0.55, '#facc15');
    grad.addColorStop(1, '#c47a08');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(128, 128, 122, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#fff3a8';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(128, 128, 104, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120,60,0,0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(128, 128, 112, 0, Math.PI * 2);
    ctx.stroke();

    // embossed maneki-neko face
    const brown = '#8a4b08';
    ctx.fillStyle = brown;
    ctx.beginPath();
    ctx.ellipse(128, 140, 52, 44, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(128 + s * 18, 108);
      ctx.lineTo(128 + s * 56, 64);
      ctx.lineTo(128 + s * 54, 118);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f7b29a';
      ctx.beginPath();
      ctx.moveTo(128 + s * 28, 108);
      ctx.lineTo(128 + s * 50, 78);
      ctx.lineTo(128 + s * 49, 112);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = brown;
    }
    ctx.strokeStyle = '#ffe9a6';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(128 + s * 22, 134, 9, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        ctx.moveTo(128 + s * 36, 150 + k * 7);
        ctx.lineTo(128 + s * 62, 146 + k * 12);
        ctx.stroke();
      }
    }
    ctx.fillStyle = '#ff9fb5';
    ctx.beginPath();
    ctx.moveTo(122, 148);
    ctx.lineTo(134, 148);
    ctx.lineTo(128, 156);
    ctx.closePath();
    ctx.fill();
    // little bell
    ctx.fillStyle = '#fff3a8';
    ctx.beginPath();
    ctx.arc(128, 188, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = brown;
    ctx.fillRect(122, 186, 12, 2);
  }
  return toTexture(canvas, { anisotropy: 8 });
}

export function createPetalTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(64, 64);
  if (ctx) {
    ctx.translate(32, 32);
    const g = ctx.createLinearGradient(0, -24, 0, 24);
    g.addColorStop(0, '#fff0f6');
    g.addColorStop(0.6, '#f9a8cf');
    g.addColorStop(1, '#ee79ad');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.bezierCurveTo(-22, 14, -20, -14, -7, -22);
    ctx.lineTo(0, -15);
    ctx.lineTo(7, -22);
    ctx.bezierCurveTo(20, -14, 22, 14, 0, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(210,80,140,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(0, -10);
    ctx.stroke();
  }
  return toTexture(canvas, { anisotropy: 2 });
}
