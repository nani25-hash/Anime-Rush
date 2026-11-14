import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SoundEngine } from '../audio/SoundEngine';
import {
  GAME_CONSTANTS,
  GamePhase,
  HudSnapshot,
  LaneIndex,
  QUALITY_PRESETS,
  QualityLevel,
  loadBestScore,
  saveBestScore,
} from '../types/game';
import { EnvironmentBuilder } from './EnvironmentBuilder';
import { InputAction, InputManager } from './InputManager';
import { ObstacleAndCoinPools } from './ObstacleAndCoinPools';
import { RunnerAnimState, RunnerCharacter } from './RunnerCharacter';
import { createRadialShadowTexture } from './textures';

export class AnimeRushEngine {
  private readonly container: HTMLElement;
  private readonly onHudChange: (snapshot: HudSnapshot) => void;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly keyLight: THREE.DirectionalLight;
  private readonly fog: THREE.FogExp2;
  private pmremTarget: THREE.WebGLRenderTarget | null = null;
  private readonly resizeObserver: ResizeObserver | null = null;

  private readonly runner: RunnerCharacter;
  private readonly environment: EnvironmentBuilder;
  private readonly pools: ObstacleAndCoinPools;
  private readonly input: InputManager;
  private readonly sound: SoundEngine;
  private readonly shadowTex: THREE.Texture;

  private phase: GamePhase = 'TITLE';
  private rafId: number | null = null;
  private lastFrameMs = 0;

  // Runner physics state
  private targetLane: LaneIndex = 0;
  private runnerX = 0;
  private runnerY = 0;
  private runnerZ = 0;
  private velocityY = 0;
  private isGrounded = true;
  private slideTimer = 0;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private slideBufferTimer = 0;

  // Run telemetry
  private worldSpeed: number = GAME_CONSTANTS.BASE_SPEED;
  private distance = 0;
  private coins = 0;
  private score = 0;
  private bestScore = loadBestScore();
  private isNewRecord = false;
  private nextMilestoneMeters = 250;
  private milestoneLabel: string | null = null;
  private milestoneTimer = 0;

  // Game-feel effects
  private hitstopTimer = 0;
  private shakeIntensity = 0;
  private hudSyncAccumulator = 0;

  constructor(
    container: HTMLElement,
    initialQuality: QualityLevel,
    initialMuted: boolean,
    onHudChange: (snapshot: HudSnapshot) => void,
  ) {
    this.container = container;
    this.onHudChange = onHudChange;
    this.sound = new SoundEngine(initialMuted);

    // WebGLRenderer configured for mobile performance & ACES Filmic look
    this.renderer = this.createRenderer();
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070b19);
    this.fog = new THREE.FogExp2(0x0b1026, QUALITY_PRESETS[initialQuality].fogDensity);
    this.scene.fog = this.fog;

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(58, width / height, 0.2, 220);
    this.camera.position.set(0, 4.4, 7.6);
    this.camera.lookAt(0, 1.5, -8);

    // Optional PBR environment reflections (graceful fallback on restricted mobile GPUs)
    try {
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      const roomEnv = new RoomEnvironment();
      this.pmremTarget = pmremGenerator.fromScene(roomEnv, 0.04);
      this.scene.environment = this.pmremTarget.texture;
      roomEnv.dispose();
      pmremGenerator.dispose();
    } catch {
      this.pmremTarget = null;
    }

