import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CAR_CATALOG,
  COMPANION_CATALOG,
  HERO_CATALOG,
} from '../config/catalog';
import { ConvertibleCar3D } from './ConvertibleCar3D';
import { RunnerCharacter } from './RunnerCharacter';
import { ShibaCompanion } from './ShibaCompanion';
import { createRadialShadowTexture } from './textures';
import {
  encodeCanvasThumbnail,
  getAllCachedThumbnails,
  hasCachedThumbnail,
  hydrateThumbnailCache,
  setCachedThumbnail,
} from './thumbnailStore';

export type PreviewMode = 'heroes' | 'cars' | 'companions';

export interface PreviewSelection {
  mode: PreviewMode;
  heroId: string;
  carId: string;
  companionId: string;
}

/**
 * Warms up 3D thumbnails for the currently equipped hero, car, and Shiba companion
 * using a short-lived offscreen canvas so Lobby portraits appear immediately on startup.
 */
export async function warmupEquippedThumbnails(
  heroId: string,
  carId: string,
  companionId: string,
): Promise<void> {
  if (typeof document === 'undefined') return;
  await hydrateThumbnailCache();

  const needHero = !hasCachedThumbnail(`hero:${heroId}`);
  const needCar = !hasCachedThumbnail(`car:${carId}`);
  const needComp = !hasCachedThumbnail(`comp:${companionId}`);
  if (!needHero && !needCar && !needComp) return;

  const offscreen = document.createElement('canvas');
  offscreen.width = 128;
  offscreen.height = 128;

  let renderer: THREE.WebGLRenderer | null = null;
  let pmremTarget: THREE.WebGLRenderTarget | null = null;
  let shadowTex: THREE.Texture | null = null;
  let runner: RunnerCharacter | null = null;
  let car: ConvertibleCar3D | null = null;
  let shiba: ShibaCompanion | null = null;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas: offscreen,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'low-power',
    });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.24;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(1);
    renderer.setSize(128, 128, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.2, 40);

    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      pmremTarget = pmrem.fromScene(room, 0.04);
      scene.environment = pmremTarget.texture;
      room.dispose();
      pmrem.dispose();
    } catch {
      pmremTarget = null;
    }

    const hemi = new THREE.HemisphereLight(0xffffff, 0x94a3b8, 1.45);
    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.9);
    keyLight.position.set(3.5, 6.2, 5.2);
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    rimLight.position.set(-4.5, 3.0, -3.5);
    scene.add(hemi, keyLight, rimLight);

    const turntable = new THREE.Group();
    scene.add(turntable);

    shadowTex = createRadialShadowTexture();
    runner = new RunnerCharacter(shadowTex, heroId);
    car = new ConvertibleCar3D(shadowTex, carId);
    shiba = new ShibaCompanion(shadowTex, companionId);
    turntable.add(runner.root, car.root, shiba.root);

    if (needHero) {
      camera.position.set(0, 1.38, 3.05);
      camera.lookAt(0, 0.96, 0);
      camera.updateProjectionMatrix();
      runner.root.visible = true;
      runner.root.position.set(0, 0, 0);
      car.setVisible(false);
      shiba.root.visible = false;
      turntable.rotation.y = Math.PI - 0.26;
      runner.setSkin(heroId);
      runner.update(0.016, 'TITLE', 0, 0, 0);
      renderer.render(scene, camera);
      setCachedThumbnail(`hero:${heroId}`, encodeCanvasThumbnail(offscreen));
    }

    if (needCar) {
      camera.position.set(0, 1.55, 4.1);
      camera.lookAt(0, 0.62, 0);
      camera.updateProjectionMatrix();
      runner.root.visible = true;
      runner.root.position.set(0, 0.02, 0.04);
      runner.setSkin('ryu');
      runner.update(0.016, 'SEATED_CAR', 0, 0, 0);
      car.setVisible(true);
      car.root.position.set(0, 0, 0);
      shiba.root.visible = false;
      turntable.rotation.y = Math.PI - 0.56;
      car.setCarModel(carId);
      car.update(0.016, 0, 0);
      renderer.render(scene, camera);
      setCachedThumbnail(`car:${carId}`, encodeCanvasThumbnail(offscreen));
    }

    if (needComp) {
      camera.position.set(0, 0.92, 2.25);
      camera.lookAt(0, 0.42, 0);
      camera.updateProjectionMatrix();
      runner.root.visible = false;
      car.setVisible(false);
      shiba.root.visible = true;
      shiba.root.position.set(0, 0, 0);
      turntable.rotation.y = Math.PI - 0.34;
      shiba.setSkin(companionId);
      shiba.update(0.016, 'TITLE', 0, 0, 0, 0);
      shiba.root.position.set(0, 0, 0);
      renderer.render(scene, camera);
      setCachedThumbnail(`comp:${companionId}`, encodeCanvasThumbnail(offscreen));
    }
  } catch {
    // Graceful silent fallback to kanji/icons if offscreen WebGL is restricted
  } finally {
    runner?.dispose();
    car?.dispose();
    shiba?.dispose();
    shadowTex?.dispose();
    pmremTarget?.dispose();
    renderer?.dispose();
  }
}

