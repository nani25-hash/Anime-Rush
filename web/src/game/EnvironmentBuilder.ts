import * as THREE from 'three';
import { GAME_CONSTANTS, QualityPreset } from '../types/game';
import {
  GeoCache,
  MeshBucket,
  Vec3Tuple,
  createRoofGeometry,
  mulberry32,
} from './meshBuilder';
import {
  createAnimeTwilightSkyTexture,
  createCobblestoneBumpTexture,
  createCobblestoneTexture,
  createDarkWoodTexture,
  createGrassTexture,
  createMoonGlowTexture,
  createMoonTexture,
  createNeonSignTexture,
  createPetalTexture,
  createPlasterTexture,
  createRoofTileTexture,
  createShojiTexture,
  createSoftGlowTexture,
  createStoneTexture,
  createWoodGrainTexture,
} from './textures';
import { WorldCurveUniforms, applyWorldCurveShader } from './worldCurve';

/* ------------------------------------------------------------------ */
/* Small builders (all output goes into merged MeshBuckets)             */
/* ------------------------------------------------------------------ */

interface Kit {
  g: GeoCache;
  roof: (w: number, d: number, rise: number, hipRun?: number, uplift?: number) => THREE.BufferGeometry;
}

interface SignSpec {
  x: number;
  y: number;
  z: number;
  mat: number;
}

interface BuildingSpec {
  cx: number;
  cz: number;
  side: -1 | 1;
  w: number;
  d: number;
  floors: number;
  seed: number;
  plaster: number;
  wood: number;
  far: boolean;
}

const BLOSSOM_NEAR = [0xf7a8cb, 0xf9c3dc, 0xee86b4, 0xffd7e6, 0xe97aa8, 0xfbb6d2];
const BLOSSOM_FAR = [0xb98ac4, 0xcc9bd0, 0xa77fb8, 0xd7b0dc];
const GREENS = [0x2f6a3f, 0x3a7a46, 0x285a38, 0x437f4d];
const NOREN = [0x1d2a5c, 0x6a1c2c, 0x2c4a3a, 0x3b2a63];

const UP = new THREE.Vector3(0, 1, 0);
const q2 = (v: number): number => Math.round(v * 50) / 50;

function limb(
  b: MeshBucket,
  k: Kit,
  key: string,
  a: Vec3Tuple,
  c: Vec3Tuple,
  r0: number,
  r1: number,
  col: number,
): void {
  const dir = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
  const len = dir.length();
  if (len < 1e-4) return;
  dir.normalize();
  const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir));
  b.add(key, k.g.cyl(q2(r1), q2(r0), 1, 7), {
    p: [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2],
    r: [e.x, e.y, e.z],
    s: [1, len, 1],
    c: col,
  });
}

function addChochin(b: MeshBucket, k: Kit, x: number, y: number, z: number, sc: number, halo: boolean, col = 0xff5a2a): void {
  b.add('lamp', k.g.sphere(10, 8), { p: [x, y, z], s: [0.2 * sc, 0.27 * sc, 0.2 * sc], c: col });
  b.add('wood', k.g.cyl(0.13, 0.13, 1, 8), { p: [x, y + 0.28 * sc, z], s: [sc, 0.06 * sc, sc], c: 0x1a1214 });
  b.add('wood', k.g.cyl(0.13, 0.13, 1, 8), { p: [x, y - 0.28 * sc, z], s: [sc, 0.06 * sc, sc], c: 0x1a1214 });
  if (halo) b.add('halo', k.g.plane(), { p: [x, y, z], s: [1.7 * sc, 1.7 * sc, 1], c: 0xff8a3c });
}

function addStoneLantern(b: MeshBucket, k: Kit, x: number, z: number, sc: number): void {
  const g = k.g;
  const stone = 0x9b9892;
  const dark = 0x7a7771;
  b.add('stone', g.box(), { p: [x, 0.09 * sc, z], s: [0.7 * sc, 0.18 * sc, 0.7 * sc], c: dark });
  b.add('stone', g.cyl(0.13, 0.17, 1, 8), { p: [x, 0.18 * sc + 0.36 * sc, z], s: [sc, 0.72 * sc, sc], c: stone });
  b.add('stone', g.cyl(0.19, 0.19, 1, 8), { p: [x, 0.93 * sc, z], s: [sc, 0.08 * sc, sc], c: dark });
  b.add('stone', g.cyl(0.36, 0.28, 1, 8), { p: [x, 1.0 * sc + 0.04 * sc, z], s: [sc, 0.1 * sc, sc], r: [0, Math.PI / 8, 0], c: stone });
  const fy = 1.28 * sc;
  b.add('lamp', g.box(), { p: [x, fy, z], s: [0.34 * sc, 0.34 * sc, 0.34 * sc], c: 0xffa648 });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.add('stone', g.box(), { p: [x + sx * 0.19 * sc, fy, z + sz * 0.19 * sc], s: [0.08 * sc, 0.4 * sc, 0.08 * sc], c: stone });
    }
  }
  b.add('stone', g.box(), { p: [x, fy + 0.22 * sc, z], s: [0.5 * sc, 0.06 * sc, 0.5 * sc], c: dark });
  b.add('stone', g.cone(0.52, 0.34, 4), { p: [x, fy + 0.42 * sc, z], s: [sc, sc, sc], r: [0, Math.PI / 4, 0], c: stone });
  b.add('stone', g.sphere(8, 6), { p: [x, fy + 0.66 * sc, z], s: [0.08 * sc, 0.1 * sc, 0.08 * sc], c: dark });
  b.add('halo', g.plane(), { p: [x, fy, z], s: [2.6 * sc, 2.6 * sc, 1], c: 0xff9a44 });
  b.add('halo', g.plane(), { p: [x, fy, z], r: [0, Math.PI / 2, 0], s: [2.6 * sc, 2.6 * sc, 1], c: 0xff9a44 });
}

