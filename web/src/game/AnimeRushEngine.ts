import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SoundEngine } from '../audio/SoundEngine';
import {
  ActiveRunBoosts,
  GAME_CONSTANTS,
  GamePhase,
  HudSnapshot,
  LaneIndex,
  QUALITY_PRESETS,
  QualityLevel,
  RunTelemetry,
  loadBestScore,
  saveBestScore,
} from '../types/game';
import { EnvironmentBuilder } from './EnvironmentBuilder';
import { InputAction, InputManager } from './InputManager';
import { ObstacleAndCoinPools } from './ObstacleAndCoinPools';
import { RunnerAnimState, RunnerCharacter } from './RunnerCharacter';
import { ShibaCompanion } from './ShibaCompanion';
import { createRadialShadowTexture } from './textures';
import { WorldCurveUniforms, createWorldCurveUniforms } from './worldCurve';

export class AnimeRushEngine {
  private readonly container: HTMLElement;
  private readonly onHudChange: (snapshot: HudSnapshot) => void;
  private readonly onRunFinished?: (telemetry: RunTelemetry) => void;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly keyLight: THREE.DirectionalLight;
  private readonly fog: THREE.FogExp2;
  private pmremTarget: THREE.WebGLRenderTarget | null = null;
  private readonly resizeObserver: ResizeObserver | null = null;

  private readonly runner: RunnerCharacter;
  private readonly shiba: ShibaCompanion;
  private readonly environment: EnvironmentBuilder;
  private readonly pools: ObstacleAndCoinPools;
  private readonly input: InputManager;
  private readonly sound: SoundEngine;
  private readonly shadowTex: THREE.Texture;
  private readonly curveUniforms: WorldCurveUniforms = createWorldCurveUniforms();
  private readonly pursuerGroup: THREE.Group;
  private readonly pursuerDisposables: Array<{ dispose: () => void }> = [];

  private phase: GamePhase = 'TITLE';
  private simulationPaused = false;
  private rafId: number | null = null;
  private lastFrameMs = 0;

  // Runner physics & stamina state
  private targetLane: LaneIndex = 0;
  private previousLane: LaneIndex = 0;
  private runnerX = 0;
  private runnerY = 0;
  private runnerZ = 0;
  private lobbyScrollZ = 0;
  private velocityY = 0;
  private isGrounded = true;
  private slideTimer = 0;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private slideBufferTimer = 0;
  private staminaLife = 2;
  private lifeRegenTimer = 0;
  private bumpInvulnTimer = 0;

  // Power-ups & consumables state
  private magnetTimer = 0;
  private hasShield = false;
  private headStartTimer = 0;
  private scoreMultiplier = 1;
  private baseAccountMultiplier = 1;
  private consumedMagnet = false;
  private consumedShield = false;
  private consumedMultiplier = false;
  private consumedHeadStart = false;

  // World horizon curve state
  private curveTargetX = 0;
  private curveTargetY = 0;
  private curveSwitchTimer = 5.0;

  // Run telemetry
  private worldSpeed: number = GAME_CONSTANTS.BASE_SPEED;
  private distance = 0;
  private coins = 0;
  private sakuraTokens = 0;
  private jumps = 0;
  private slides = 0;
  private score = 0;
  private bestScore = loadBestScore();
  private isNewRecord = false;
  private nextMilestoneMeters = 250;
  private milestoneLabel: string | null = null;
  private milestoneTimer = 0;

  // Game-feel & camera effects
  private hitstopTimer = 0;
  private shakeIntensity = 0;
  private introSweepTimer = 0;
  private hudSyncAccumulator = 0;

  constructor(
    container: HTMLElement,
    initialQuality: QualityLevel,
    initialMuted: boolean,
    onHudChange: (snapshot: HudSnapshot) => void,
    onRunFinished?: (telemetry: RunTelemetry) => void,
  ) {
    this.container = container;
    this.onHudChange = onHudChange;
    this.onRunFinished = onRunFinished;
    this.sound = new SoundEngine(initialMuted);

    this.renderer = this.createRenderer();
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1f2856);
    this.fog = new THREE.FogExp2(0x3b3d75, QUALITY_PRESETS[initialQuality].fogDensity);
    this.scene.fog = this.fog;

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(58, width / height, 0.2, 230);
    this.camera.position.set(1.65, 1.85, 3.6);
    this.camera.lookAt(0.25, 1.35, -18);

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