/**
 * Single shared WebGL showroom renderer + cached portrait thumbnail generator.
 * Uses only ONE WebGL context while HeroesModal is open so mid-range Android WebViews stay fast.
 */
export class PreviewStage3D {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private pmremTarget: THREE.WebGLRenderTarget | null = null;
  private readonly turntable = new THREE.Group();
  private readonly pedestal: THREE.Mesh;
  private readonly shadowTex: THREE.Texture;

  private readonly runner: RunnerCharacter;
  private readonly car: ConvertibleCar3D;
  private readonly shiba: ShibaCompanion;
  private readonly disposables: Array<{ dispose: () => void }> = [];

  private selection: PreviewSelection;
  private userYaw = 0;
  private isDragging = false;
  private lastPointerX = 0;
  private rafId: number | null = null;
  private lastMs = performance.now();
  private disposed = false;

  constructor(
    canvas: HTMLCanvasElement,
    initialSelection: PreviewSelection,
    onThumbnailsReady?: (thumbs: Record<string, string>) => void,
  ) {
    this.canvas = canvas;
    this.selection = { ...initialSelection };

    this.renderer = this.createRenderer(canvas);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.24;
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();

    const w = Math.max(120, canvas.clientWidth || 320);
    const h = Math.max(120, canvas.clientHeight || 220);
    this.camera = new THREE.PerspectiveCamera(36, w / h, 0.2, 40);

    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const room = new RoomEnvironment();
      this.pmremTarget = pmrem.fromScene(room, 0.04);
      this.scene.environment = this.pmremTarget.texture;
      room.dispose();
      pmrem.dispose();
    } catch {
      this.pmremTarget = null;
    }