function addBush(b: MeshBucket, k: Kit, x: number, z: number, sc: number, rnd: () => number): void {
  for (let i = 0; i < 3; i++) {
    const ox = (rnd() - 0.5) * 0.7 * sc;
    const oz = (rnd() - 0.5) * 0.7 * sc;
    const r = (0.38 + rnd() * 0.22) * sc;
    b.add('foliage', k.g.ico(1), { p: [x + ox, r * 0.7, z + oz], s: [r * 1.2, r * 0.9, r * 1.2], c: GREENS[Math.floor(rnd() * GREENS.length)] });
  }
  for (let i = 0; i < 6; i++) {
    b.add('blossom', k.g.ico(0), {
      p: [x + (rnd() - 0.5) * 0.9 * sc, 0.25 + rnd() * 0.5 * sc, z + (rnd() - 0.5) * 0.9 * sc],
      s: [0.13, 0.11, 0.13],
      c: BLOSSOM_NEAR[Math.floor(rnd() * BLOSSOM_NEAR.length)],
    });
  }
}

function addSakuraTree(
  b: MeshBucket,
  k: Kit,
  x: number,
  z: number,
  side: -1 | 1,
  sc: number,
  rnd: () => number,
  palette: number[],
  hang: boolean,
): void {
  const inw = -side;
  const bark = 0x2a1d24;
  const P0: Vec3Tuple = [x, 0, z];
  const P1: Vec3Tuple = [x + inw * 0.35 * sc, 1.7 * sc, z + (rnd() - 0.5) * 0.3];
  const P2: Vec3Tuple = [x + inw * 1.0 * sc, 3.2 * sc, z + (rnd() - 0.5) * 0.4];
  const P3: Vec3Tuple = [x + inw * 1.5 * sc, 4.5 * sc, z + (rnd() - 0.5) * 0.4];
  limb(b, k, 'wood', P0, P1, 0.44 * sc, 0.32 * sc, bark);
  limb(b, k, 'wood', P1, P2, 0.32 * sc, 0.24 * sc, bark);
  limb(b, k, 'wood', P2, P3, 0.24 * sc, 0.15 * sc, bark);
  // root flare
  b.add('wood', k.g.cyl(0.4, 0.62, 1, 8), { p: [x, 0.2 * sc, z], s: [sc, 0.45 * sc, sc], c: bark });

  const anchors: Vec3Tuple[] = [P3];
  const branchDefs: Array<[Vec3Tuple, number, number, number]> = [
    [P2, inw * 2.4, 4.0, 1.4],
    [P2, inw * 1.6, 4.6, -1.8],
    [P1, inw * 1.9, 3.1, 1.6],
    [P3, inw * 0.4, 5.6, -0.9],
    [P3, inw * 2.8, 5.2, 0.6],
  ];
  for (const [from, dx, ty, dz] of branchDefs) {
    const end: Vec3Tuple = [x + dx * sc, ty * sc, z + dz * sc];
    limb(b, k, 'wood', from, end, 0.14 * sc, 0.07 * sc, bark);
    anchors.push(end);
  }
  for (const a of anchors) {
    const r = (1.05 + rnd() * 0.55) * sc;
    const col = palette[Math.floor(rnd() * palette.length)];
    b.add('blossom', k.g.ico(1), { p: [a[0], a[1] + 0.35 * sc, a[2]], s: [r * 1.2, r * 0.82, r * 1.12], c: col });
    for (let i = 0; i < 4; i++) {
      const ang = rnd() * Math.PI * 2;
      const rr = r * (0.7 + rnd() * 0.3);
      const sr = r * (0.38 + rnd() * 0.2);
      b.add('blossom', k.g.ico(0), {
        p: [a[0] + Math.cos(ang) * rr, a[1] + 0.2 * sc + (rnd() - 0.3) * r * 0.7, a[2] + Math.sin(ang) * rr],
        s: [sr * 1.1, sr * 0.85, sr * 1.1],
        c: palette[Math.floor(rnd() * palette.length)],
      });
    }
  }
  if (hang) {
    const a = anchors[1];
    for (let i = 0; i < 2; i++) {
      const lx = a[0] + inw * i * 0.6;
      b.add('wood', k.g.cyl(0.015, 0.015, 1, 4), { p: [lx, a[1] - 0.45, a[2] + i * 0.3], s: [1, 0.9, 1], c: 0x120c10 });
      addChochin(b, k, lx, a[1] - 1.05, a[2] + i * 0.3, 0.9, true, i === 0 ? 0xff6a35 : 0xffa04a);
    }
  }
}

function addFlowerBed(b: MeshBucket, k: Kit, side: -1 | 1, half: number, len: number, rnd: () => number, count: number): void {
  for (let i = 0; i < count; i++) {
    const x = side * (half + 0.65 + rnd() * 2.4);
    const z = (rnd() - 0.5) * len;
    const r = 0.1 + rnd() * 0.13;
    b.add('blossom', k.g.ico(0), {
      p: [x, 0.08 + rnd() * 0.12, z],
      s: [r * 1.5, r, r * 1.5],
      c: BLOSSOM_NEAR[Math.floor(rnd() * BLOSSOM_NEAR.length)],
    });
  }
}

