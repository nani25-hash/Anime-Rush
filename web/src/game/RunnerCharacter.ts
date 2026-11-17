import * as THREE from 'three';
import { getHeroById } from '../config/catalog';
import {
  GeoCache,
  MeshBucket,
  Vec3Tuple,
  createOutlineMaterial,
  createToonGradient,
  createToonMaterial,
} from './meshBuilder';

export type RunnerAnimState = 'TITLE' | 'RUNNING' | 'JUMPING' | 'SLIDING' | 'CRASHED';

/* ------------------------------------------------------------------ */
/* Cloth ribbon: a chain of nested pivots that whips with the wind      */
/* ------------------------------------------------------------------ */

interface ChainCfg {
  segs: number;
  len: number;
  w0: number;
  w1: number;
  thick: number;
  /** droop angle (rad) of [first segment, each following segment] at rest */
  rest: [number, number];
  /** same, while running at full speed */
  wind: [number, number];
  amp: number;
  freq: number;
  phase: number;
  sway: number;
}

class FlowChain {
  readonly root = new THREE.Group();
  private readonly pivots: THREE.Group[] = [];
  private readonly cfg: ChainCfg;

  constructor(cfg: ChainCfg, mat: THREE.Material, store: Array<{ dispose: () => void }>) {
    this.cfg = cfg;
    let parent: THREE.Object3D = this.root;
    for (let i = 0; i < cfg.segs; i++) {
      const t = cfg.segs > 1 ? i / (cfg.segs - 1) : 0;
      const w = THREE.MathUtils.lerp(cfg.w0, cfg.w1, t);
      const geo = new THREE.BoxGeometry(w, cfg.thick, cfg.len * 1.04);
      geo.translate(0, 0, cfg.len / 2);
      const count = geo.getAttribute('position').count;
      geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(count * 3).fill(1), 3));
      store.push(geo);
      const pivot = new THREE.Group();
      if (i > 0) pivot.position.z = cfg.len;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      pivot.add(mesh);
      parent.add(pivot);
      this.pivots.push(pivot);
      parent = pivot;
    }
  }

  update(time: number, windN: number, lateral: number, vy: number): void {
    const c = this.cfg;
    const lat = THREE.MathUtils.clamp(-lateral * 0.03, -0.5, 0.5);
    const lift = THREE.MathUtils.clamp(vy, -12, 12) * 0.02;
    for (let i = 0; i < this.pivots.length; i++) {
      const restA = i === 0 ? c.rest[0] : c.rest[1];
      const windA = i === 0 ? c.wind[0] : c.wind[1];
      const base = THREE.MathUtils.lerp(restA, windA, windN);
      const wave =
        Math.sin(time * c.freq - i * 0.85 + c.phase) * c.amp * (0.25 + 0.75 * windN) * (0.55 + i * 0.28);
      const p = this.pivots[i];
      p.rotation.x = base + wave + lift * (0.5 + i * 0.2);
      p.rotation.y =
        Math.sin(time * c.freq * 0.8 - i * 0.9 + c.phase * 1.3) * c.sway * (0.3 + windN) * (0.4 + i * 0.25) +
        lat * (0.4 + i * 0.2);
    }
  }
}

interface HairLock {
  pivot: THREE.Group;
  geo: THREE.BufferGeometry;
  len: number;
  baseQ: THREE.Quaternion;
  windAxis: THREE.Vector3;
  windAmt: number;
  amp: number;
  freq: number;
  phase: number;
}

const _tmpQ = new THREE.Quaternion();
const _tmpE = new THREE.Euler();
const _windQ = new THREE.Quaternion();
const _Z = new THREE.Vector3(0, 0, 1);

export class RunnerCharacter {
  public readonly root = new THREE.Group();
  public readonly shadowMesh: THREE.Mesh;

