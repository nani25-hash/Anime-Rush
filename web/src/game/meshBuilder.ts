import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type Vec3Tuple = [number, number, number];

export interface PartOptions {
  /** position */
  p?: Vec3Tuple;
  /** euler rotation (rad) */
  r?: Vec3Tuple;
  /** scale */
  s?: Vec3Tuple;
  /** vertex colour (sRGB hex). Defaults to white so the material colour wins. */
  c?: number | THREE.Color;
  /** vertical gradient [bottom, top] (sRGB hex) – overrides `c` */
  grad?: [number, number];
  /** also emit a smooth inverted-hull outline for this part */
  outline?: boolean;
}

/** Cache of unit geometries – the bucket clones them, so sharing is safe. */
export class GeoCache {
  private readonly cache = new Map<string, THREE.BufferGeometry>();

  private get(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
    let g = this.cache.get(key);
    if (!g) {
      g = make();
      this.cache.set(key, g);
    }
    return g;
  }

  box(): THREE.BufferGeometry {
    return this.get('box', () => new THREE.BoxGeometry(1, 1, 1));
  }
  plane(): THREE.BufferGeometry {
    return this.get('plane', () => new THREE.PlaneGeometry(1, 1));
  }
  cyl(rt: number, rb: number, h = 1, seg = 8): THREE.BufferGeometry {
    const k = `cyl${rt.toFixed(3)}_${rb.toFixed(3)}_${h.toFixed(3)}_${seg}`;
    return this.get(k, () => new THREE.CylinderGeometry(rt, rb, h, seg));
  }
  cone(r: number, h: number, seg = 6): THREE.BufferGeometry {
    const k = `cone${r.toFixed(3)}_${h.toFixed(3)}_${seg}`;
    return this.get(k, () => new THREE.ConeGeometry(r, h, seg));
  }
  sphere(ws = 12, hs = 8): THREE.BufferGeometry {
    return this.get(`sph${ws}_${hs}`, () => new THREE.SphereGeometry(1, ws, hs));
  }
  ico(detail = 1): THREE.BufferGeometry {
    return this.get(`ico${detail}`, () => new THREE.IcosahedronGeometry(1, detail));
  }
  capsule(r: number, len: number, cs = 6, rs = 10): THREE.BufferGeometry {
    const k = `cap${r.toFixed(3)}_${len.toFixed(3)}_${cs}_${rs}`;
    return this.get(k, () => new THREE.CapsuleGeometry(r, len, cs, rs));
  }
  torus(R: number, r: number, rs = 8, ts = 16, arc = Math.PI * 2): THREE.BufferGeometry {
    const k = `tor${R.toFixed(3)}_${r.toFixed(3)}_${rs}_${ts}_${arc.toFixed(2)}`;
    return this.get(k, () => new THREE.TorusGeometry(R, r, rs, ts, arc));
  }

  dispose(): void {
    for (const g of this.cache.values()) g.dispose();
    this.cache.clear();
  }
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _pos = new THREE.Vector3();
const _scl = new THREE.Vector3();
const _c0 = new THREE.Color();
const _c1 = new THREE.Color();
const _ct = new THREE.Color();

/**
 * Collects many small transformed parts, then merges them into ONE mesh per
 * material key. This is what keeps the detailed Japanese scenery affordable
 * (a whole street segment ≈ 15 draw calls instead of several hundred).
 */
export class MeshBucket {
  private readonly parts = new Map<string, THREE.BufferGeometry[]>();
  private readonly hulls: THREE.BufferGeometry[] = [];

  add(key: string, geo: THREE.BufferGeometry, o: PartOptions = {}): void {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    }
    const posAttr = g.getAttribute('position');
    const count = posAttr.count;
    const colors = new Float32Array(count * 3);