function addTorii(b: MeshBucket, k: Kit, cz: number, half: number): void {
  const g = k.g;
  const H = 8.0;
  const px = half + 0.55;
  const blk = 0x16111a;
  for (const s of [-1, 1] as const) {
    b.add('wood', g.cyl(0.46, 0.5, 1, 12), { p: [s * px, 0.5, cz], s: [1, 1.0, 1], c: blk });
    b.add('lacquer', g.cyl(0.3, 0.38, 1, 14), { p: [s * px, (1.0 + H) / 2, cz], s: [1, H - 1.0, 1] });
    b.add('lacquer', g.cyl(0.26, 0.3, 1, 12), { p: [s * px, 6.4, cz], s: [1.0, 0.5, 1] });
    b.add('wood', g.box(), { p: [s * (px + 0.18), 6.4, cz], s: [0.34, 0.9, 0.62], c: blk });
  }
  // kasagi + shimaki (upswept)
  b.add('lacquer', g.box(), { p: [0, H + 0.1, cz], s: [12.2, 0.46, 0.92] });
  b.add('wood', g.box(), { p: [0, H + 0.42, cz], s: [12.7, 0.16, 1.1], c: blk });
  for (const s of [-1, 1]) {
    b.add('lacquer', g.box(), { p: [s * 6.7, H + 0.32, cz], r: [0, 0, s * 0.2], s: [1.8, 0.46, 0.92] });
    b.add('wood', g.box(), { p: [s * 6.75, H + 0.66, cz], r: [0, 0, s * 0.2], s: [1.9, 0.16, 1.1], c: blk });
  }
  b.add('lacquer', g.box(), { p: [0, H - 0.45, cz], s: [11.4, 0.3, 0.66] });
  // nuki
  b.add('lacquer', g.box(), { p: [0, 6.4, cz], s: [10.6, 0.4, 0.5] });
  for (const s of [-1, 1]) b.add('wood', g.box(), { p: [s * 5.3, 6.4, cz], s: [0.18, 0.46, 0.56], c: blk });
  // plaque (gakuzuka)
  b.add('gold', g.box(), { p: [0, 7.3, cz], s: [1.3, 1.55, 0.3] });
  b.add('wood', g.box(), { p: [0, 7.3, cz + 0.02], s: [1.05, 1.3, 0.34], c: blk });
  b.add('gold', g.box(), { p: [0, 7.3, cz + 0.2], s: [0.22, 0.8, 0.06] });
  // shimenawa rope + paper shide
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const x = -3.4 + t * 6.8;
    const sag = Math.sin(t * Math.PI) * 0.28;
    b.add('cloth', g.sphere(6, 5), { p: [x, 6.0 - sag, cz + 0.04], s: [0.17, 0.15, 0.15], c: 0xcdb27a });
    if (i % 3 === 1) {
      b.add('cloth', g.box(), { p: [x, 5.7 - sag, cz + 0.04], s: [0.12, 0.34, 0.03], c: 0xfdf7ea });
      b.add('cloth', g.box(), { p: [x, 5.42 - sag, cz + 0.04], s: [0.12, 0.2, 0.03], c: 0xfdf7ea, r: [0, 0, 0.3] });
    }
  }
  // lanterns under the nuki
  for (const x of [-3.9, -2.0, 2.0, 3.9]) {
    b.add('wood', g.cyl(0.012, 0.012, 1, 4), { p: [x, 6.0, cz], s: [1, 0.4, 1], c: 0x120c10 });
    addChochin(b, k, x, 5.6, cz, 1.25, true);
  }
}