    // Cool moonlight fill + warm lantern directional key light
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x1e1b4b, 0.95);
    this.scene.add(hemi);

    this.keyLight = new THREE.DirectionalLight(0xffe4b5, 2.2);
    this.keyLight.position.set(10, 18, 12);
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    rimLight.position.set(-8, 6, -14);
    this.scene.add(rimLight);

    this.shadowTex = createRadialShadowTexture();
    this.runner = new RunnerCharacter(this.shadowTex);
    this.scene.add(this.runner.root);

    this.environment = new EnvironmentBuilder(this.scene);
    this.pools = new ObstacleAndCoinPools(this.scene, this.shadowTex);

    this.input = new InputManager(this.container, this.handleInput);
    window.addEventListener('resize', this.handleResize);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.container);
    }

    this.applyQuality(initialQuality);
    this.handleResize();
    this.emitHud();
    this.startLoop();
  }

  private createRenderer(): THREE.WebGLRenderer {
    try {
      return new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      return new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: 'default',
        alpha: false,
      });
    }
  }

  public getPhase(): GamePhase {
    return this.phase;
  }

  public setQuality(quality: QualityLevel): void {
    this.applyQuality(quality);
  }

  public setMuted(muted: boolean): void {
    this.sound.setMuted(muted);
  }

  private applyQuality(quality: QualityLevel): void {
    const preset = QUALITY_PRESETS[quality];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, preset.maxDpr));
    this.renderer.shadowMap.enabled = preset.shadows;
    this.keyLight.castShadow = preset.shadows;
    if (preset.shadows) {
      this.keyLight.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
      this.keyLight.shadow.camera.near = 2;
      this.keyLight.shadow.camera.far = 55;
      const d = 14;
      this.keyLight.shadow.camera.left = -d;
      this.keyLight.shadow.camera.right = d;
      this.keyLight.shadow.camera.top = d;
      this.keyLight.shadow.camera.bottom = -d;
      this.keyLight.shadow.bias = -0.0005;
    }
    this.fog.density = preset.fogDensity;
    this.camera.far = preset.farPlane;
    this.camera.updateProjectionMatrix();
    this.environment.applyQuality(preset);
  }

  public startRun(): void {
    this.sound.unlock();
    this.sound.playStart();
    this.resetRunState();
    this.phase = 'PLAYING';
    this.emitHud();
  }

  public restartRun(): void {
    this.sound.unlock();
    this.sound.playStart();
    this.resetRunState();
    this.phase = 'PLAYING';
    this.emitHud();
  }

  public pauseRun(): void {
    if (this.phase === 'PLAYING') {
      this.phase = 'PAUSED';
      this.emitHud();
    }
  }

  public resumeRun(): void {
    if (this.phase === 'PAUSED') {
      this.sound.unlock();
      this.phase = 'PLAYING';
      this.lastFrameMs = performance.now();
      this.emitHud();
    }
  }

  public returnToTitle(): void {
    this.resetRunState();
    this.phase = 'TITLE';
    this.emitHud();
  }

  private resetRunState(): void {
    this.targetLane = 0;
    this.runnerX = 0;
    this.runnerY = 0;
    this.runnerZ = 0;
    this.velocityY = 0;
    this.isGrounded = true;
    this.slideTimer = 0;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.slideBufferTimer = 0;

    this.worldSpeed = GAME_CONSTANTS.BASE_SPEED;
    this.distance = 0;
    this.coins = 0;
    this.score = 0;
    this.isNewRecord = false;
    this.nextMilestoneMeters = 250;
    this.milestoneLabel = null;
    this.milestoneTimer = 0;
    this.hitstopTimer = 0;
    this.shakeIntensity = 0;

    this.runner.root.position.set(0, 0, 0);
    this.environment.reset();
    this.pools.reset();
  }

  private handleInput = (action: InputAction): void => {
    if (action === 'PAUSE') {
      if (this.phase === 'PLAYING') this.pauseRun();
      else if (this.phase === 'PAUSED') this.resumeRun();
      return;
    }

    if (this.phase !== 'PLAYING') return;
    this.sound.unlock();

    switch (action) {
      case 'LEFT':
        if (this.targetLane > -1) {
          this.targetLane = (this.targetLane - 1) as LaneIndex;
          this.sound.playLaneSwitch();
        }
        break;
      case 'RIGHT':
        if (this.targetLane < 1) {
          this.targetLane = (this.targetLane + 1) as LaneIndex;
          this.sound.playLaneSwitch();
        }
        break;
      case 'JUMP':
        this.jumpBufferTimer = GAME_CONSTANTS.INPUT_BUFFER_SEC;
        break;
      case 'SLIDE':
        this.slideBufferTimer = GAME_CONSTANTS.INPUT_BUFFER_SEC;
        if (!this.isGrounded) {
          // Fast-fall straight into slide like Subway Surfers
          this.velocityY = Math.min(this.velocityY, GAME_CONSTANTS.FAST_FALL_VELOCITY);
        }
        break;
    }
  };

  private handleResize = (): void => {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.7 ? 62 : 56;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  };

  private startLoop(): void {
    this.lastFrameMs = performance.now();
    const tick = (nowMs: number) => {
      this.rafId = requestAnimationFrame(tick);
      const rawDt = (nowMs - this.lastFrameMs) / 1000;
      this.lastFrameMs = nowMs;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
      this.step(dt);
      this.renderer.render(this.scene, this.camera);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private step(dt: number): void {
    if (this.phase === 'PAUSED') {
      return;
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      this.updateCamera(dt, 0);
      return;
    }

    if (this.phase === 'TITLE') {
      // Atmospheric live world on title screen
      this.environment.update(dt, 0, 5.5);
      this.runner.root.position.set(0, 0, 0);
      this.runner.update(dt, 'TITLE', 6.0, 0, 0);
      const t = performance.now() * 0.0005;
      this.camera.position.set(Math.sin(t) * 1.15, 2.35, 4.3);
      this.camera.lookAt(0, 1.35, -2.5);
      this.keyLight.position.set(10, 18, 12);
      this.keyLight.target.position.set(0, 0, 0);
      return;
    }

    if (this.phase === 'GAME_OVER') {
      this.environment.update(dt, this.runnerZ, 0);
      this.pools.update(dt, this.runnerZ, 0);
      this.runner.update(dt, 'CRASHED', 0, 0, this.runnerY);
      this.updateCamera(dt, 0);
      return;
    }

    // PLAYING simulation step
    this.worldSpeed = Math.min(
      GAME_CONSTANTS.MAX_SPEED,
      this.worldSpeed + GAME_CONSTANTS.SPEED_ACCEL_PER_SEC * dt,
    );

    const deltaZ = this.worldSpeed * dt;
    this.runnerZ -= deltaZ;
    this.distance += deltaZ;

    // Lateral lane damping
    const targetX = this.targetLane * GAME_CONSTANTS.LANE_WIDTH;
    const prevX = this.runnerX;
    const lerpFactor = 1 - Math.exp(-GAME_CONSTANTS.LANE_LERP_RATE * dt);
    this.runnerX = THREE.MathUtils.lerp(this.runnerX, targetX, lerpFactor);
    const lateralDelta = (this.runnerX - prevX) / dt;

    // Input buffers & coyote time
    if (this.isGrounded) {
      this.coyoteTimer = GAME_CONSTANTS.COYOTE_TIME_SEC;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    this.slideBufferTimer = Math.max(0, this.slideBufferTimer - dt);

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.velocityY = GAME_CONSTANTS.JUMP_VELOCITY;
      this.isGrounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.slideTimer = 0;
      this.sound.playJump();
    }

    if (this.slideBufferTimer > 0 && this.isGrounded) {
      this.slideTimer = GAME_CONSTANTS.SLIDE_DURATION;
      this.slideBufferTimer = 0;
      this.sound.playSlide();
    }

    if (this.slideTimer > 0) {
      this.slideTimer = Math.max(0, this.slideTimer - dt);
    }

    // Vertical physics
    if (!this.isGrounded) {
      this.velocityY -= GAME_CONSTANTS.GRAVITY * dt;
      this.runnerY += this.velocityY * dt;
      if (this.runnerY <= 0) {
        this.runnerY = 0;
        this.velocityY = 0;
        this.isGrounded = true;
        this.runner.triggerLandSquash();
      }
    }

    this.runner.root.position.set(this.runnerX, this.runnerY, this.runnerZ);

    const animState: RunnerAnimState = !this.isGrounded
      ? 'JUMPING'
      : this.slideTimer > 0
        ? 'SLIDING'
        : 'RUNNING';
    this.runner.update(dt, animState, this.worldSpeed, lateralDelta, this.runnerY);

    // Track, obstacles, coins & particles
    this.environment.update(dt, this.runnerZ, this.worldSpeed);
    this.pools.update(dt, this.runnerZ, this.worldSpeed);

    // Collision AABB bounds for runner
    const isActivelySliding = this.slideTimer > 0 && this.isGrounded;
    const { hitObstacle, coinsCollected } = this.pools.checkCollisions(
      this.runnerX,
      this.runnerY,
      isActivelySliding,
      this.runnerZ,
    );

    if (coinsCollected > 0) {
      this.coins += coinsCollected;
      this.sound.playCoin();
    }

    // Score progression
    this.score = Math.floor(
      this.distance * GAME_CONSTANTS.DISTANCE_SCORE_RATE +
        this.coins * GAME_CONSTANTS.COIN_SCORE_VALUE,
    );
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.isNewRecord = true;
    }

    // Distance milestone toast
    if (this.milestoneTimer > 0) {
      this.milestoneTimer = Math.max(0, this.milestoneTimer - dt);
      if (this.milestoneTimer === 0) {
        this.milestoneLabel = null;
      }
    }
    if (this.distance >= this.nextMilestoneMeters) {
      this.milestoneLabel = `${this.nextMilestoneMeters} m !`;
      this.milestoneTimer = 1.6;
      this.nextMilestoneMeters += 250;
    }

    if (hitObstacle) {
      this.triggerGameOver();
      return;
    }

    // Move directional shadow light with runner
    this.keyLight.position.set(this.runnerX + 10, 18, this.runnerZ + 12);
    this.keyLight.target.position.set(this.runnerX, 0, this.runnerZ - 8);

    this.updateCamera(dt, lateralDelta);

    // Throttled HUD updates (~20Hz or immediate on coin/milestone)
    this.hudSyncAccumulator += dt;
    if (coinsCollected > 0 || this.hudSyncAccumulator >= 0.05) {
      this.hudSyncAccumulator = 0;
      this.emitHud();
    }
  }

  private updateCamera(dt: number, lateralDelta: number): void {
    const camFollowRate = 1 - Math.exp(-9.0 * dt);
    const desiredX = this.runnerX * 0.68;
    const desiredY = 4.3 + this.runnerY * 0.45;
    const desiredZ = this.runnerZ + 7.5;

    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, desiredX, camFollowRate);
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, desiredY, camFollowRate);
    this.camera.position.z = desiredZ;

    if (this.shakeIntensity > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= Math.exp(-10 * dt);
    } else {
      this.shakeIntensity = 0;
    }

    this.camera.lookAt(
      this.camera.position.x * 0.72,
      1.55 + this.runnerY * 0.3,
      this.runnerZ - 9.5,
    );
    this.camera.rotation.z = THREE.MathUtils.clamp(-lateralDelta * 0.004, -0.04, 0.04);
  }

  private triggerGameOver(): void {
    this.phase = 'GAME_OVER';
    this.hitstopTimer = 0.06;
    this.shakeIntensity = 0.65;
    this.sound.playCrash();
    saveBestScore(this.bestScore);
    this.emitHud();
  }

  private emitHud(): void {
    this.onHudChange({
      phase: this.phase,
      score: this.score,
      distance: Math.floor(this.distance),
      coins: this.coins,
      speedMultiplier: Number((this.worldSpeed / GAME_CONSTANTS.BASE_SPEED).toFixed(1)),
      bestScore: this.bestScore,
      isNewRecord: this.isNewRecord,
      milestoneLabel: this.milestoneLabel,
    });
  }

  public dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    window.removeEventListener('resize', this.handleResize);
    this.resizeObserver?.disconnect();
    this.input.dispose();
    this.sound.dispose();
    this.environment.dispose();
    this.pools.dispose();
    this.shadowTex.dispose();
    this.pmremTarget?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