    const hemi = new THREE.HemisphereLight(0xffffff, 0x94a3b8, 1.45);
    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.9);
    keyLight.position.set(3.5, 6.2, 5.2);
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    rimLight.position.set(-4.5, 3.0, -3.5);
    this.scene.add(hemi, keyLight, rimLight);

    this.shadowTex = createRadialShadowTexture();
    const pedGeo = new THREE.CylinderGeometry(1.42, 1.54, 0.14, 32);
    const pedMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.34,
      metalness: 0.55,
    });
    const pedRingGeo = new THREE.TorusGeometry(1.44, 0.04, 8, 36);
    pedRingGeo.rotateX(Math.PI / 2);
    const pedRingMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    this.disposables.push(pedGeo, pedMat, pedRingGeo, pedRingMat);

    this.pedestal = new THREE.Mesh(pedGeo, pedMat);
    this.pedestal.position.y = -0.07;
    const pedRing = new THREE.Mesh(pedRingGeo, pedRingMat);
    pedRing.position.y = 0.01;
    this.pedestal.add(pedRing);

    this.scene.add(this.pedestal);
    this.scene.add(this.turntable);

    this.runner = new RunnerCharacter(this.shadowTex, initialSelection.heroId);
    this.car = new ConvertibleCar3D(this.shadowTex, initialSelection.carId);
    this.shiba = new ShibaCompanion(this.shadowTex, initialSelection.companionId);

    this.turntable.add(this.runner.root, this.car.root, this.shiba.root);

    this.runner.setOnMissMaiaLoaded(() => {
      if (this.disposed) return;
      this.captureSingleHeroThumbnail('miss_maia');
      if (onThumbnailsReady) {
        onThumbnailsReady(getAllCachedThumbnails());
      }
      this.applySelection(this.selection);
    });

    this.applySelection(initialSelection);
    void hydrateThumbnailCache().then(() => {
      if (this.disposed) return;
      this.generateMissingThumbnails(onThumbnailsReady);
    });
    this.resizeToContainer();
    this.attachPointerControls();
    this.startLoop();
  }

  private createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
    try {
      return new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
        powerPreference: 'default',
      });
    } catch {
      return new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        preserveDrawingBuffer: true,
      });
    }
  }

  public setSelection(next: PreviewSelection): void {
    const modeChanged = this.selection.mode !== next.mode;
    this.selection = { ...next };
    if (modeChanged) {
      this.userYaw = 0;
    }
    this.applySelection(this.selection);
  }

  private applySelection(sel: PreviewSelection): void {
    this.runner.setSkin(sel.heroId);
    this.car.setCarModel(sel.carId);
    this.shiba.setSkin(sel.companionId);

    if (sel.mode === 'heroes') {
      this.runner.root.visible = true;
      this.runner.root.position.set(0, 0, 0);
      this.car.setVisible(false);
      this.shiba.root.visible = false;
      this.pedestal.scale.set(0.88, 1, 0.88);
      this.camera.position.set(-0.36, 1.38, 3.65);
      this.camera.lookAt(-0.36, 0.96, 0);
    } else if (sel.mode === 'cars') {
      this.runner.root.visible = true;
      this.runner.root.position.set(0, 0.02, 0.04);
      this.car.setVisible(true);
      this.car.root.position.set(0, 0, 0);
      this.shiba.root.visible = false;
      this.pedestal.scale.set(1.22, 1, 1.22);
      this.camera.position.set(-0.42, 1.75, 4.75);
      this.camera.lookAt(-0.42, 0.72, 0);
    } else {
      this.runner.root.visible = false;
      this.car.setVisible(false);
      this.shiba.root.visible = true;
      this.shiba.root.position.set(0, 0, 0);
      this.pedestal.scale.set(0.75, 1, 0.75);
      this.camera.position.set(-0.30, 0.98, 2.55);
      this.camera.lookAt(-0.30, 0.44, 0);
    }
  }

  public resizeToContainer(): void {
    const parent = this.canvas.parentElement;
    const w = Math.max(120, parent?.clientWidth || this.canvas.clientWidth || 320);
    const h = Math.max(120, parent?.clientHeight || this.canvas.clientHeight || 220);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private captureSingleHeroThumbnail(heroId: string): void {
    const prevSel = { ...this.selection };
    const prevYaw = this.turntable.rotation.y;
    const prevPedestalVis = this.pedestal.visible;

    this.pedestal.visible = false;
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(128, 128, false);
    this.camera.aspect = 1;
    this.camera.position.set(0, 1.38, 3.05);
    this.camera.lookAt(0, 0.96, 0);
    this.camera.updateProjectionMatrix();

    this.runner.root.visible = true;
    this.runner.root.position.set(0, 0, 0);
    this.car.setVisible(false);
    this.shiba.root.visible = false;
    this.runner.setSkin(heroId);
    this.runner.update(0.016, 'TITLE', 0, 0, 0);
    this.turntable.rotation.y = Math.PI - 0.26;
    this.renderer.render(this.scene, this.camera);
    setCachedThumbnail(`hero:${heroId}`, encodeCanvasThumbnail(this.canvas));

    this.pedestal.visible = prevPedestalVis;
    this.turntable.rotation.y = prevYaw;
    this.applySelection(prevSel);
    this.resizeToContainer();
  }

  private generateMissingThumbnails(
    onThumbnailsReady?: (thumbs: Record<string, string>) => void,
  ): void {
    const needHeroes = HERO_CATALOG.some((h) => !hasCachedThumbnail(`hero:${h.id}`));
    const needCars = CAR_CATALOG.some((c) => !hasCachedThumbnail(`car:${c.id}`));
    const needComps = COMPANION_CATALOG.some((c) => !hasCachedThumbnail(`comp:${c.id}`));

    if (!needHeroes && !needCars && !needComps) {
      onThumbnailsReady?.(getAllCachedThumbnails());
      return;
    }

    const prevSel = { ...this.selection };
    const prevPedestalVis = this.pedestal.visible;
    this.pedestal.visible = false;
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(128, 128, false);
    this.camera.aspect = 1;

    // 1. Snapshot Heroes
    if (needHeroes) {
      this.camera.position.set(0, 1.38, 3.05);
      this.camera.lookAt(0, 0.96, 0);
      this.camera.updateProjectionMatrix();
      this.runner.root.visible = true;
      this.runner.root.position.set(0, 0, 0);
      this.car.setVisible(false);
      this.shiba.root.visible = false;
      this.turntable.rotation.y = Math.PI - 0.26;
      for (const hero of HERO_CATALOG) {
        const key = `hero:${hero.id}`;
        if (hasCachedThumbnail(key)) continue;
        this.runner.setSkin(hero.id);
        this.runner.update(0.016, 'TITLE', 0, 0, 0);
        this.renderer.render(this.scene, this.camera);
        setCachedThumbnail(key, encodeCanvasThumbnail(this.canvas));
      }
    }

    // 2. Snapshot Convertible Cars with driver inside
    if (needCars) {
      this.camera.position.set(0, 1.55, 4.1);
      this.camera.lookAt(0, 0.62, 0);
      this.camera.updateProjectionMatrix();
      this.runner.root.visible = true;
      this.runner.root.position.set(0, 0.02, 0.04);
      this.runner.setSkin('ryu');
      this.runner.update(0.016, 'SEATED_CAR', 0, 0, 0);
      this.car.setVisible(true);
      this.car.root.position.set(0, 0, 0);
      this.shiba.root.visible = false;
      this.turntable.rotation.y = Math.PI - 0.56;
      for (const car of CAR_CATALOG) {
        const key = `car:${car.id}`;
        if (hasCachedThumbnail(key)) continue;
        this.car.setCarModel(car.id);
        this.car.update(0.016, 0, 0);
        this.renderer.render(this.scene, this.camera);
        setCachedThumbnail(key, encodeCanvasThumbnail(this.canvas));
      }
    }

    // 3. Snapshot Companions
    if (needComps) {
      this.camera.position.set(0, 0.92, 2.25);
      this.camera.lookAt(0, 0.42, 0);
      this.camera.updateProjectionMatrix();
      this.runner.root.visible = false;
      this.car.setVisible(false);
      this.shiba.root.visible = true;
      this.shiba.root.position.set(0, 0, 0);
      this.turntable.rotation.y = Math.PI - 0.34;
      for (const comp of COMPANION_CATALOG) {
        const key = `comp:${comp.id}`;
        if (hasCachedThumbnail(key)) continue;
        this.shiba.setSkin(comp.id);
        this.shiba.update(0.016, 'TITLE', 0, 0, 0, 0);
        this.shiba.root.position.set(0, 0, 0);
        this.renderer.render(this.scene, this.camera);
        setCachedThumbnail(key, encodeCanvasThumbnail(this.canvas));
      }
    }

    this.pedestal.visible = prevPedestalVis;
    this.turntable.rotation.y = Math.PI - 0.28;
    this.applySelection(prevSel);
    this.resizeToContainer();
    onThumbnailsReady?.(getAllCachedThumbnails());
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.isDragging = true;
    this.lastPointerX = e.clientX;
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      // ignore on older WebViews
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastPointerX;
    this.lastPointerX = e.clientX;
    this.userYaw += dx * 0.012;
  };

  private onPointerUp = (e: PointerEvent): void => {
    this.isDragging = false;
    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  private attachPointerControls(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
  }

  private startLoop(): void {
    this.lastMs = performance.now();
    const tick = (now: number) => {
      if (this.disposed) return;
      this.rafId = requestAnimationFrame(tick);
      const dt = Math.min(Math.max((now - this.lastMs) / 1000, 0.001), 0.05);
      this.lastMs = now;

      if (!this.isDragging) {
        this.userYaw += dt * 0.42;
      }

      const baseYaw = this.selection.mode === 'cars' ? Math.PI - 0.55 : Math.PI - 0.26;
      this.turntable.rotation.y = baseYaw + this.userYaw;

      if (this.selection.mode === 'heroes') {
        this.runner.update(dt, 'TITLE', 6.5, 0, 0);
      } else if (this.selection.mode === 'cars') {
        this.runner.update(dt, 'SEATED_CAR', 12.0, 0, 0);
        this.car.update(dt, 14.0, 0);
      } else {
        this.shiba.update(dt, 'TITLE', 7.5, 0, 0, 0);
        this.shiba.root.position.set(0, 0, 0);
      }

      this.renderer.render(this.scene, this.camera);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  public dispose(): void {
    this.disposed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    this.runner.dispose();
    this.car.dispose();
    this.shiba.dispose();
    this.shadowTex.dispose();
    for (const d of this.disposables) d.dispose();
    this.pmremTarget?.dispose();
    this.renderer.dispose();
  }
}