function addBuilding(b: MeshBucket, k: Kit, s: BuildingSpec, signs: SignSpec[]): void {
  const g = k.g;
  const rnd = mulberry32(s.seed);
  const f = -s.side;
  const X = (u: number): number => s.cx + f * u;
  const floorH = [3.2, 2.7, 2.4, 2.2];

  b.add('stone', g.box(), { p: [s.cx, 0.32, s.cz], s: [s.w + 0.4, 0.64, s.d + 0.4], c: s.far ? 0x6d6f8a : 0x8a857c });
  let y = 0.64;
  let topW = s.w;
  let topD = s.d;

  for (let fl = 0; fl < s.floors; fl++) {
    const h = floorH[Math.min(fl, floorH.length - 1)];
    const w = s.w - fl * 0.9;
    const d = s.d - fl * 0.9;
    const fx = w / 2;
    topW = w;
    topD = d;

    b.add('plaster', g.box(), { p: [s.cx, y + h / 2, s.cz], s: [w, h, d], c: s.plaster });
    // frame: corner posts + beams
    for (const zz of [-1, 1]) {
      b.add('wood', g.box(), { p: [X(fx), y + h / 2, s.cz + zz * d / 2], s: [0.26, h, 0.26], c: s.wood });
    }
    b.add('wood', g.box(), { p: [X(fx + 0.02), y + h - 0.12, s.cz], s: [0.22, 0.24, d], c: s.wood });
    b.add('wood', g.box(), { p: [X(fx + 0.02), y + 0.14, s.cz], s: [0.2, 0.26, d], c: s.wood });

    // +Z end face (the one the camera sees while approaching)
    const ez = s.cz + d / 2;
    b.add('wood', g.box(), { p: [s.cx, y + h - 0.12, ez + 0.02], s: [w, 0.24, 0.2], c: s.wood });
    b.add('wood', g.box(), { p: [s.cx, y + 0.14, ez + 0.02], s: [w, 0.26, 0.2], c: s.wood });
    for (let e = -1; e <= 1; e++) {
      b.add('wood', g.box(), { p: [s.cx + e * w * 0.3, y + h / 2, ez + 0.02], s: [0.18, h, 0.18], c: s.wood });
    }
    if (!s.far) {
      for (const e of [-1, 1]) {
        b.add('shoji', g.box(), { p: [s.cx + e * w * 0.15, y + h * 0.55, ez + 0.07], s: [w * 0.22, h * 0.5, 0.06] });
      }
    } else if (rnd() < 0.8) {
      b.add('shoji', g.box(), { p: [s.cx, y + h * 0.55, ez + 0.07], s: [w * 0.3, h * 0.45, 0.06] });
    }

    // front bays
    const bays = Math.max(2, Math.round(d / (s.far ? 2.2 : 1.55)));
    const bayW = d / bays;
    for (let i = 1; i < bays; i++) {
      b.add('wood', g.box(), { p: [X(fx + 0.03), y + h / 2, s.cz - d / 2 + i * bayW], s: [0.2, h, 0.2], c: s.wood });
    }
    for (let i = 0; i < bays; i++) {
      const zc = s.cz - d / 2 + (i + 0.5) * bayW;
      b.add('wood', g.box(), { p: [X(fx + 0.04), y + h * 0.52, zc], s: [0.07, h * 0.68, bayW * 0.88], c: s.wood });
      b.add('shoji', g.box(), { p: [X(fx + 0.09), y + h * 0.52, zc], s: [0.06, h * 0.62, bayW * 0.78] });
      if (!s.far && fl === 0 && i % 2 === 0) {
        const nc = NOREN[Math.floor(rnd() * NOREN.length)];
        b.add('cloth', g.box(), { p: [X(fx + 0.16), y + h * 0.7, zc], s: [0.05, 0.85, bayW * 0.7], c: nc });
        b.add('cloth', g.box(), { p: [X(fx + 0.17), y + h * 0.7, zc], s: [0.05, 0.28, bayW * 0.28], c: 0xf4efe0 });
        b.add('wood', g.cyl(0.03, 0.03, 1, 6), { p: [X(fx + 0.16), y + h * 0.7 + 0.45, zc], r: [Math.PI / 2, 0, 0], s: [1, bayW * 0.76, 1], c: 0x14100f });
      }
      if (!s.far && fl === 0) addChochin(b, k, X(fx + 0.62), y + h - 0.62, zc + bayW * 0.3, 0.85, i % 2 === 0);
    }

    // balcony (engawa) on upper floors
    if (fl > 0 && !s.far) {
      b.add('wood', g.box(), { p: [X(fx + 0.5), y + 0.06, s.cz], s: [1.0, 0.12, d * 0.98], c: s.wood });
      b.add('wood', g.box(), { p: [X(fx + 0.96), y + 0.64, s.cz], s: [0.08, 0.09, d * 0.98], c: s.wood });
      const posts = Math.max(3, Math.round(d / 0.9));
      for (let i = 0; i <= posts; i++) {
        b.add('wood', g.box(), { p: [X(fx + 0.96), y + 0.34, s.cz - d / 2 + (d * i) / posts], s: [0.07, 0.6, 0.07], c: s.wood });
      }
    }

    // eave roof above every floor except the last
    if (fl < s.floors - 1) {
      b.add('roof', k.roof(w + 2.6, d + 1.8, 0.75, 99, 0.3), { p: [s.cx, y + h, s.cz] });
    }
    y += h;
  }

  // main irimoya roof
  const rise = s.far ? 2.4 : 2.0;
  b.add('roof', k.roof(topW + 3.4, topD + 2.6, rise, topD * 0.38, 0.4), { p: [s.cx, y, s.cz] });
  b.add('roof', g.cyl(0.17, 0.17, 1, 8), { p: [s.cx, y + rise + 0.09, s.cz], r: [Math.PI / 2, 0, 0], s: [1, topD * 0.5 + 0.8, 1], c: 0x252d3e });
  for (const zz of [-1, 1]) {
    b.add('roof', g.box(), { p: [s.cx, y + rise + 0.3, s.cz + zz * (topD * 0.25 + 0.4)], s: [0.34, 0.55, 0.34], c: 0x2a3244 });
    b.add('gold', g.cone(0.12, 0.34, 6), { p: [s.cx, y + rise + 0.78, s.cz + zz * (topD * 0.25 + 0.4)] });
  }

  if (!s.far && rnd() < 0.8) {
    signs.push({ x: X(s.w / 2 + 1.0), y: 0.64 + floorH[0] - 0.9, z: s.cz + s.d * 0.18, mat: Math.floor(rnd() * 3) });
    b.add('wood', g.box(), { p: [X(s.w / 2 + 0.55), 0.64 + floorH[0] - 0.42, s.cz + s.d * 0.18], s: [1.1, 0.07, 0.07], c: 0x1a1214 });
  }
}

function addPagoda(b: MeshBucket, k: Kit, cx: number, cz: number, tiers: number): void {
  const g = k.g;
  b.add('stone', g.box(), { p: [cx, 0.5, cz], s: [7.2, 1.0, 7.2], c: 0x6d6f8a });
  let y = 1.0;
  for (let t = 0; t < tiers; t++) {
    const w = 5.2 - t * 0.7;
    const h = 2.3;
    b.add('plaster', g.box(), { p: [cx, y + h / 2, cz], s: [w - 0.9, h, w - 0.9], c: 0xb9b4c8 });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        b.add('lacquer', g.box(), { p: [cx + sx * (w - 0.9) / 2, y + h / 2, cz + sz * (w - 0.9) / 2], s: [0.3, h, 0.3] });
      }
    }
    b.add('shoji', g.box(), { p: [cx, y + h * 0.5, cz + (w - 0.9) / 2 + 0.05], s: [w * 0.3, h * 0.55, 0.06] });
    b.add('roof', k.roof(w + 2.0, w + 2.0, 1.0, 99, 0.45), { p: [cx, y + h, cz] });
    y += h + 0.25;
  }
  b.add('gold', g.cyl(0.12, 0.18, 1, 8), { p: [cx, y + 1.8, cz], s: [1, 3.6, 1] });
  for (let i = 0; i < 6; i++) {
    b.add('gold', g.torus(0.38 - i * 0.04, 0.05, 6, 12), { p: [cx, y + 0.6 + i * 0.4, cz], r: [Math.PI / 2, 0, 0] });
  }
}

interface MoteState {
  x: number;
  y: number;
  z: number;
  phase: number;
  speed: number;
  size: number;
}

interface PetalState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  spin: number;
  size: number;
}

const PHYSICAL_LIGHTS = Number(THREE.REVISION) >= 155;

export class EnvironmentBuilder {
  private readonly segments: THREE.Group[] = [];
  private readonly backdropGroup = new THREE.Group();
  private readonly petalInstancedMesh: THREE.InstancedMesh;
  private readonly petalStates: PetalState[] = [];
  private readonly maxPetals = 260;
  private activePetalCount = 150;

  private readonly moteMesh: THREE.InstancedMesh;
  private readonly moteStates: MoteState[] = [];
  private readonly maxMotes = 70;
  private activeMoteCount = 40;