  private readonly bodyPivot = new THREE.Group();
  private readonly torsoGroup = new THREE.Group();
  private readonly headGroup = new THREE.Group();
  private readonly leftArmPivot = new THREE.Group();
  private readonly rightArmPivot = new THREE.Group();
  private readonly leftLegPivot = new THREE.Group();
  private readonly rightLegPivot = new THREE.Group();
  private readonly shieldBubble: THREE.Mesh;
  private readonly shieldGlow: THREE.Mesh;

  private readonly chains: FlowChain[] = [];
  private readonly locks: HairLock[] = [];

  private readonly jacketMat: THREE.MeshToonMaterial;
  private readonly accentMat: THREE.MeshToonMaterial;
  private readonly trimMat: THREE.MeshToonMaterial;
  private readonly hairMat: THREE.MeshToonMaterial;
  private readonly hairRootMat: THREE.MeshToonMaterial;
  private readonly hairFlowMat: THREE.MeshToonMaterial;
  private readonly shieldMat: THREE.MeshBasicMaterial;
  private readonly disposables: Array<{ dispose: () => void }> = [];

  private heroHair = 0x1a1a24;
  private heroHairTip = 0x3a3a52;

  private runPhase = 0;
  private landSquash = 0;
  private time = 0;
  private prevHeight = 0;