    if (o.grad) {
      g.computeBoundingBox();
      const bb = g.boundingBox as THREE.Box3;
      const h = Math.max(1e-5, bb.max.y - bb.min.y);
      _c0.setHex(o.grad[0]);
      _c1.setHex(o.grad[1]);
      for (let i = 0; i < count; i++) {
        const t = (posAttr.getY(i) - bb.min.y) / h;
        _ct.lerpColors(_c0, _c1, t);
        colors[i * 3] = _ct.r;
        colors[i * 3 + 1] = _ct.g;
        colors[i * 3 + 2] = _ct.b;
      }
    } else {
      if (o.c instanceof THREE.Color) _ct.copy(o.c);
      else _ct.setHex(o.c ?? 0xffffff);
      for (let i = 0; i < count; i++) {
        colors[i * 3] = _ct.r;
        colors[i * 3 + 1] = _ct.g;
        colors[i * 3 + 2] = _ct.b;
      }
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const p = o.p ?? [0, 0, 0];
    const r = o.r ?? [0, 0, 0];
    const s = o.s ?? [1, 1, 1];
    _e.set(r[0], r[1], r[2]);
    _q.setFromEuler(_e);
    _pos.set(p[0], p[1], p[2]);
    _scl.set(s[0], s[1], s[2]);
    _m.compose(_pos, _q, _scl);

    if (o.outline) {
      const hp = new THREE.BufferGeometry();
      hp.setAttribute('position', posAttr.clone());
      const merged = mergeVertices(hp, 1e-3);
      merged.computeVertexNormals();
      const hull = merged.toNonIndexed();
      hull.applyMatrix4(_m);
      this.hulls.push(hull);
      hp.dispose();
      merged.dispose();
    }

    g.applyMatrix4(_m);
    let list = this.parts.get(key);
    if (!list) {
      list = [];
      this.parts.set(key, list);
    }
    list.push(g);
  }

  /** Merge everything and attach the resulting meshes to `parent`. */
  build(
    parent: THREE.Object3D,
    mats: Record<string, THREE.Material>,
    opts: {
      cast?: boolean;
      receive?: boolean;
      outline?: THREE.Material;
      store?: Array<{ dispose: () => void }>;
    } = {},
  ): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    for (const [key, list] of this.parts) {
      const mat = mats[key];
      if (!mat || list.length === 0) {
        list.forEach((l) => l.dispose());
        continue;
      }
      const merged = mergeGeometries(list, false);
      list.forEach((l) => l.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = Boolean(opts.cast);
      mesh.receiveShadow = Boolean(opts.receive);
      parent.add(mesh);
      out.push(mesh);
      opts.store?.push(merged);
    }
    if (opts.outline && this.hulls.length > 0) {
      const merged = mergeGeometries(this.hulls, false);
      if (merged) {
        const mesh = new THREE.Mesh(merged, opts.outline);
        parent.add(mesh);
        out.push(mesh);
        opts.store?.push(merged);
      }
    }
    this.hulls.forEach((h) => h.dispose());
    this.hulls.length = 0;
    this.parts.clear();
    return out;
  }
}

/* ------------------------------------------------------------------ */
/* Toon / anime shading                                                 */
/* ------------------------------------------------------------------ */

export function createToonGradient(steps: number[] = [96, 158, 220, 255]): THREE.DataTexture {
  const data = new Uint8Array(steps);
  const tex = new THREE.DataTexture(data, steps.length, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export interface ToonOptions {
  color?: number;
  emissive?: number;
  emissiveIntensity?: number;
  vertexColors?: boolean;
  side?: THREE.Side;
  rimColor?: number;
  rimStrength?: number;
}

/** Cel-shaded material with a moonlit rim light – the "anime" look. */
export function createToonMaterial(
  gradient: THREE.DataTexture,
  o: ToonOptions = {},
): THREE.MeshToonMaterial {
  const mat = new THREE.MeshToonMaterial({
    color: o.color ?? 0xffffff,
    gradientMap: gradient,
    vertexColors: o.vertexColors ?? true,
    side: o.side ?? THREE.FrontSide,
  });
  if (o.emissive !== undefined) {
    mat.emissive.setHex(o.emissive);
    mat.emissiveIntensity = o.emissiveIntensity ?? 0.2;
  }
  const rim = new THREE.Color(o.rimColor ?? 0x9fb2ff);
  const rimStrength = o.rimStrength ?? 0.42;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = { value: rim };
    shader.uniforms.uRimStrength = { value: rimStrength };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform vec3 uRimColor;\nuniform float uRimStrength;',
      )
      .replace(
        shader.fragmentShader.includes('#include <opaque_fragment>')
          ? '#include <opaque_fragment>'
          : '#include <output_fragment>',
        `float rimF = pow(1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition))), 2.4);
         rimF = smoothstep(0.35, 0.95, rimF);
         outgoingLight += uRimColor * rimF * uRimStrength;
         ${
           shader.fragmentShader.includes('#include <opaque_fragment>')
             ? '#include <opaque_fragment>'
             : '#include <output_fragment>'
         }`,
      );
  };
  mat.customProgramCacheKey = () => 'anime-toon-rim';
  return mat;
}

/** Inverted-hull ink outline. Pair with MeshBucket({ outline: true }) parts. */
export function createOutlineMaterial(thickness = 0.013, color = 0x1a1226): THREE.MeshBasicMaterial {
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uThick = { value: thickness };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uThick;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\ntransformed += normalize(normal) * uThick;',
      );
  };
  mat.customProgramCacheKey = () => 'anime-outline';
  return mat;
}