  private readonly lanternLights: THREE.PointLight[] = [];
  private activeLights = 4;

  private readonly dummyMatrix = new THREE.Matrix4();
  private readonly dummyEuler = new THREE.Euler();
  private readonly dummyQuat = new THREE.Quaternion();
  private readonly dummyPos = new THREE.Vector3();
  private readonly dummyScale = new THREE.Vector3(1, 1, 1);
  private readonly dummyColor = new THREE.Color();

  private readonly sharedDisposables: Array<{ dispose: () => void }> = [];
  private readonly geoCache = new GeoCache();
  private readonly roofCache = new Map<string, THREE.BufferGeometry>();
  private readonly mats: Record<string, THREE.Material> = {};
  private time = 0;

  constructor(scene: THREE.Scene, curveUniforms: WorldCurveUniforms) {
    const L = GAME_CONSTANTS.SEGMENT_LENGTH;
    const HALF = GAME_CONSTANTS.ROAD_WIDTH * 0.5;

    /* ---------------- textures ---------------- */
    const trackTex = createCobblestoneTexture();
    trackTex.repeat.set(2, L / 4.2);
    const bumpTex = createCobblestoneBumpTexture();
    bumpTex.repeat.set(2, L / 4.2);
    const grassTex = createGrassTexture();
    const stoneTex = createStoneTexture();
    const plasterTex = createPlasterTexture();
    const roofTex = createRoofTileTexture();
    const shojiTex = createShojiTexture();
    const darkWoodTex = createDarkWoodTexture();
    const lacquerTex = createWoodGrainTexture();
    const skyTex = createAnimeTwilightSkyTexture();
    const moonTex = createMoonTexture();
    const glowTex = createMoonGlowTexture();
    const softGlowTex = createSoftGlowTexture();
    const petalTex = createPetalTexture();
    const signTexs = [
      createNeonSignTexture('夢はまだ終わらない', 'GOOD RUNS · BETTER DAYS', '#2a1650', '#f472b6'),
      createNeonSignTexture('走 ANIME RUSH', 'KYOTO LANTERN ROAD', '#0f1d3a', '#7dd3fc'),
      createNeonSignTexture('桜茶屋 SAKURA', 'TEAHOUSE · 1868', '#4a0f2c', '#facc15'),
    ];
    this.sharedDisposables.push(
      trackTex, bumpTex, grassTex, stoneTex, plasterTex, roofTex, shojiTex, darkWoodTex,
      lacquerTex, skyTex, moonTex, glowTex, softGlowTex, petalTex, ...signTexs,
    );

    /* ---------------- materials ---------------- */
    const trackMat = new THREE.MeshStandardMaterial({
      map: trackTex,
      bumpMap: bumpTex,
      bumpScale: 2.2,
      roughness: 0.62,
      metalness: 0.06,
    });
    const grassMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.95, metalness: 0 });
    const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, bumpMap: stoneTex, bumpScale: 1.1, vertexColors: true, roughness: 0.82 });
    const woodMat = new THREE.MeshStandardMaterial({ map: darkWoodTex, vertexColors: true, roughness: 0.68, metalness: 0.04 });
    const lacquerMat = new THREE.MeshStandardMaterial({
      map: lacquerTex,
      vertexColors: true,
      roughness: 0.3,
      metalness: 0.12,
      emissive: 0x3a0806,
      emissiveIntensity: 0.5,
    });
    const plasterMat = new THREE.MeshStandardMaterial({ map: plasterTex, vertexColors: true, roughness: 0.93 });
    const roofMat = new THREE.MeshStandardMaterial({
      map: roofTex,
      bumpMap: roofTex,
      bumpScale: 1.6,
      vertexColors: true,
      roughness: 0.36,
      metalness: 0.32,
      side: THREE.DoubleSide,
    });
    const shojiMat = new THREE.MeshStandardMaterial({
      map: shojiTex,
      emissive: 0xffffff,
      emissiveMap: shojiTex,
      emissiveIntensity: 1.35,
      vertexColors: true,
      roughness: 0.9,
    });
    const lampMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(2.3, 1.8, 1.4) });
    const blossomMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.82,
      emissive: 0x6a2650,
      emissiveIntensity: 0.55,
    });
    const foliageMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf2c14e,
      vertexColors: true,
      roughness: 0.28,
      metalness: 0.9,
      emissive: 0x5a3a05,
      emissiveIntensity: 0.4,
    });
    const clothMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide });
    const haloMat = new THREE.MeshBasicMaterial({
      map: softGlowTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const signMats = signTexs.map(
      (t) => new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(1.35, 1.35, 1.35), side: THREE.DoubleSide }),
    );

    const all: THREE.Material[] = [
      trackMat, grassMat, stoneMat, woodMat, lacquerMat, plasterMat, roofMat, shojiMat,
      lampMat, blossomMat, foliageMat, goldMat, clothMat, haloMat, ...signMats,
    ];
    for (const m of all) applyWorldCurveShader(m, curveUniforms);
    this.sharedDisposables.push(...all);

    Object.assign(this.mats, {
      stone: stoneMat,
      wood: woodMat,
      lacquer: lacquerMat,
      plaster: plasterMat,
      roof: roofMat,
      shoji: shojiMat,
      lamp: lampMat,
      blossom: blossomMat,
      foliage: foliageMat,
      gold: goldMat,
      cloth: clothMat,
      halo: haloMat,
    });

    /* ---------------- shared geometry ---------------- */
    const roadGeo = new THREE.PlaneGeometry(GAME_CONSTANTS.ROAD_WIDTH, L);
    const grassGeo = new THREE.PlaneGeometry(44, L);
    const guv = grassGeo.getAttribute('uv');
    for (let i = 0; i < guv.count; i++) guv.setXY(i, guv.getX(i) * (44 / 5), guv.getY(i) * (L / 5));
    const signGeo = new THREE.PlaneGeometry(1.9, 0.95);
    this.sharedDisposables.push(roadGeo, grassGeo, signGeo, this.geoCache);

    const kit: Kit = {
      g: this.geoCache,
      roof: (w, d, rise, hip = d * 0.4, uplift = 0.3) => {
        const key = `${w.toFixed(1)}_${d.toFixed(1)}_${rise.toFixed(1)}_${hip.toFixed(1)}_${uplift.toFixed(2)}`;
        let geo = this.roofCache.get(key);
        if (!geo) {
          geo = createRoofGeometry(w, d, rise, { hipRun: hip, uplift });
          this.roofCache.set(key, geo);
        }
        return geo;
      },
    };

    /* ---------------- street segments ---------------- */
    const stoneTones = [0x9a948a, 0x8a857c, 0xa59f93, 0x7e7a72];
    for (let i = 0; i < GAME_CONSTANTS.SEGMENT_COUNT; i++) {
      const seg = new THREE.Group();
      seg.position.z = -i * L;
      const rnd = mulberry32(5000 + i * 131);

      const road = new THREE.Mesh(roadGeo, trackMat);
      road.rotation.x = -Math.PI / 2;
      road.receiveShadow = true;
      seg.add(road);

      for (const side of [-1, 1] as const) {
        const grass = new THREE.Mesh(grassGeo, grassMat);
        grass.rotation.x = -Math.PI / 2;
        grass.position.set(side * (HALF + 0.3 + 22), 0.02, 0);
        grass.receiveShadow = true;
        seg.add(grass);
      }

      const near = new MeshBucket();
      const far = new MeshBucket();
      const signs: SignSpec[] = [];

      for (const side of [-1, 1] as const) {
        // curb stones
        const n = Math.round(L / 1.2);
        const bz = L / n;
        for (let j = 0; j < n; j++) {
          const h = 0.2 + rnd() * 0.07;
          near.add('stone', kit.g.box(), {
            p: [side * (HALF + 0.19), h / 2, -L / 2 + (j + 0.5) * bz],
            r: [0, (rnd() - 0.5) * 0.05, 0],
            s: [0.42, h, bz * 0.94],
            c: stoneTones[Math.floor(rnd() * stoneTones.length)],
          });
        }

        // stone lanterns, two per segment per side
        for (const lz of [-L / 4, L / 4]) addStoneLantern(near, kit, side * (HALF + 1.55), lz, 1.25);

        // flowerbeds + azalea bushes
        addFlowerBed(near, kit, side, HALF, L, rnd, 34);
        for (let bi = 0; bi < 3; bi++) {
          addBush(near, kit, side * (HALF + 0.9 + rnd() * 1.6), -L / 2 + (bi + 0.3 + rnd() * 0.4) * (L / 3), 1.0 + rnd() * 0.5, rnd);
        }

        // sakura rows (near + far)
        const treeZ = side === -1 ? [0, -L / 2] : [-L / 4, L / 4];
        for (const tz of treeZ) {
          addSakuraTree(near, kit, side * (HALF + 3.3 + rnd() * 0.5), tz, side, 1.0 + rnd() * 0.15, rnd, BLOSSOM_NEAR, rnd() < 0.5);
        }
        for (const tz of [-L * 0.3, L * 0.3]) {
          addSakuraTree(far, kit, side * (HALF + 6.9 + rnd() * 0.8), tz + (rnd() - 0.5) * 2, side, 1.25, rnd, BLOSSOM_FAR, false);
        }

        // front row of traditional townhouses
        for (const bzc of [-L * 0.25, L * 0.25]) {
          const w = 6.4 + rnd() * 1.4;
          const floors = rnd() < 0.35 ? 3 : 2;
          addBuilding(
            far,
            kit,
            {
              cx: side * (HALF + 10.2 + w / 2),
              cz: bzc,
              side,
              w,
              d: L * 0.44,
              floors,
              seed: 9000 + i * 17 + (side > 0 ? 3 : 0) + (bzc > 0 ? 1 : 0),
              plaster: [0xe9dfcc, 0xd9cfd8, 0xe6d3c0, 0xcfd6e2][Math.floor(rnd() * 4)],
              wood: [0xffffff, 0xd7c2b0][rnd() < 0.5 ? 0 : 1],
              far: false,
            },
            signs,
          );
        }

        // second row: tall dark landmark buildings, occasionally a pagoda
        if (i % 3 === 0 && ((i / 3) & 1) === (side > 0 ? 1 : 0)) {
          addPagoda(far, kit, side * (HALF + 27), 0, 5);
        } else {
          const w = 8 + rnd() * 3;
          addBuilding(
            far,
            kit,
            {
              cx: side * (HALF + 19 + w / 2),
              cz: (rnd() - 0.5) * L * 0.1,
              side,
              w,
              d: L * 0.82,
              floors: 3 + (rnd() < 0.4 ? 1 : 0),
              seed: 12000 + i * 19 + (side > 0 ? 5 : 0),
              plaster: 0x9aa0c4,
              wood: 0x8a8fb0,
              far: true,
            },
            signs,
          );
        }

        // dark cedar silhouettes behind everything
        for (let c = 0; c < 3; c++) {
          const cx = side * (HALF + 33 + rnd() * 8);
          const cz = -L / 2 + rnd() * L;
          const hh = 9 + rnd() * 7;
          far.add('foliage', kit.g.cone(1, 1, 7), { p: [cx, hh / 2, cz], s: [2.2 + rnd(), hh, 2.2 + rnd()], c: 0x22344a });
        }
      }

      if (i % 2 === 1) addTorii(near, kit, -L * 0.42, HALF);

      near.build(seg, this.mats, { cast: true, receive: true, store: this.sharedDisposables });
      far.build(seg, this.mats, { cast: false, receive: false, store: this.sharedDisposables });

      for (const sp of signs) {
        const sign = new THREE.Mesh(signGeo, signMats[sp.mat]);
        sign.position.set(sp.x, sp.y, sp.z);
        seg.add(sign);
      }

      scene.add(seg);
      this.segments.push(seg);
    }
    for (const geo of this.roofCache.values()) this.sharedDisposables.push(geo);

    this.buildHorizonBackdrop(scene, skyTex, moonTex, glowTex, softGlowTex);

    /* ---------------- lantern point lights ---------------- */
    for (let i = 0; i < 4; i++) {
      const light = new THREE.PointLight(0xffa15a, 0, 15, 2);
      scene.add(light);
      this.lanternLights.push(light);
    }

    /* ---------------- drifting petals ---------------- */
    const petalGeo = new THREE.PlaneGeometry(0.22, 0.22);
    const petalMat = new THREE.MeshBasicMaterial({
      map: petalTex,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.2,
      depthWrite: false,
    });
    applyWorldCurveShader(petalMat, curveUniforms);
    this.sharedDisposables.push(petalGeo, petalMat);

    this.petalInstancedMesh = new THREE.InstancedMesh(petalGeo, petalMat, this.maxPetals);
    this.petalInstancedMesh.frustumCulled = false;
    for (let i = 0; i < this.maxPetals; i++) {
      this.petalStates.push({
        x: (Math.random() - 0.5) * 20,
        y: 1 + Math.random() * 8,
        z: -Math.random() * 55,
        vx: -0.65 - Math.random() * 0.95,
        vy: -0.7 - Math.random() * 0.8,
        vz: 1.5 + Math.random() * 2.5,
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
        rz: Math.random() * Math.PI,
        spin: 1.5 + Math.random() * 2.5,
        size: 0.7 + Math.random() * 0.9,
      });
    }
    scene.add(this.petalInstancedMesh);

    /* ---------------- floating lantern-light motes (bokeh) ---------------- */
    const moteGeo = new THREE.PlaneGeometry(0.55, 0.55);
    const moteMat = new THREE.MeshBasicMaterial({
      map: softGlowTex,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    applyWorldCurveShader(moteMat, curveUniforms);
    this.sharedDisposables.push(moteGeo, moteMat);
    this.moteMesh = new THREE.InstancedMesh(moteGeo, moteMat, this.maxMotes);
    this.moteMesh.frustumCulled = false;
    for (let i = 0; i < this.maxMotes; i++) {
      this.moteStates.push({
        x: (Math.random() - 0.5) * 14,
        y: 0.6 + Math.random() * 5,
        z: -Math.random() * 60,
        phase: Math.random() * 6.28,
        speed: 0.3 + Math.random() * 0.6,
        size: 0.4 + Math.random() * 0.9,
      });
      this.dummyColor.setHex(Math.random() < 0.6 ? 0xffb066 : 0xff9ec8);
      this.moteMesh.setColorAt(i, this.dummyColor);
    }
    scene.add(this.moteMesh);
  }

  private buildHorizonBackdrop(
    scene: THREE.Scene,
    skyTex: THREE.CanvasTexture,
    moonTex: THREE.CanvasTexture,
    glowTex: THREE.CanvasTexture,
    softGlowTex: THREE.CanvasTexture,
  ): void {
    const skyGeo = new THREE.PlaneGeometry(380, 195);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, fog: false, depthWrite: false });
    this.sharedDisposables.push(skyGeo, skyMat);
    const skyCard = new THREE.Mesh(skyGeo, skyMat);
    skyCard.position.set(0, 62, -178);
    skyCard.renderOrder = -10;
    this.backdropGroup.add(skyCard);

    // Huge moon right above the vanishing point
    const haloGeo = new THREE.PlaneGeometry(190, 190);
    const haloMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const moonGeo = new THREE.CircleGeometry(24, 64);
    const moonMat = new THREE.MeshBasicMaterial({
      map: moonTex,
      color: new THREE.Color(1.5, 1.45, 1.35),
      transparent: true,
      fog: false,
      depthWrite: false,
    });
    this.sharedDisposables.push(haloGeo, haloMat, moonGeo, moonMat);
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.set(0, 44, -170);
    halo.renderOrder = -9;
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(0, 44, -168);
    moon.renderOrder = -8;
    this.backdropGroup.add(halo, moon);

    // Layered, hazy mountain ranges
    const layers: Array<{ z: number; h: number; color: number; seed: number; y: number }> = [
      { z: -150, h: 34, color: 0x5b5a9c, seed: 3, y: 0 },
      { z: -138, h: 26, color: 0x3d3f80, seed: 8, y: 0 },
      { z: -126, h: 18, color: 0x2a2b62, seed: 14, y: 0 },
    ];
    for (const layer of layers) {
      const rnd = mulberry32(layer.seed);
      const shape = new THREE.Shape();
      const span = 260;
      shape.moveTo(-span / 2, -4);
      let hh = layer.h * 0.5;
      for (let x = -span / 2; x <= span / 2; x += 6) {
        hh = THREE.MathUtils.clamp(hh + (rnd() - 0.5) * layer.h * 0.45, layer.h * 0.2, layer.h);
        shape.lineTo(x, hh);
      }
      shape.lineTo(span / 2, -4);
      shape.closePath();
      const geo = new THREE.ShapeGeometry(shape);
      const mat = new THREE.MeshBasicMaterial({ color: layer.color, fog: false });
      this.sharedDisposables.push(geo, mat);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, layer.y, layer.z);
      this.backdropGroup.add(mesh);
    }

    // Silhouetted far-off pagoda + lantern-lit rooftops
    const silMat = new THREE.MeshBasicMaterial({ color: 0x171a45, fog: false });
    const glowWinMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.7, 0.9), fog: false });
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    this.sharedDisposables.push(silMat, glowWinMat, boxGeo);
    const pagodaX = [-48, 52];
    for (const px of pagodaX) {
      for (let t = 0; t < 5; t++) {
        const w = 12 - t * 1.8;
        const body = new THREE.Mesh(boxGeo, silMat);
        body.scale.set(w * 0.6, 3.2, w * 0.6);
        body.position.set(px, 2 + t * 5.2, -120);
        const roof = new THREE.Mesh(boxGeo, silMat);
        roof.scale.set(w + 3, 0.9, w + 3);
        roof.position.set(px, 4.1 + t * 5.2, -120);
        const win = new THREE.Mesh(boxGeo, glowWinMat);
        win.scale.set(w * 0.2, 1.2, 0.2);
        win.position.set(px, 2 + t * 5.2, -120 + w * 0.3 + 0.1);
        this.backdropGroup.add(body, roof, win);
      }
      const spire = new THREE.Mesh(boxGeo, silMat);
      spire.scale.set(0.5, 9, 0.5);
      spire.position.set(px, 30, -120);
      this.backdropGroup.add(spire);
    }

    // soft light fog band hugging the horizon
    const bandGeo = new THREE.PlaneGeometry(380, 40);
    const bandMat = new THREE.MeshBasicMaterial({
      map: softGlowTex,
      color: new THREE.Color(0.55, 0.45, 0.95),
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.sharedDisposables.push(bandGeo, bandMat);
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.set(0, 6, -120);
    this.backdropGroup.add(band);

    scene.add(this.backdropGroup);
  }

  public applyQuality(preset: QualityPreset): void {
    this.activePetalCount = Math.min(this.maxPetals, preset.petalCount);
    this.petalInstancedMesh.count = this.activePetalCount;
    this.activeMoteCount = Math.min(this.maxMotes, Math.round(this.activePetalCount * 0.35));
    this.moteMesh.count = this.activeMoteCount;
    this.activeLights = preset.shadows ? 4 : 2;
    for (let i = 0; i < this.lanternLights.length; i++) {
      this.lanternLights[i].visible = i < this.activeLights;
    }
  }

  public reset(): void {
    for (let i = 0; i < this.segments.length; i++) {
      this.segments[i].position.z = -i * GAME_CONSTANTS.SEGMENT_LENGTH;
    }
    this.backdropGroup.position.z = 0;
  }

  public update(dt: number, runnerZ: number, worldSpeed: number): void {
    this.time += dt;
    const L = GAME_CONSTANTS.SEGMENT_LENGTH;
    const HALF = GAME_CONSTANTS.ROAD_WIDTH * 0.5;
    this.backdropGroup.position.z = runnerZ;

    const recycleThreshold = runnerZ + L * 1.25;
    const totalLength = GAME_CONSTANTS.SEGMENT_COUNT * L;
    for (const seg of this.segments) {
      if (seg.position.z > recycleThreshold) seg.position.z -= totalLength;
    }

    // Warm lantern lights snapped to the fixed lantern grid (z = L/4 - m * L/2)
    const spacing = L / 2;
    const m0 = Math.ceil((L / 4 - (runnerZ - 1)) / spacing);
    const farMax = this.activeLights * spacing;
    for (let j = 0; j < this.lanternLights.length; j++) {
      const light = this.lanternLights[j];
      if (j >= this.activeLights) {
        light.intensity = 0;
        continue;
      }
      const m = m0 + j;
      const z = L / 4 - m * spacing;
      const side = (((m % 2) + 2) % 2) === 0 ? -1 : 1;
      const dist = runnerZ - z;
      const fadeNear = THREE.MathUtils.clamp((dist - 1) / 2.5, 0, 1);
      const fadeFar = THREE.MathUtils.clamp((farMax - dist) / spacing, 0, 1);
      light.position.set(side * (HALF + 1.2), 1.9, z);
      const flicker = 1 + Math.sin(this.time * 9 + m * 1.7) * 0.05;
      light.intensity = (PHYSICAL_LIGHTS ? 42 : 2.4) * fadeNear * fadeFar * flicker;
    }

    for (let i = 0; i < this.activePetalCount; i++) {
      const p = this.petalStates[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += (p.vz + worldSpeed * 0.35) * dt;
      p.rx += p.spin * dt;
      p.ry += p.spin * 0.7 * dt;
      if (p.y < 0.2 || p.z > runnerZ + 6) {
        p.x = (Math.random() - 0.5) * 20;
        p.y = 4.5 + Math.random() * 6.5;
        p.z = runnerZ - 18 - Math.random() * 44;
      }
      this.dummyPos.set(p.x, p.y, p.z);
      this.dummyEuler.set(p.rx, p.ry, p.rz);
      this.dummyQuat.setFromEuler(this.dummyEuler);
      this.dummyScale.setScalar(p.size);
      this.dummyMatrix.compose(this.dummyPos, this.dummyQuat, this.dummyScale);
      this.petalInstancedMesh.setMatrixAt(i, this.dummyMatrix);
    }
    this.petalInstancedMesh.instanceMatrix.needsUpdate = true;

    this.dummyQuat.identity();
    for (let i = 0; i < this.activeMoteCount; i++) {
      const s = this.moteStates[i];
      s.y += s.speed * 0.25 * dt;
      s.phase += dt * 1.3;
      if (s.z > runnerZ + 6 || s.y > 7) {
        s.x = (Math.random() - 0.5) * 14;
        s.y = 0.5 + Math.random() * 2.5;
        s.z = runnerZ - 10 - Math.random() * 55;
      }
      const pulse = 0.7 + Math.sin(s.phase * 2.1) * 0.3;
      this.dummyPos.set(s.x + Math.sin(s.phase) * 0.4, s.y, s.z);
      this.dummyScale.setScalar(s.size * pulse);
      this.dummyMatrix.compose(this.dummyPos, this.dummyQuat, this.dummyScale);
      this.moteMesh.setMatrixAt(i, this.dummyMatrix);
    }
    this.moteMesh.instanceMatrix.needsUpdate = true;
    if (this.moteMesh.instanceColor) this.moteMesh.instanceColor.needsUpdate = true;
  }

  public dispose(): void {
    for (const item of this.sharedDisposables) item.dispose();
    for (const light of this.lanternLights) light.dispose();
  }
}