  constructor(shadowTexture: THREE.Texture, initialHeroId = 'ryu') {
    const hero = getHeroById(initialHeroId);
    const g = new GeoCache();
    const gradient = createToonGradient();
    const outlineMat = createOutlineMaterial(0.012, 0x1a1226);
    this.disposables.push(g, gradient, outlineMat);

    const toon = (o: Parameters<typeof createToonMaterial>[1] = {}): THREE.MeshToonMaterial => {
      const m = createToonMaterial(gradient, o);
      this.disposables.push(m);
      return m;
    };

    this.jacketMat = toon({ color: hero.primaryHex });
    this.accentMat = toon({ color: hero.accentHex, emissive: hero.accentHex, emissiveIntensity: 0.22 });
    this.trimMat = toon({ color: hero.trimHex });
    this.hairMat = toon({ color: 0xffffff, rimColor: 0xb8c4ff, rimStrength: 0.55 });
    this.hairRootMat = toon({ color: hero.hairHex, rimColor: 0xb8c4ff, rimStrength: 0.5 });
    this.hairFlowMat = toon({ color: hero.hairHex, rimColor: 0xb8c4ff, rimStrength: 0.5 });
    const trouserMat = toon({ color: 0x1a1c28 });
    const skinMat = toon({ color: 0xf6cfb4, rimColor: 0xffc9a8, rimStrength: 0.3 });
    const leatherMat = toon({ color: 0x6a4426 });
    const bandageMat = toon({ color: 0xc8ccd8 });
    const bootMat = toon({ color: 0x20222c });
    const eyeWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyeDark = toon({ color: 0x1a1020, vertexColors: false });
    const iris = toon({ color: 0x3b7dff, emissive: 0x2a5bd0, emissiveIntensity: 0.7, vertexColors: false });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xe6ecf5, roughness: 0.28, metalness: 0.85, vertexColors: true });
    this.disposables.push(eyeWhite, metalMat);

    const mats: Record<string, THREE.Material> = {
      jacket: this.jacketMat,
      accent: this.accentMat,
      trim: this.trimMat,
      hair: this.hairMat,
      hairRoot: this.hairRootMat,
      trouser: trouserMat,
      skin: skinMat,
      leather: leatherMat,
      bandage: bandageMat,
      boot: bootMat,
      eyeWhite,
      eyeDark,
      iris,
      metal: metalMat,
    };
    const buildOpts = { cast: true, outline: outlineMat, store: this.disposables };

    this.root.add(this.bodyPivot);
    this.torsoGroup.position.set(0, 1.0, 0);
    this.bodyPivot.add(this.torsoGroup);

    /* ---------------- torso ---------------- */
    const tb = new MeshBucket();
    tb.add('jacket', g.capsule(0.255, 0.35, 8, 16), { p: [0, 0.14, 0], s: [1.12, 1, 0.8], outline: true });
    tb.add('jacket', g.capsule(0.2, 0.1, 6, 12), { p: [0, -0.1, 0], s: [1.05, 1, 0.86], outline: true });
    tb.add('jacket', g.cyl(0.285, 0.315, 1, 18), { p: [0, -0.19, 0], s: [1.06, 0.18, 0.85], outline: true });
    tb.add('trim', g.cyl(0.32, 0.32, 1, 18), { p: [0, -0.285, 0], s: [1.07, 0.028, 0.86] });
    tb.add('jacket', g.cyl(0.17, 0.215, 1, 14), { p: [0, 0.43, 0], s: [1, 0.17, 0.95], outline: true });
    tb.add('trim', g.box(), { p: [0, 0.14, -0.208], s: [0.045, 0.42, 0.035] });
    for (const sx of [-1, 1]) {
      tb.add('accent', g.box(), { p: [sx * 0.15, 0.17, -0.2], s: [0.13, 0.38, 0.05] });
      tb.add('trim', g.box(), { p: [sx * 0.2, 0.36, -0.15], r: [0.2, 0, sx * -0.5], s: [0.14, 0.05, 0.1] });
    }
    // belt, buckle and leather pouch on the back
    tb.add('leather', g.cyl(0.27, 0.27, 1, 18), { p: [0, -0.07, 0], s: [1.1, 0.075, 0.88] });
    tb.add('metal', g.box(), { p: [0, -0.07, -0.248], s: [0.09, 0.075, 0.03] });
    tb.add('leather', g.box(), { p: [0.09, -0.1, 0.258], s: [0.2, 0.14, 0.08], outline: true, c: 0xffffff });
    tb.add('leather', g.box(), { p: [0.09, -0.04, 0.262], s: [0.21, 0.065, 0.09], c: 0xb88a5a });
    tb.add('metal', g.sphere(8, 6), { p: [0.09, -0.07, 0.31], s: [0.016, 0.016, 0.012] });
    tb.add('leather', g.box(), { p: [-0.16, -0.08, 0.255], s: [0.07, 0.1, 0.05], c: 0x9a6a3c });
    // neck scarf ring + knot
    tb.add('accent', g.torus(0.19, 0.07, 8, 20), { p: [0, 0.46, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.9, 1], outline: true });
    tb.add('accent', g.sphere(10, 8), { p: [0.12, 0.43, -0.16], s: [0.08, 0.07, 0.07], outline: true });
    tb.build(this.torsoGroup, mats, buildOpts);

    /* ---------------- head ---------------- */
    this.headGroup.position.set(0, 0.54, -0.01);
    this.torsoGroup.add(this.headGroup);

    const hb = new MeshBucket();
    hb.add('skin', g.sphere(22, 18), { p: [0, 0.22, 0], s: [0.26, 0.245, 0.255], outline: true });
    hb.add('skin', g.cyl(0.09, 0.1, 1, 10), { p: [0, -0.02, 0], s: [1, 0.14, 1] });
    for (const sx of [-1, 1]) {
      hb.add('skin', g.sphere(10, 8), { p: [sx * 0.255, 0.2, 0.02], s: [0.03, 0.06, 0.04] });
      // large anime eyes
      hb.add('eyeWhite', g.sphere(12, 10), { p: [sx * 0.088, 0.2, -0.238], r: [0, sx * 0.4, 0], s: [0.054, 0.072, 0.018] });
      hb.add('iris', g.sphere(12, 10), { p: [sx * 0.088, 0.196, -0.249], r: [0, sx * 0.4, 0], s: [0.041, 0.06, 0.015] });
      hb.add('eyeDark', g.sphere(10, 8), { p: [sx * 0.088, 0.194, -0.256], r: [0, sx * 0.4, 0], s: [0.022, 0.04, 0.012] });
      hb.add('eyeWhite', g.sphere(8, 6), { p: [sx * 0.074, 0.218, -0.262], s: [0.014, 0.014, 0.01] });
      hb.add('eyeDark', g.box(), { p: [sx * 0.09, 0.268, -0.236], r: [0, sx * 0.3, sx * 0.22], s: [0.075, 0.014, 0.014] });
    }
    hb.add('eyeDark', g.box(), { p: [0, 0.105, -0.25], s: [0.045, 0.009, 0.01] });
    hb.add('hairRoot', g.sphere(24, 18), { p: [0, 0.262, 0.035], s: [0.272, 0.252, 0.276], outline: true });
    // headband (hachimaki), plate and knot
    hb.add('accent', g.cyl(0.27, 0.27, 1, 26), { p: [0, 0.305, 0.015], s: [0.99, 0.08, 0.99], outline: true });
    hb.add('metal', g.box(), { p: [0, 0.305, -0.262], s: [0.17, 0.065, 0.03] });
    hb.add('trim', g.box(), { p: [0, 0.305, -0.272], s: [0.1, 0.025, 0.01] });
    hb.add('accent', g.sphere(10, 8), { p: [0, 0.3, 0.272], s: [0.062, 0.056, 0.05], outline: true });
    hb.build(this.headGroup, mats, buildOpts);

    // Individual hair locks (spiky crown, bangs, sideburns, long back locks)
    const L = (th: number, ph: number, aim: Vec3Tuple, len: number, rad: number, bend: number, windAmt: number): void =>
      this.addLock(th, ph, aim, len, rad, bend, windAmt);
    const D = Math.PI / 180;
    // crown spikes
    L(0, 14 * D, [0, 1, -0.25], 0.32, 0.075, -0.1, 0.35);
    for (const s of [-1, 1]) {
      L(s * 38 * D, 30 * D, [s * 0.5, 1, -0.1], 0.33, 0.08, 0.05, 0.38);
      L(s * 78 * D, 50 * D, [s * 1, 0.75, 0], 0.3, 0.075, 0.08, 0.4);
      L(s * 135 * D, 38 * D, [s * 0.65, 0.8, 0.7], 0.34, 0.08, 0.15, 0.55);
    }
    L(180 * D, 26 * D, [0, 0.7, 1], 0.38, 0.085, 0.2, 0.6);
    // bangs over the forehead
    for (let i = -2; i <= 2; i++) {
      const aimX = i * 0.35;
      L(i * 24 * D, 58 * D, [aimX, -0.9, -0.45], 0.2 - Math.abs(i) * 0.02, 0.058, -0.2, 0.45);
    }
    // side locks near the ears
    for (const s of [-1, 1]) L(s * 98 * D, 82 * D, [s * 0.15, -1, 0.15], 0.26, 0.05, 0.12, 0.6);
    // long back locks that stream behind the head
    for (let i = -2; i <= 2; i++) {
      L(180 * D + i * 20 * D, 76 * D, [i * 0.2, -0.6, 1], 0.4 - Math.abs(i) * 0.04, 0.062, 0.25, 0.95);
    }
    this.recolorHair(hero.hairHex, hero.hairTipHex);

    // headband tails + two long hair streamers as flowing chains
    for (const s of [-1, 1]) {
      const tail = new FlowChain(
        { segs: 6, len: 0.1, w0: 0.06, w1: 0.04, thick: 0.02, rest: [0.6, 0.18], wind: [0.0, 0.03], amp: 0.12, freq: 9, phase: s, sway: 0.2 },
        this.accentMat,
        this.disposables,
      );
      tail.root.position.set(s * 0.03, 0.29, 0.275);
      tail.root.rotation.y = s * 0.18;
      this.headGroup.add(tail.root);
      this.chains.push(tail);

      const streamer = new FlowChain(
        { segs: 5, len: 0.09, w0: 0.055, w1: 0.022, thick: 0.03, rest: [0.9, 0.2], wind: [0.12, 0.04], amp: 0.1, freq: 8, phase: s * 2, sway: 0.18 },
        this.hairFlowMat,
        this.disposables,
      );
      streamer.root.position.set(s * 0.1, 0.12, 0.2);
      streamer.root.rotation.y = s * 0.3;
      this.headGroup.add(streamer.root);
      this.chains.push(streamer);
    }

    /* ---------------- arms ---------------- */
    const buildArm = (pivot: THREE.Group, xOffset: number): void => {
      pivot.position.set(xOffset, 0.33, 0);
      const ab = new MeshBucket();
      ab.add('jacket', g.capsule(0.095, 0.18, 6, 12), { p: [0, -0.14, 0], outline: true });
      ab.add('jacket', g.cyl(0.1, 0.125, 1, 12), { p: [0, -0.255, 0], s: [1, 0.12, 1], outline: true });
      ab.add('trim', g.cyl(0.11, 0.11, 1, 12), { p: [0, -0.2, 0], s: [1, 0.03, 1] });
      ab.add('skin', g.capsule(0.066, 0.16, 6, 10), { p: [0, -0.37, -0.03], r: [-0.22, 0, 0], outline: true });
      for (let i = 0; i < 3; i++) {
        ab.add('bandage', g.cyl(0.074, 0.074, 1, 10), { p: [0, -0.33 - i * 0.045, -0.026 - i * 0.012], r: [-0.22, 0, 0], s: [1, 0.034, 1] });
      }
      ab.add('skin', g.sphere(10, 8), { p: [0, -0.5, -0.07], s: [0.078, 0.072, 0.082], outline: true });
      ab.add('skin', g.sphere(8, 6), { p: [0.05, -0.49, -0.1], s: [0.028, 0.03, 0.04] });
      ab.build(pivot, mats, buildOpts);
      this.torsoGroup.add(pivot);
    };
    buildArm(this.leftArmPivot, -0.35);
    buildArm(this.rightArmPivot, 0.35);

    /* ---------------- legs ---------------- */
    const buildLeg = (pivot: THREE.Group, xOffset: number): void => {
      pivot.position.set(xOffset, -0.24, 0);
      const lb = new MeshBucket();
      lb.add('trouser', g.capsule(0.118, 0.22, 6, 12), { p: [0, -0.19, 0], outline: true });
      lb.add('trouser', g.cyl(0.092, 0.078, 1, 10), { p: [0, -0.49, 0], s: [1, 0.32, 1], outline: true });
      for (let i = 0; i < 4; i++) {
        lb.add('bandage', g.cyl(0.084, 0.084, 1, 10), { p: [0, -0.5 - i * 0.05, 0], s: [1, 0.034, 1] });
      }
      lb.add('boot', g.box(), { p: [0, -0.68, -0.045], s: [0.17, 0.13, 0.29], outline: true });
      lb.add('boot', g.sphere(10, 8), { p: [0, -0.7, -0.19], s: [0.085, 0.07, 0.1] });
      lb.add('leather', g.box(), { p: [0, -0.752, -0.05], s: [0.19, 0.045, 0.32] });
      lb.add('accent', g.box(), { p: [0, -0.62, -0.045], s: [0.18, 0.035, 0.22] });
      lb.build(pivot, mats, buildOpts);
      this.torsoGroup.add(pivot);
    };
    buildLeg(this.leftLegPivot, -0.155);
    buildLeg(this.rightLegPivot, 0.155);

    /* ---------------- flowing cloth ---------------- */
    // long scarf tails behind the neck
    const scarfA = new FlowChain(
      { segs: 9, len: 0.17, w0: 0.17, w1: 0.1, thick: 0.034, rest: [1.1, 0.14], wind: [0.0, 0.02], amp: 0.1, freq: 7.5, phase: 0, sway: 0.28 },
      this.accentMat,
      this.disposables,
    );
    scarfA.root.position.set(0.03, 0.45, 0.12);
    const scarfB = new FlowChain(
      { segs: 7, len: 0.16, w0: 0.14, w1: 0.08, thick: 0.034, rest: [1.25, 0.12], wind: [0.1, 0.03], amp: 0.12, freq: 8.4, phase: 1.7, sway: 0.34 },
      this.accentMat,
      this.disposables,
    );
    scarfB.root.position.set(-0.05, 0.43, 0.14);
    scarfB.root.rotation.y = -0.22;
    this.torsoGroup.add(scarfA.root, scarfB.root);
    this.chains.push(scarfA, scarfB);

    // jacket coat-tails
    for (const s of [-1, 1]) {
      const tail = new FlowChain(
        { segs: 4, len: 0.13, w0: 0.2, w1: 0.14, thick: 0.03, rest: [1.5, 0.08], wind: [0.8, 0.14], amp: 0.1, freq: 6.5, phase: s * 1.1, sway: 0.2 },
        this.jacketMat,
        this.disposables,
      );
      tail.root.position.set(s * 0.14, -0.2, 0.2);
      tail.root.rotation.y = s * 0.12;
      this.torsoGroup.add(tail.root);
      this.chains.push(tail);

      const sash = new FlowChain(
        { segs: 4, len: 0.11, w0: 0.07, w1: 0.055, thick: 0.022, rest: [1.2, 0.1], wind: [0.25, 0.05], amp: 0.14, freq: 10, phase: s * 0.7, sway: 0.25 },
        this.accentMat,
        this.disposables,
      );
      sash.root.position.set(s * 0.06 - 0.02, -0.08, 0.27);
      sash.root.rotation.y = s * 0.35;
      this.torsoGroup.add(sash.root);
      this.chains.push(sash);
    }

    /* ---------------- shield & shadow ---------------- */
    const shieldGeo = new THREE.SphereGeometry(1.05, 24, 18);
    this.shieldMat = new THREE.MeshBasicMaterial({ color: 0x5cc8ff, transparent: true, opacity: 0.3, wireframe: true });
    this.shieldBubble = new THREE.Mesh(shieldGeo, this.shieldMat);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x4fb4ff,
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.shieldGlow = new THREE.Mesh(shieldGeo, glowMat);
    this.shieldBubble.position.set(0, 1.0, 0);
    this.shieldGlow.position.set(0, 1.0, 0);
    this.shieldBubble.visible = false;
    this.shieldGlow.visible = false;
    this.root.add(this.shieldBubble, this.shieldGlow);
    this.disposables.push(shieldGeo, this.shieldMat, glowMat);

    const shadowGeo = new THREE.PlaneGeometry(1.55, 1.55);
    const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: 0.78 });
    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.03;
    this.root.add(this.shadowMesh);
    this.disposables.push(shadowGeo, shadowMat);

    this.heroHair = hero.hairHex;
    this.heroHairTip = hero.hairTipHex;
  }

  /**
   * One tapered, curved hair strand. θ: 0 = front, φ: 0 = crown.
   * `aim` is the direction the strand points in head space.
   */
  private addLock(theta: number, phi: number, aim: Vec3Tuple, len: number, rad: number, bend: number, windAmt: number): void {
    const geo = new THREE.ConeGeometry(rad, len, 7, 6, false);
    const pos = geo.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const t = (pos.getY(i) + len / 2) / len;
      pos.setZ(i, pos.getZ(i) + bend * t * t * len);
      pos.setX(i, pos.getX(i) * (1 + (1 - t) * 0.25));
    }
    geo.translate(0, len / 2, 0);
    geo.computeVertexNormals();
    geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(pos.count * 3).fill(1), 3));

    const dir = new THREE.Vector3(Math.sin(phi) * Math.sin(theta), Math.cos(phi), -Math.sin(phi) * Math.cos(theta));
    const pivot = new THREE.Group();
    pivot.position.set(dir.x * 0.25, 0.22 + dir.y * 0.245, 0.02 + dir.z * 0.255);
    const aimV = new THREE.Vector3(aim[0], aim[1], aim[2]).normalize();
    const baseQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), aimV);
    pivot.quaternion.copy(baseQ);
    const mesh = new THREE.Mesh(geo, this.hairMat);
    mesh.castShadow = true;
    pivot.add(mesh);
    this.headGroup.add(pivot);

    const axis = aimV.clone().cross(_Z);
    if (axis.lengthSq() < 1e-5) axis.set(1, 0, 0);
    axis.normalize();
    this.locks.push({
      pivot,
      geo,
      len,
      baseQ,
      windAxis: axis,
      windAmt,
      amp: 0.05 + windAmt * 0.06,
      freq: 5 + Math.random() * 4,
      phase: Math.random() * 6.28,
    });
    this.disposables.push(geo);
  }

  /** Dark roots fading into the hero's glowing tip colour. */
  private recolorHair(rootHex: number, tipHex: number): void {
    const root = new THREE.Color(rootHex);
    const tip = new THREE.Color(tipHex);
    const c = new THREE.Color();
    for (const lock of this.locks) {
      const pos = lock.geo.getAttribute('position');
      const col = lock.geo.getAttribute('color');
      for (let i = 0; i < pos.count; i++) {
        const t = THREE.MathUtils.clamp(pos.getY(i) / lock.len, 0, 1);
        c.lerpColors(root, tip, Math.pow(t, 1.6));
        col.setXYZ(i, c.r, c.g, c.b);
      }
      col.needsUpdate = true;
    }
  }

  public setSkin(heroId: string): void {
    const hero = getHeroById(heroId);
    this.jacketMat.color.setHex(hero.primaryHex);
    this.accentMat.color.setHex(hero.accentHex);
    this.accentMat.emissive.setHex(hero.accentHex);
    this.trimMat.color.setHex(hero.trimHex);
    this.hairRootMat.color.setHex(hero.hairHex);
    this.hairFlowMat.color.setHex(hero.hairHex);
    this.heroHair = hero.hairHex;
    this.heroHairTip = hero.hairTipHex;
    this.recolorHair(this.heroHair, this.heroHairTip);
  }

  public setShieldActive(active: boolean): void {
    this.shieldBubble.visible = active;
    this.shieldGlow.visible = active;
  }

  public triggerLandSquash(): void {
    this.landSquash = 1.0;
  }

  public update(
    dt: number,
    animState: RunnerAnimState,
    worldSpeed: number,
    lateralDelta: number,
    heightAboveGround: number,
  ): void {
    this.time += dt;
    const vy = dt > 0 ? (heightAboveGround - this.prevHeight) / dt : 0;
    this.prevHeight = heightAboveGround;

    this.landSquash = Math.max(0, this.landSquash - dt * 6.5);
    const squashY = 1 - this.landSquash * 0.16;
    const squashXZ = 1 + this.landSquash * 0.12;

    if (this.shieldBubble.visible) {
      this.shieldBubble.rotation.y += dt * 1.6;
      this.shieldBubble.rotation.z += dt * 0.7;
      const pulse = 1 + Math.sin(this.time * 6) * 0.03;
      this.shieldGlow.scale.setScalar(pulse);
    }

    this.shadowMesh.position.y = -heightAboveGround + 0.03;
    const shadowScale = Math.max(0.35, 1 - heightAboveGround * 0.2);
    this.shadowMesh.scale.set(shadowScale, shadowScale, 1);
    (this.shadowMesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0.18, 0.78 - heightAboveGround * 0.16);

    const bankAngle = THREE.MathUtils.clamp(-lateralDelta * 0.16, -0.35, 0.35);
    let windSpeed = worldSpeed;

    if (animState === 'CRASHED') {
      this.bodyPivot.rotation.set(0.45, 0, 0.22);
      this.bodyPivot.position.set(0, -0.18, 0);
      this.bodyPivot.scale.set(1, 1, 1);
      this.torsoGroup.rotation.set(0, 0, 0);
      this.headGroup.rotation.set(0.25, 0, 0.1);
      this.leftArmPivot.rotation.set(-1.1, 0, 0.5);
      this.rightArmPivot.rotation.set(-0.8, 0, -0.5);
      this.leftLegPivot.rotation.set(0.5, 0, 0);
      this.rightLegPivot.rotation.set(-0.3, 0, 0);
      windSpeed = 2;
    } else if (animState === 'SLIDING') {
      this.bodyPivot.position.set(0, -0.52, 0);
      this.bodyPivot.rotation.set(1.08, 0, bankAngle * 0.5);
      this.bodyPivot.scale.set(1.06, 0.86, 1.06);
      this.torsoGroup.rotation.set(0.12, 0, 0);
      this.headGroup.rotation.set(-0.82, 0, 0);
      this.leftArmPivot.rotation.set(-0.7, 0, 0.35);
      this.rightArmPivot.rotation.set(0.6, 0, -0.35);
      this.leftLegPivot.rotation.set(-0.2, 0, 0);
      this.rightLegPivot.rotation.set(0.85, 0, 0);
      windSpeed = worldSpeed * 1.15;
    } else if (animState === 'JUMPING') {
      this.bodyPivot.position.set(0, 0, 0);
      this.bodyPivot.rotation.set(-0.12, 0, bankAngle);
      this.bodyPivot.scale.set(0.95, 1.08, 0.95);
      this.torsoGroup.rotation.set(0.24, 0, 0);
      this.headGroup.rotation.set(-0.12, 0, 0);
      this.leftArmPivot.rotation.set(-1.15, 0, 0.24);
      this.rightArmPivot.rotation.set(0.85, 0, -0.24);
      this.leftLegPivot.rotation.set(-0.95, 0, 0);
      this.rightLegPivot.rotation.set(0.55, 0, 0);
      windSpeed = worldSpeed * 1.1;
    } else {
      const effectiveSpeed = animState === 'TITLE' ? 12.2 : worldSpeed;
      const strideFreq = 0.68 * effectiveSpeed;
      this.runPhase += dt * strideFreq;
      const swing = Math.sin(this.runPhase);
      const bob = Math.abs(Math.cos(this.runPhase)) * 0.085;

      this.bodyPivot.position.set(0, bob, 0);
      this.bodyPivot.rotation.set(0, animState === 'TITLE' ? -0.14 : 0, bankAngle);
      this.bodyPivot.scale.set(squashXZ, squashY, squashXZ);

      this.torsoGroup.rotation.set(animState === 'TITLE' ? 0.22 : 0.28, swing * 0.1, swing * 0.025);
      this.headGroup.rotation.set(animState === 'TITLE' ? -0.1 : -0.2, -swing * 0.05, -swing * 0.02);

      this.leftArmPivot.rotation.set(swing * 1.15 + 0.2, 0, 0.14);
      this.rightArmPivot.rotation.set(-swing * 1.15 + 0.2, 0, -0.14);
      this.leftLegPivot.rotation.set(-swing * 1.05, 0, 0);
      this.rightLegPivot.rotation.set(swing * 1.05, 0, 0);
      windSpeed = effectiveSpeed;
    }

    this.animateFlow(windSpeed, lateralDelta, vy, animState === 'JUMPING' ? 0.55 : 1);
  }

  /** Secondary motion: hair locks + ribbons react to speed, steering and jumps. */
  private animateFlow(windSpeed: number, lateral: number, vy: number, hairWindScale: number): void {
    const windN = THREE.MathUtils.clamp(windSpeed / 22, 0, 1);
    const t = this.time;

    for (const c of this.chains) c.update(t, windN, lateral, vy);

    const lift = THREE.MathUtils.clamp(vy, -10, 10) * -0.02;
    for (const lock of this.locks) {
      const gust = Math.sin(t * lock.freq + lock.phase) * lock.amp * (0.35 + windN);
      const angle = windN * lock.windAmt * hairWindScale + gust + lift * lock.windAmt;
      _windQ.setFromAxisAngle(lock.windAxis, angle);
      _tmpE.set(0, Math.cos(t * lock.freq * 0.7 + lock.phase) * lock.amp * 0.6 * windN, 0);
      _tmpQ.setFromEuler(_tmpE);
      lock.pivot.quaternion.copy(_windQ).multiply(lock.baseQ).multiply(_tmpQ);
    }
  }

  public dispose(): void {
    for (const d of this.disposables) d.dispose();
  }
}