/* ------------------------------------------------------------------ */
/* Traditional Japanese roof (kawara) geometry                          */
/* ------------------------------------------------------------------ */

/**
 * Hipped-gable roof with a ridge along Z, concave slopes and up-swept
 * corners. Use with a DoubleSide material.
 *  w: extent across the ridge (X)   d: extent along the ridge (Z)
 *  hipRun: horizontal length of the hipped ends (>= d/2 gives a pyramid)
 */
export function createRoofGeometry(
  w: number,
  d: number,
  rise: number,
  opts: { hipRun?: number; uplift?: number; thick?: number; uvScale?: number } = {},
): THREE.BufferGeometry {
  const hx = w / 2;
  const hz = d / 2;
  const hipRun = Math.min(opts.hipRun ?? hz * 0.45, hz * 0.999);
  const uplift = opts.uplift ?? 0.28;
  const thick = opts.thick ?? 0.14;
  const uvs = opts.uvScale ?? 2.0;
  const nx = 8;
  const nz = 12;

  const height = (x: number, z: number): number => {
    const u = 1 - Math.abs(x) / hx;
    const v = hipRun > 0 ? Math.min(1, (hz - Math.abs(z)) / hipRun) : 1;
    const t = Math.max(0, Math.min(u, v));
    const slope = rise * Math.pow(t, 0.78);
    const curl = uplift * Math.pow(Math.abs(x) / hx, 3) * Math.pow(Math.abs(z) / hz, 3);
    return slope + curl;
  };

  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];

  const addSheet = (x0: number, x1: number): void => {
    const base = pos.length / 3;
    for (let iz = 0; iz <= nz; iz++) {
      for (let ix = 0; ix <= nx; ix++) {
        const x = x0 + ((x1 - x0) * ix) / nx;
        const z = -hz + (d * iz) / nz;
        pos.push(x, height(x, z), z);
        uv.push((x / w + 0.5) * uvs * (w / 2.4), (z / d + 0.5) * uvs * (d / 2.4));
      }
    }
    const row = nx + 1;
    for (let iz = 0; iz < nz; iz++) {
      for (let ix = 0; ix < nx; ix++) {
        const a = base + iz * row + ix;
        const b = a + 1;
        const c = a + row;
        const e = c + 1;
        idx.push(a, c, b, b, c, e);
      }
    }
  };
  addSheet(-hx, 0);
  addSheet(0, hx);

  const addSkirt = (points: Array<[number, number]>): void => {
    const base = pos.length / 3;
    for (const [x, z] of points) {
      const y = height(x, z);
      pos.push(x, y, z, x, y - thick, z);
      uv.push(0.1, 0.1, 0.1, 0.2);
    }
    for (let i = 0; i < points.length - 1; i++) {
      const a = base + i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  };
  const edgeX: Array<[number, number]> = [];
  for (let i = 0; i <= nx * 2; i++) edgeX.push([-hx + (w * i) / (nx * 2), -hz]);
  const edgeX2: Array<[number, number]> = edgeX.map(([x]) => [x, hz]);
  const edgeZ: Array<[number, number]> = [];
  for (let i = 0; i <= nz; i++) edgeZ.push([-hx, -hz + (d * i) / nz]);
  const edgeZ2: Array<[number, number]> = edgeZ.map(([, z]) => [hx, z]);
  addSkirt(edgeX);
  addSkirt(edgeX2);
  addSkirt(edgeZ);
  addSkirt(edgeZ2);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** Tiny deterministic PRNG shared by the builders. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