    // Twilight anime sky ambient + warm sunset/neon reflection
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x4c1d4c, 1.25);
    this.scene.add(hemi);

    this.keyLight = new THREE.DirectionalLight(0xffe6c7, 2.25);
    this.keyLight.position.set(9, 18, 12);
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    const rimLight = new THREE.DirectionalLight(0xf472b6, 0.9);
    rimLight.position.set(-8, 8, -18);
    this.scene.add(rimLight);

    this.shadowTex = createRadialShadowTexture();
    this.runner = new RunnerCharacter(this.shadowTex, 'ryu');
    this.scene.add(this.runner.root);

    this.shiba = new ShibaCompanion(this.shadowTex, 'shiba_classic');
    this.scene.add(this.shiba.root);

    this.pursuerGroup = this.createPursuerAura();
    this.scene.add(this.pursuerGroup);

    this.environment = new EnvironmentBuilder(this.scene, this.curveUniforms);
    this.pools = new ObstacleAndCoinPools(this.scene, this.shadowTex, this.curveUniforms);

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

  public setLoadout(heroId: string, companionId: string): void {
    this.runner.setSkin(heroId);
    this.shiba.setSkin(companionId);
  }

  public setProfileStats(bestScore: number, activeMultiplier: number): void {
    this.bestScore = Math.max(this.bestScore, bestScore);
    this.baseAccountMultiplier = Math.max(1, activeMultiplier);
    if (this.phase === 'TITLE') {
      this.scoreMultiplier = this.baseAccountMultiplier;
      this.emitHud();
    }
  }

  public setSimulationPaused(paused: boolean): void {
    this.simulationPaused = paused;
    if (!paused) {
      this.lastFrameMs = performance.now();
    }
  }

  public playUiSound(): void {
    this.sound.unlock();
    this.sound.playUiTap();
  }

  public playChestSound(): void {
    this.sound.unlock();
    this.sound.playChestOpen();
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

  public startRun(boosts?: Partial<ActiveRunBoosts>): void {
    this.sound.unlock();
    this.sound.playStart();
    this.simulationPaused = false;
    this.resetRunState(boosts);
    this.introSweepTimer = 0.68;
    this.phase = 'PLAYING';
    this.emitHud();
  }

  public restartRun(boosts?: Partial<ActiveRunBoosts>): void {
    this.startRun(boosts);
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
    this.simulationPaused = false;
    this.resetRunState();
    this.phase = 'TITLE';
    this.emitHud();
  }

  private resetRunState(boosts?: Partial<ActiveRunBoosts>): void {
    this.targetLane = 0;
    this.previousLane = 0;
    this.runnerX = 0;
    this.runnerY = 0;
    this.runnerZ = 0;
    this.lobbyScrollZ = 0;
    this.velocityY = 0;
    this.isGrounded = true;
    this.slideTimer = 0;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.slideBufferTimer = 0;
    this.staminaLife = 2;
    this.lifeRegenTimer = 0;
    this.bumpInvulnTimer = 0;

    this.consumedMagnet = Boolean(boosts?.useMagnet);
    this.consumedShield = Boolean(boosts?.useShield);
    this.consumedMultiplier = Boolean(boosts?.useMultiplier);
    this.consumedHeadStart = Boolean(boosts?.useHeadStart);

    this.magnetTimer = this.consumedMagnet ? 12.0 : 0;
    this.hasShield = this.consumedShield;
    this.headStartTimer = this.consumedHeadStart ? 4.5 : 0;
    this.scoreMultiplier = this.consumedMultiplier ? 5 : this.baseAccountMultiplier;
    this.runner.setShieldActive(this.hasShield);

    this.curveTargetX = 0;
    this.curveTargetY = 0;
    this.curveSwitchTimer = 6.0;
    this.curveUniforms.uCurveX.value = 0;
    this.curveUniforms.uCurveY.value = 0;

    this.worldSpeed = this.consumedHeadStart ? 26.5 : GAME_CONSTANTS.BASE_SPEED;
    this.distance = 0;
    this.coins = 0;
    this.sakuraTokens = 0;
    this.jumps = 0;
    this.slides = 0;
    this.score = 0;
    this.isNewRecord = false;
    this.nextMilestoneMeters = 250;
    this.milestoneLabel = this.consumedHeadStart ? 'TURBO DÉPART !' : null;
    this.milestoneTimer = this.consumedHeadStart ? 1.5 : 0;
    this.hitstopTimer = 0;
    this.shakeIntensity = 0;
    this.introSweepTimer = 0;

    this.pursuerGroup.visible = false;
    this.runner.root.position.set(0, 0, 0);
    this.runner.root.rotation.y = 0;
    this.shiba.reset(0, 0);
    this.shiba.root.rotation.y = 0;
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
          this.previousLane = this.targetLane;
          this.targetLane = (this.targetLane - 1) as LaneIndex;
          this.sound.playLaneSwitch();
        }
        break;
      case 'RIGHT':
        if (this.targetLane < 1) {
          this.previousLane = this.targetLane;
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
      if (this.simulationPaused && this.phase === 'TITLE') {
        return;
      }
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
      // Energetic live center-stage showcase: full-body Hero & Shiba clearly centered between Logo & JOUER!
      const lobbySpeed = 11.4;
      this.lobbyScrollZ -= lobbySpeed * dt;
      this.environment.update(dt, this.lobbyScrollZ, lobbySpeed);
      this.runner.root.position.set(-0.36, 0, this.lobbyScrollZ);
      this.runner.root.rotation.y = -0.18;
      this.runner.update(dt, 'TITLE', lobbySpeed, 0, 0);
      this.shiba.root.rotation.y = -0.14;
      this.shiba.update(dt, 'TITLE', lobbySpeed, -0.36, 0, this.lobbyScrollZ);

      const t = performance.now() * 0.00055;
      this.camera.position.set(
        0.55 + Math.sin(t) * 0.22,
        2.02 + Math.cos(t * 0.8) * 0.06,
        this.lobbyScrollZ + 5.75,
      );
      this.camera.lookAt(0.08, 1.42, this.lobbyScrollZ - 20);
      this.keyLight.position.set(9, 18, this.lobbyScrollZ + 12);
      this.keyLight.target.position.set(0, 0, this.lobbyScrollZ - 8);
      return;
    }

    if (this.phase === 'GAME_OVER') {
      this.environment.update(dt, this.runnerZ, 0);
      this.pools.update(dt, this.runnerZ, 0);
      this.runner.update(dt, 'CRASHED', 0, 0, this.runnerY);
      this.shiba.update(dt, 'CRASHED', 0, this.runnerX, this.runnerY, this.runnerZ);
      this.updateCamera(dt, 0);
      return;
    }

    // PLAYING simulation step
    if (this.headStartTimer > 0) {
      this.headStartTimer = Math.max(0, this.headStartTimer - dt);
      this.worldSpeed = 27.5;
    } else {
      this.worldSpeed = Math.min(
        GAME_CONSTANTS.MAX_SPEED,
        this.worldSpeed + GAME_CONSTANTS.SPEED_ACCEL_PER_SEC * dt,
      );
    }

    if (this.magnetTimer > 0) {
      this.magnetTimer = Math.max(0, this.magnetTimer - dt);
    }

    const deltaZ = this.worldSpeed * dt;
    this.runnerZ -= deltaZ;
    this.distance += deltaZ;

    const targetX = this.targetLane * GAME_CONSTANTS.LANE_WIDTH;
    const prevX = this.runnerX;
    const lerpFactor = 1 - Math.exp(-GAME_CONSTANTS.LANE_LERP_RATE * dt);
    this.runnerX = THREE.MathUtils.lerp(this.runnerX, targetX, lerpFactor);
    const lateralDelta = (this.runnerX - prevX) / dt;

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
      this.jumps++;
      this.sound.playJump();
    }

    if (this.slideBufferTimer > 0 && this.isGrounded) {
      this.slideTimer = GAME_CONSTANTS.SLIDE_DURATION;
      this.slideBufferTimer = 0;
      this.slides++;
      this.sound.playSlide();
    }

    if (this.slideTimer > 0) {
      this.slideTimer = Math.max(0, this.slideTimer - dt);
    }

    if (!this.isGrounded) {
      const gravity =
        this.velocityY < 0
          ? GAME_CONSTANTS.GRAVITY * GAME_CONSTANTS.FALL_GRAVITY_MULTIPLIER
          : GAME_CONSTANTS.GRAVITY;
      this.velocityY -= gravity * dt;
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
    this.shiba.update(dt, animState, this.worldSpeed, this.runnerX, this.runnerY, this.runnerZ);

    this.updateWorldCurve(dt);

    let staminaChanged = false;
    if (this.bumpInvulnTimer > 0) {
      this.bumpInvulnTimer = Math.max(0, this.bumpInvulnTimer - dt);
    }
    if (this.staminaLife < 2) {
      this.lifeRegenTimer -= dt;
      if (this.lifeRegenTimer <= 0) {
        this.staminaLife = 2;
        this.lifeRegenTimer = 0;
        staminaChanged = true;
      }
    }
    this.updatePursuerAura();

    this.environment.update(dt, this.runnerZ, this.worldSpeed);
    this.pools.update(
      dt,
      this.runnerZ,
      this.worldSpeed,
      this.runnerX,
      this.runnerY,
      this.magnetTimer > 0,
    );

    const isActivelySliding = this.slideTimer > 0 && this.isGrounded;
    const isChangingLane = Math.abs(this.runnerX - targetX) > 0.18;
    const canTakeBump = this.staminaLife >= 2 && this.bumpInvulnTimer <= 0;

    const { hitKind, coinsCollected, sakuraCollected, pickedPowerup } =
      this.bumpInvulnTimer > 0
        ? {
            hitKind: 'NONE' as const,
            coinsCollected: 0,
            sakuraCollected: 0,
            pickedPowerup: null,
          }
        : this.pools.checkCollisions(
            this.runnerX,
            this.runnerY,
            isActivelySliding,
            this.runnerZ,
            isChangingLane,
            canTakeBump,
          );

    if (coinsCollected > 0) {
      this.coins += coinsCollected;
      this.sound.playCoin();
    }
    if (sakuraCollected > 0) {
      this.sakuraTokens += sakuraCollected;
      this.sound.playPowerup();
    }
    if (pickedPowerup === 'MAGNET') {
      this.magnetTimer = 11.0;
      this.milestoneLabel = 'AIMANT ACTIF !';
      this.milestoneTimer = 1.4;
      this.sound.playPowerup();
    } else if (pickedPowerup === 'SHIELD') {
      this.hasShield = true;
      this.runner.setShieldActive(true);
      this.milestoneLabel = 'BOUCLIER DOJO !';
      this.milestoneTimer = 1.4;
      this.sound.playPowerup();
    }

    this.score = Math.floor(
      (this.distance * GAME_CONSTANTS.DISTANCE_SCORE_RATE +
        this.coins * GAME_CONSTANTS.COIN_SCORE_VALUE) *
        this.scoreMultiplier,
    );
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.isNewRecord = true;
    }

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

    // Headstart protects against crashes and smashes obstacles cleanly!
    if ((hitKind === 'CRASH' || hitKind === 'BUMP') && this.headStartTimer > 0) {
      this.pools.clearObstacleNearZ(this.runnerZ);
      this.pools.emitBurstPublic(this.runnerX, 1.2, this.runnerZ, 18, 0xf97316);
      this.shakeIntensity = 0.25;
      this.sound.playBump();
    } else if (hitKind === 'CRASH' && this.hasShield) {
      // Shield absorbs fatal collision and shatters obstacle
      this.hasShield = false;
      this.runner.setShieldActive(false);
      this.bumpInvulnTimer = 1.25;
      this.pools.clearObstacleNearZ(this.runnerZ);
      this.pools.emitBurstPublic(this.runnerX, 1.1, this.runnerZ, 20, 0x38bdf8);
      this.shakeIntensity = 0.35;
      this.milestoneLabel = 'BOUCLIER BRISÉ !';
      this.milestoneTimer = 1.3;
      this.sound.playShieldBreak();
      this.emitHud();
    } else if (hitKind === 'BUMP') {
      this.staminaLife = 1;
      this.lifeRegenTimer = GAME_CONSTANTS.LIFE_REGEN_SEC;
      this.bumpInvulnTimer = 0.35;
      this.targetLane = this.previousLane;
      this.hitstopTimer = 0.03;
      this.shakeIntensity = 0.35;
      this.sound.playBump();
      this.updatePursuerAura();
      this.emitHud();
    } else if (hitKind === 'CRASH') {
      this.triggerGameOver();
      return;
    }

    this.keyLight.position.set(this.runnerX + 10, 18, this.runnerZ + 12);
    this.keyLight.target.position.set(this.runnerX, 0, this.runnerZ - 8);

    this.updateCamera(dt, lateralDelta);

    this.hudSyncAccumulator += dt;
    if (coinsCollected > 0 || sakuraCollected > 0 || pickedPowerup || staminaChanged || this.hudSyncAccumulator >= 0.05) {
      this.hudSyncAccumulator = 0;
      this.emitHud();
    }
  }

  private createPursuerAura(): THREE.Group {
    const group = new THREE.Group();
    const shadowGeo = new THREE.CircleGeometry(0.95, 20);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    const wispGeo = new THREE.ConeGeometry(0.55, 1.85, 6);
    const wispMat = new THREE.MeshBasicMaterial({
      color: 0x991b1b,
      transparent: true,
      opacity: 0.52,
    });
    this.pursuerDisposables.push(shadowGeo, shadowMat, wispGeo, wispMat);

    const floorGlow = new THREE.Mesh(shadowGeo, shadowMat);
    floorGlow.rotation.x = -Math.PI / 2;
    floorGlow.position.y = 0.04;

    const shadowWisp = new THREE.Mesh(wispGeo, wispMat);
    shadowWisp.position.y = 0.95;

    group.add(floorGlow, shadowWisp);
    group.visible = false;
    return group;
  }

  private updatePursuerAura(): void {
    const active = this.staminaLife < 2 && this.phase === 'PLAYING';
    this.pursuerGroup.visible = active;
    if (!active) return;
    const t = performance.now() * 0.012;
    this.pursuerGroup.position.set(
      this.runnerX,
      Math.abs(Math.sin(t)) * 0.14,
      this.runnerZ + 2.45 + Math.sin(t * 0.5) * 0.15,
    );
    const pulse = 1 + Math.sin(t * 1.4) * 0.1;
    this.pursuerGroup.scale.set(pulse, 1, pulse);
  }

  private updateWorldCurve(dt: number): void {
    this.curveSwitchTimer -= dt;
    if (this.curveSwitchTimer <= 0) {
      this.curveSwitchTimer = 6.5 + Math.random() * 3.5;
      this.curveTargetX = (Math.random() * 2 - 1) * 0.0042;
      this.curveTargetY = -Math.random() * 0.0028;
    }
    const damp = 1 - Math.exp(-0.55 * dt);
    this.curveUniforms.uCurveX.value = THREE.MathUtils.lerp(
      this.curveUniforms.uCurveX.value,
      this.curveTargetX,
      damp,
    );
    this.curveUniforms.uCurveY.value = THREE.MathUtils.lerp(
      this.curveUniforms.uCurveY.value,
      this.curveTargetY,
      damp,
    );
  }

  private updateCamera(dt: number, lateralDelta: number): void {
    const desiredX = this.runnerX * 0.68;
    const desiredY = 4.35 + this.runnerY * 0.45;
    const desiredZ = this.runnerZ + 7.5;

    if (this.introSweepTimer > 0) {
      this.introSweepTimer = Math.max(0, this.introSweepTimer - dt);
      const sweepRate = 1 - Math.exp(-6.5 * dt);
      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, desiredX, sweepRate);
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, desiredY, sweepRate);
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, desiredZ, sweepRate);
    } else {
      const camFollowRate = 1 - Math.exp(-9.0 * dt);
      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, desiredX, camFollowRate);
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, desiredY, camFollowRate);
      this.camera.position.z = desiredZ;
    }

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
    this.onRunFinished?.({
      score: this.score,
      distance: Math.floor(this.distance),
      coinsEarned: this.coins,
      sakuraTokensEarned: this.sakuraTokens,
      jumps: this.jumps,
      slides: this.slides,
      consumedMagnet: this.consumedMagnet,
      consumedShield: this.consumedShield,
      consumedMultiplier: this.consumedMultiplier,
      consumedHeadStart: this.consumedHeadStart,
    });
  }

  private emitHud(): void {
    this.onHudChange({
      phase: this.phase,
      score: this.score,
      distance: Math.floor(this.distance),
      coins: this.coins,
      sakuraTokens: this.sakuraTokens,
      speedMultiplier: Number((this.worldSpeed / GAME_CONSTANTS.BASE_SPEED).toFixed(1)),
      scoreMultiplier: this.scoreMultiplier,
      bestScore: this.bestScore,
      isNewRecord: this.isNewRecord,
      milestoneLabel: this.milestoneLabel,
      dangerActive: this.staminaLife < 2,
      magnetRemaining: Math.ceil(this.magnetTimer),
      hasShield: this.hasShield,
      jumps: this.jumps,
      slides: this.slides,
      headStartActive: this.headStartTimer > 0,
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
    this.runner.dispose();
    this.shiba.dispose();
    this.environment.dispose();
    this.pools.dispose();
    for (const item of this.pursuerDisposables) {
      item.dispose();
    }
    this.shadowTex.dispose();
    this.pmremTarget?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
