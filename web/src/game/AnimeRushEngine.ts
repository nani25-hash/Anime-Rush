import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SoundEngine } from '../audio/SoundEngine';
import {
  CarDefinition,
  CompanionDefinition,
  HeroDefinition,
  getCarById,
  getCompanionById,
  getHeroById,
} from '../config/catalog';
import {
  ActiveRunBoosts,
  FpsLimit,
  GAME_CONSTANTS,
  GamePhase,
  HudSnapshot,
  LaneIndex,
  QUALITY_PRESETS,
  QualityLevel,
  RunTelemetry,
  TutorialStep,
  loadBestScore,
  loadMusicVolume,
  loadSavedFpsLimit,
  loadSfxVolume,
  loadTutorialDone,
  saveBestScore,
  saveTutorialDone,
} from '../types/game';
import { ConvertibleCar3D } from './ConvertibleCar3D';
import { EnvironmentBuilder } from './EnvironmentBuilder';
import { InputAction, InputManager } from './InputManager';
import { ObstacleAndCoinPools } from './ObstacleAndCoinPools';
import { RunnerAnimState, RunnerCharacter } from './RunnerCharacter';
import { ShibaCompanion } from './ShibaCompanion';
import { computeNearMissCombo } from './collisionMath';
import { createRadialShadowTexture } from './textures';
import { WorldCurveUniforms, createWorldCurveUniforms } from './worldCurve';

export class AnimeRushEngine {
  private readonly container: HTMLElement;
  private readonly onHudChange: (snapshot: HudSnapshot) => void;
  private readonly onRunFinished?: (telemetry: RunTelemetry) => void;
  private readonly onRushWordCompleted?: () => void;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly keyLight: THREE.DirectionalLight;
  private readonly fog: THREE.FogExp2;
  private pmremTarget: THREE.WebGLRenderTarget | null = null;
  private readonly resizeObserver: ResizeObserver | null = null;

  private readonly runner: RunnerCharacter;
  private readonly car: ConvertibleCar3D;
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
  private lastRenderMs = 0;
  private fpsLimit: FpsLimit = loadSavedFpsLimit();
  private baseCameraFov = 58;

  // Equipped hero, companion & convertible car profile
  private equippedHero: HeroDefinition = getHeroById('ryu');
  private equippedCompanion: CompanionDefinition = getCompanionById('shiba_classic');
  private equippedCar: CarDefinition = getCarById('yellow_cab_gt');

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

  // Fuel Cans & Open-Top Convertible Car Mode
  private fuelUnits = 0;
  private carRemaining = 0;

  // Dynamic Hero & Shiba Power Systems
  private heroPowerCharge = 0;
  private heroPowerActiveTimer = 0;
  private shibaPowerCharge = 0;
  private shibaPowerActiveTimer = 0;
  private shibaCoinMultFactor = 1;
  private invincibleSprintTimer = 0;
  private overdriveMultFactor = 1;
  private coinBonusAccumulator = 0;

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
  private runCoinGoalAnnounced = false;

  // Game-feel & camera effects
  private hitstopTimer = 0;
  private shakeIntensity = 0;
  private introSweepTimer = 0;
  private hudSyncAccumulator = 0;

  // Permanent Upgrades (Lv 1-5), Haptics, Biomes, Near-Miss Combo, RUSH Hunt, Tutorial & Record Gate
  private upgradeLevels = { magnet: 1, car: 1, shield: 1, score: 1 };
  private hapticsEnabled = true;
  private revivedUsed = false;
  private nearMissCount = 0;
  private nearMissCombo = 0;
  private nearMissComboTimer = 0;
  private nearMissBonusScore = 0;
  private nearMissLabel: string | null = null;
  private nearMissTimer = 0;
  private shibaActivations = 0;
  private carDistance = 0;
  private trainJumps = 0;
  private baseRushMask = 0;
  private runRushMaskEarned = 0;
  private rushCompletedThisRun = false;
  private tutorialEnabled = !loadTutorialDone();
  private tutorialStep: TutorialStep | null = null;
  private recordGateMeters: number | null = null;
  private currentBiomeName = 'Sakura Ueno';

  constructor(
    container: HTMLElement,
    initialQuality: QualityLevel,
    initialMuted: boolean,
    onHudChange: (snapshot: HudSnapshot) => void,
    onRunFinished?: (telemetry: RunTelemetry) => void,
    onRushWordCompleted?: () => void,
  ) {
    this.container = container;
    this.onHudChange = onHudChange;
    this.onRunFinished = onRunFinished;
    this.onRushWordCompleted = onRushWordCompleted;
    this.sound = new SoundEngine(initialMuted, loadMusicVolume(), loadSfxVolume());

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
    this.camera = new THREE.PerspectiveCamera(58, width / height, 0.2, 245);
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

    this.car = new ConvertibleCar3D(this.shadowTex);
    this.scene.add(this.car.root);

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

  public setFpsLimit(fps: FpsLimit): void {
    this.fpsLimit = fps;
  }

  public setMusicVolume(vol: number): void {
    this.sound.setMusicVolume(vol);
  }

  public setSfxVolume(vol: number): void {
    this.sound.setSfxVolume(vol);
  }

  public setTutorialEnabled(enabled: boolean): void {
    this.tutorialEnabled = enabled;
    if (!enabled) {
      this.tutorialStep = null;
      this.emitHud();
    }
  }

  public setRushLettersMask(mask: number): void {
    this.baseRushMask = mask & 0x0f;
    if (this.phase === 'TITLE') {
      this.emitHud();
    }
  }

  public playGachaSound(): void {
    this.sound.unlock();
    this.sound.playGachaSpin();
  }

  public setLoadout(
    heroId: string,
    companionId: string,
    carId = 'yellow_cab_gt',
  ): void {
    this.equippedHero = getHeroById(heroId);
    this.equippedCompanion = getCompanionById(companionId);
    this.equippedCar = getCarById(carId);
    this.runner.setSkin(heroId);
    this.shiba.setSkin(companionId);
    this.car.setCarModel(carId);
    this.emitHud();
  }

  public setProfileStats(bestScore: number, activeMultiplier: number): void {
    this.bestScore = Math.max(this.bestScore, bestScore);
    this.baseAccountMultiplier = Math.max(1, activeMultiplier);
    if (this.phase === 'TITLE') {
      this.scoreMultiplier = this.baseAccountMultiplier;
      this.emitHud();
    }
  }

  public setUpgrades(magnetLv: number, carLv: number, shieldLv: number, scoreLv: number): void {
    this.upgradeLevels = {
      magnet: Math.max(1, Math.min(5, magnetLv || 1)),
      car: Math.max(1, Math.min(5, carLv || 1)),
      shield: Math.max(1, Math.min(5, shieldLv || 1)),
      score: Math.max(1, Math.min(5, scoreLv || 1)),
    };
  }

  public setHapticsEnabled(enabled: boolean): void {
    this.hapticsEnabled = enabled;
  }

  public playUpgradeSound(): void {
    this.sound.unlock();
    this.sound.playUpgrade();
    this.triggerHaptic('light');
  }

  private triggerHaptic(kind: 'light' | 'medium' | 'heavy'): void {
    if (!this.hapticsEnabled) return;
    if (window.AndroidBridge?.triggerHaptic) {
      window.AndroidBridge.triggerHaptic(kind);
    } else if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(kind === 'heavy' ? 45 : kind === 'medium' ? 25 : 12);
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

  public playCashSound(): void {
    this.sound.unlock();
    this.sound.playUiCash();
  }

  public playUnlockSound(): void {
    this.sound.unlock();
    this.sound.playUnlock();
  }

  public playChestSound(): void {
    this.sound.unlock();
    this.sound.playChestOpen();
  }

  public activateCarMode(): void {
    if (this.phase !== 'PLAYING') return;
    if (this.fuelUnits < GAME_CONSTANTS.FUEL_MAX_UNITS || this.carRemaining > 0) return;

    this.sound.unlock();
    this.sound.playCarTurbo();
    this.triggerHaptic('medium');
    this.fuelUnits = 0;
    const upgradeExtraCar = (this.upgradeLevels.car - 1) * 1.5;
    const totalDuration =
      GAME_CONSTANTS.CAR_TURBO_DURATION_SEC + this.equippedCar.extraDurationSec + upgradeExtraCar;
    this.carRemaining = totalDuration;
    this.sakuraTokens += this.equippedCar.sakuraOnActivate;
    this.slideTimer = 0;
    this.staminaLife = 2;
    this.lifeRegenTimer = 0;
    this.car.setCarModel(this.equippedCar.id);
    this.car.setVisible(true);
    this.pools.emitBurstPublic(this.runnerX, 0.8, this.runnerZ, 24, this.equippedCar.neonHex);
    this.shakeIntensity = 0.25;
    this.milestoneLabel = `${this.equippedCar.name.toUpperCase()} ${Math.round(totalDuration)}s !`;
    this.milestoneTimer = 1.6;
    this.emitHud();
  }

  public activateHeroPower(): void {
    if (this.phase !== 'PLAYING') return;
    const spec = this.equippedHero.power;
    if (this.heroPowerCharge < spec.chargeCostSec || this.heroPowerActiveTimer > 0) return;

    this.sound.unlock();
    this.sound.playPowerup();
    this.triggerHaptic('medium');
    this.heroPowerCharge = 0;
    this.heroPowerActiveTimer = spec.activeDurationSec;
    this.runner.setPowerAuraActive(true, this.equippedHero.accentHex);

    const magnetBonus =
      (spec.passiveType === 'MAGNET_DURATION' ? spec.passiveValue : 0) +
      (this.upgradeLevels.magnet - 1) * 2.5;

    switch (spec.activeEffect) {
      case 'SHIELD_SURGE':
        this.hasShield = true;
        this.runner.setShieldActive(true);
        this.pools.destroyObstaclesAhead(this.runnerZ, 22);
        this.magnetTimer = Math.max(this.magnetTimer, 3.5 + magnetBonus);
        break;
      case 'MAGNET_WAVE':
        this.magnetTimer = Math.max(
          this.magnetTimer,
          spec.activeDurationSec + magnetBonus,
        );
        break;
      case 'SCORE_OVERDRIVE':
        this.overdriveMultFactor = 2;
        break;
      case 'SONIC_BLAST':
        this.pools.destroyObstaclesAhead(this.runnerZ, 42);
        this.magnetTimer = Math.max(this.magnetTimer, 6.0 + magnetBonus);
        this.shakeIntensity = 0.35;
        break;
      case 'FUEL_INJECT':
        this.fuelUnits = Math.min(GAME_CONSTANTS.FUEL_MAX_UNITS, this.fuelUnits + 50);
        this.invincibleSprintTimer = Math.max(this.invincibleSprintTimer, spec.activeDurationSec);
        this.pools.destroyObstaclesAhead(this.runnerZ, 18);
        break;
      case 'SAKURA_BURST':
        this.sakuraTokens += 3;
        this.invincibleSprintTimer = Math.max(this.invincibleSprintTimer, spec.activeDurationSec);
        this.magnetTimer = Math.max(this.magnetTimer, spec.activeDurationSec + magnetBonus);
        break;
      case 'SUPERNOVA':
        this.hasShield = true;
        this.runner.setShieldActive(true);
        this.magnetTimer = Math.max(this.magnetTimer, spec.activeDurationSec + magnetBonus);
        this.pools.destroyObstaclesAhead(this.runnerZ, 44);
        this.shakeIntensity = 0.32;
        break;
    }

    this.pools.emitBurstPublic(this.runnerX, 1.1, this.runnerZ, 20, this.equippedHero.accentHex);
    this.milestoneLabel = `${spec.activeName.toUpperCase()} !`;
    this.milestoneTimer = 1.6;
    this.emitHud();
  }

  public activateShibaPower(): void {
    if (this.phase !== 'PLAYING') return;
    const spec = this.equippedCompanion.power;
    if (this.shibaPowerCharge < spec.chargeCostSec || this.shibaPowerActiveTimer > 0) return;

    this.sound.unlock();
    this.sound.playPowerup();
    this.triggerHaptic('medium');
    this.shibaActivations++;
    this.shibaPowerCharge = 0;
    this.shibaPowerActiveTimer = spec.activeDurationSec;
    this.shiba.setPowerAuraActive(true, this.equippedCompanion.coatHex);

    const magnetBonus =
      (this.equippedHero.power.passiveType === 'MAGNET_DURATION'
        ? this.equippedHero.power.passiveValue
        : 0) +
      (spec.passiveType === 'MAGNET_DURATION' ? spec.passiveValue : 0) +
      (this.upgradeLevels.magnet - 1) * 2.5;

    switch (spec.activeEffect) {
      case 'COIN_X2':
        this.shibaCoinMultFactor = 2;
        if (this.equippedCompanion.id === 'shiba_astral') {
          this.magnetTimer = Math.max(this.magnetTimer, 8 + magnetBonus);
        }
        break;
      case 'MAGNET_AURA':
        this.magnetTimer = Math.max(this.magnetTimer, spec.activeDurationSec + magnetBonus);
        break;
      case 'SHIELD_BARK':
        this.hasShield = true;
        this.runner.setShieldActive(true);
        this.magnetTimer = Math.max(this.magnetTimer, 6 + magnetBonus);
        this.pools.destroyObstaclesAhead(this.runnerZ, 20);
        break;
      case 'FUEL_FETCH':
        this.fuelUnits = Math.min(GAME_CONSTANTS.FUEL_MAX_UNITS, this.fuelUnits + 40);
        this.magnetTimer = Math.max(this.magnetTimer, 6 + magnetBonus);
        break;
      case 'SAKURA_HOWL':
        this.shibaCoinMultFactor = 2;
        this.sakuraTokens += 3;
        this.magnetTimer = Math.max(this.magnetTimer, 6 + magnetBonus);
        break;
      case 'SHOCKWAVE_DASH':
        this.pools.destroyObstaclesAhead(this.runnerZ, 38);
        this.invincibleSprintTimer = Math.max(this.invincibleSprintTimer, spec.activeDurationSec);
        if (this.equippedCompanion.id === 'shiba_flame') {
          this.fuelUnits = Math.min(GAME_CONSTANTS.FUEL_MAX_UNITS, this.fuelUnits + 35);
        }
        this.shakeIntensity = 0.28;
        break;
    }

    const shibaPos = this.shiba.root.position;
    this.pools.emitBurstPublic(
      shibaPos.x,
      Math.max(0.6, shibaPos.y + 0.5),
      shibaPos.z,
      18,
      this.equippedCompanion.coatHex,
    );
    this.milestoneLabel = `${this.equippedCompanion.name.toUpperCase()} : ${spec.activeName.toUpperCase()} !`;
    this.milestoneTimer = 1.7;
    this.emitHud();
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
    this.sound.setBgmState(true, this.worldSpeed / GAME_CONSTANTS.BASE_SPEED, false);
    this.emitHud();
  }

  public restartRun(boosts?: Partial<ActiveRunBoosts>): void {
    this.startRun(boosts);
  }

  public pauseRun(): void {
    if (this.phase === 'PLAYING') {
      this.phase = 'PAUSED';
      this.sound.setBgmState(false);
      this.emitHud();
    }
  }

  public resumeRun(): void {
    if (this.phase === 'PAUSED') {
      this.sound.unlock();
      this.phase = 'PLAYING';
      this.lastFrameMs = performance.now();
      this.sound.setBgmState(true, this.worldSpeed / GAME_CONSTANTS.BASE_SPEED, this.carRemaining > 0);
      this.emitHud();
    }
  }

  public returnToTitle(): void {
    this.simulationPaused = false;
    this.resetRunState();
    this.phase = 'TITLE';
    this.sound.setBgmState(false);
    this.emitHud();
  }

  public reviveRun(): void {
    if (this.phase !== 'GAME_OVER' || this.revivedUsed) return;
    this.sound.unlock();
    this.sound.playRevive();
    this.triggerHaptic('medium');
    this.revivedUsed = true;
    this.phase = 'PLAYING';
    this.sound.setBgmState(true, this.worldSpeed / GAME_CONSTANTS.BASE_SPEED, this.carRemaining > 0);
    this.staminaLife = 2;
    this.lifeRegenTimer = 0;
    this.bumpInvulnTimer = 3.0;
    this.runnerY = 0;
    this.velocityY = 0;
    this.isGrounded = true;
    this.slideTimer = 0;
    this.pools.destroyObstaclesAhead(this.runnerZ + 3, 38);
    this.pools.emitBurstPublic(this.runnerX, 1.1, this.runnerZ, 26, 0xfacc15);
    this.milestoneLabel = 'SECONDE CHANCE !';
    this.milestoneTimer = 1.8;
    this.lastFrameMs = performance.now();
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

    const passive = this.equippedHero.power;
    const shibaSpec = this.equippedCompanion.power;
    const startShieldPassive =
      passive.passiveType === 'START_SHIELD' || shibaSpec.passiveType === 'START_SHIELD';
    const magnetDurationBonus =
      (passive.passiveType === 'MAGNET_DURATION' ? passive.passiveValue : 0) +
      (shibaSpec.passiveType === 'MAGNET_DURATION' ? shibaSpec.passiveValue : 0) +
      (this.upgradeLevels.magnet - 1) * 2.5;

    this.consumedMagnet = Boolean(boosts?.useMagnet);
    this.consumedShield = Boolean(boosts?.useShield);
    this.consumedMultiplier = Boolean(boosts?.useMultiplier);
    this.consumedHeadStart = Boolean(boosts?.useHeadStart);

    this.magnetTimer = this.consumedMagnet ? 12.0 + magnetDurationBonus : 0;
    this.hasShield = this.consumedShield || startShieldPassive;
    this.headStartTimer = this.consumedHeadStart ? 4.5 : 0;
    this.scoreMultiplier = this.consumedMultiplier ? 5 : this.baseAccountMultiplier;
    this.runner.setShieldActive(this.hasShield);
    this.runner.setPowerAuraActive(false);
    this.shiba.setPowerAuraActive(false);

    this.fuelUnits = 0;
    this.carRemaining = 0;
    this.car.setVisible(false);

    this.heroPowerCharge = passive.chargeCostSec * 0.45; // Start 45% charged for snappy gameplay
    this.heroPowerActiveTimer = 0;
    this.shibaPowerCharge = shibaSpec.chargeCostSec; // Shiba power ready immediately on run start!
    this.shibaPowerActiveTimer = 0;
    this.shibaCoinMultFactor = 1;
    this.invincibleSprintTimer = 0;
    this.overdriveMultFactor = 1;
    this.coinBonusAccumulator = 0;
    this.revivedUsed = false;
    this.nearMissCount = 0;
    this.nearMissCombo = 0;
    this.nearMissComboTimer = 0;
    this.nearMissBonusScore = 0;
    this.nearMissLabel = null;
    this.nearMissTimer = 0;
    this.shibaActivations = 0;
    this.carDistance = 0;
    this.trainJumps = 0;
    this.runRushMaskEarned = 0;
    this.rushCompletedThisRun = false;
    this.tutorialStep = this.tutorialEnabled ? 'SWIPE_LR' : null;
    this.currentBiomeName = 'Sakura Ueno';
    this.environment.setBiomeDistance(0, 10);

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
    this.milestoneLabel = this.consumedHeadStart
      ? 'TURBO DÉPART !'
      : startShieldPassive
        ? 'BOUCLIER PASSIF ACTIF !'
        : null;
    this.milestoneTimer = this.consumedHeadStart || startShieldPassive ? 1.5 : 0;
    this.runCoinGoalAnnounced = false;
    this.hitstopTimer = 0;
    this.shakeIntensity = 0;
    this.introSweepTimer = 0;

    this.pursuerGroup.visible = false;
    this.runner.root.position.set(0, 0, 0);
    this.runner.root.rotation.y = 0;
    this.car.root.position.set(0, 0, 0);
    this.shiba.reset(0, 0);
    this.shiba.root.rotation.y = 0;
    this.environment.reset();
    this.pools.reset();

    if (this.bestScore > 0) {
      const targetMeters = Math.max(
        45,
        Math.round(
          this.bestScore / (GAME_CONSTANTS.DISTANCE_SCORE_RATE * Math.max(1, this.baseAccountMultiplier)),
        ),
      );
      this.recordGateMeters = targetMeters;
      this.pools.setRecordTargetMeters(targetMeters);
    } else {
      this.recordGateMeters = null;
      this.pools.setRecordTargetMeters(null);
    }
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
          this.triggerHaptic('light');
        }
        if (this.tutorialStep === 'SWIPE_LR') {
          this.tutorialStep = 'JUMP';
          this.emitHud();
        }
        break;
      case 'RIGHT':
        if (this.targetLane < 1) {
          this.previousLane = this.targetLane;
          this.targetLane = (this.targetLane + 1) as LaneIndex;
          this.sound.playLaneSwitch();
          this.triggerHaptic('light');
        }
        if (this.tutorialStep === 'SWIPE_LR') {
          this.tutorialStep = 'JUMP';
          this.emitHud();
        }
        break;
      case 'JUMP':
        this.jumpBufferTimer = GAME_CONSTANTS.INPUT_BUFFER_SEC;
        if (this.tutorialStep === 'JUMP') {
          this.tutorialStep = 'SLIDE';
          this.emitHud();
        }
        break;
      case 'SLIDE':
        this.slideBufferTimer = GAME_CONSTANTS.INPUT_BUFFER_SEC;
        if (!this.isGrounded) {
          this.velocityY = Math.min(this.velocityY, GAME_CONSTANTS.FAST_FALL_VELOCITY);
        }
        if (this.tutorialStep === 'SLIDE') {
          this.tutorialStep = null;
          this.tutorialEnabled = false;
          saveTutorialDone(true);
          this.emitHud();
        }
        break;
      case 'ACTIVATE_CAR':
        this.activateCarMode();
        break;
      case 'ACTIVATE_POWER':
        this.activateHeroPower();
        break;
      case 'ACTIVATE_SHIBA_POWER':
        this.activateShibaPower();
        break;
    }
  };

  private handleResize = (): void => {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.baseCameraFov = w / h < 0.7 ? 62 : 56;
    this.camera.fov = this.baseCameraFov;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  };

  private startLoop(): void {
    this.lastFrameMs = performance.now();
    this.lastRenderMs = this.lastFrameMs;
    const tick = (nowMs: number) => {
      this.rafId = requestAnimationFrame(tick);
      if (this.simulationPaused && this.phase === 'TITLE') {
        return;
      }
      if (this.fpsLimit === 30 && nowMs - this.lastRenderMs < 31) {
        return;
      }
      this.lastRenderMs = nowMs;
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
      const lobbySpeed = 11.4;
      this.lobbyScrollZ -= lobbySpeed * dt;
      this.environment.update(dt, this.lobbyScrollZ, lobbySpeed);
      this.runner.root.position.set(0.08, 0, this.lobbyScrollZ);
      this.runner.root.rotation.y = -0.14;
      this.runner.update(dt, 'TITLE', lobbySpeed, 0, 0);
      this.shiba.root.rotation.y = -0.12;
      this.shiba.update(dt, 'TITLE', lobbySpeed, 0.08, 0, this.lobbyScrollZ);

      const t = performance.now() * 0.00055;
      this.camera.position.set(
        0.28 + Math.sin(t) * 0.16,
        2.06 + Math.cos(t * 0.8) * 0.05,
        this.lobbyScrollZ + 5.75,
      );
      this.camera.lookAt(0.04, 1.36, this.lobbyScrollZ - 20);
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

    const passive = this.equippedHero.power;
    const shibaSpec = this.equippedCompanion.power;
    const hasteFactor =
      1 +
      (passive.passiveType === 'SKILL_HASTE' ? passive.passiveValue : 0) +
      (shibaSpec.passiveType === 'SKILL_HASTE' ? shibaSpec.passiveValue : 0);

    // Car Turbo Countdown
    if (this.carRemaining > 0) {
      this.carRemaining = Math.max(0, this.carRemaining - dt);
      if (this.carRemaining === 0) {
        this.car.setVisible(false);
        this.bumpInvulnTimer = 1.0; // safe exit grace window
        this.sound.playPowerdown();
        this.milestoneLabel = 'FIN TURBO VOITURE';
        this.milestoneTimer = 1.2;
      }
    }

    // Dynamic Hero Active Skill & Charge
    if (this.heroPowerActiveTimer > 0) {
      this.heroPowerActiveTimer = Math.max(0, this.heroPowerActiveTimer - dt);
      if (this.heroPowerActiveTimer === 0) {
        this.overdriveMultFactor = 1;
        this.runner.setPowerAuraActive(false);
      }
    } else {
      this.heroPowerCharge = Math.min(
        passive.chargeCostSec,
        this.heroPowerCharge + dt * hasteFactor,
      );
    }

    // Dynamic Shiba Companion Active Skill & Charge
    if (this.shibaPowerActiveTimer > 0) {
      this.shibaPowerActiveTimer = Math.max(0, this.shibaPowerActiveTimer - dt);
      if (this.shibaPowerActiveTimer === 0) {
        this.shibaCoinMultFactor = 1;
        this.shiba.setPowerAuraActive(false);
      }
    } else {
      this.shibaPowerCharge = Math.min(
        shibaSpec.chargeCostSec,
        this.shibaPowerCharge + dt * hasteFactor,
      );
    }

    if (this.invincibleSprintTimer > 0) {
      this.invincibleSprintTimer = Math.max(0, this.invincibleSprintTimer - dt);
    }

    // Speed Progression
    if (this.carRemaining > 0) {
      this.worldSpeed = Math.max(
        this.worldSpeed,
        GAME_CONSTANTS.CAR_TURBO_SPEED + this.equippedCar.turboSpeedBonus,
      );
    } else if (this.headStartTimer > 0) {
      this.headStartTimer = Math.max(0, this.headStartTimer - dt);
      this.worldSpeed = 27.5;
    } else if (this.invincibleSprintTimer > 0) {
      this.worldSpeed = Math.max(this.worldSpeed, 26.5);
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
    if (this.carRemaining > 0) {
      this.carDistance += deltaZ;
    }
    if (this.tutorialStep !== null && this.distance >= 95) {
      this.tutorialStep = null;
      this.tutorialEnabled = false;
      saveTutorialDone(true);
    }
    this.sound.setBgmState(true, this.worldSpeed / GAME_CONSTANTS.BASE_SPEED, this.carRemaining > 0);

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

    if (this.slideBufferTimer > 0 && this.isGrounded && this.carRemaining <= 0) {
      this.slideTimer = GAME_CONSTANTS.SLIDE_DURATION;
      this.slideBufferTimer = 0;
      this.slides++;
      this.sound.playSlide();
    }

    if (this.slideTimer > 0) {
      this.slideTimer = Math.max(0, this.slideTimer - dt);
    }

    const isCarActive = this.carRemaining > 0;
    const supportFloorY = isCarActive
      ? 0
      : this.pools.getSupportFloorY(this.runnerX, this.runnerY, this.runnerZ);

    if (this.isGrounded) {
      if (supportFloorY > this.runnerY + 0.01) {
        // Climbing smoothly up a train ramp
        this.runnerY = supportFloorY;
      } else if (this.runnerY > supportFloorY + 0.14) {
        // Stepped off the end of a train roof -> enter air fall with coyote grace
        this.isGrounded = false;
        this.coyoteTimer = GAME_CONSTANTS.COYOTE_TIME_SEC;
      } else {
        this.runnerY = supportFloorY;
      }
    }

    if (!this.isGrounded) {
      const gravity =
        this.velocityY < 0
          ? GAME_CONSTANTS.GRAVITY * GAME_CONSTANTS.FALL_GRAVITY_MULTIPLIER
          : GAME_CONSTANTS.GRAVITY;
      this.velocityY -= gravity * dt;
      this.runnerY += this.velocityY * dt;
      if (this.runnerY <= supportFloorY) {
        if (supportFloorY > 0.5) {
          this.trainJumps++;
        }
        this.runnerY = supportFloorY;
        this.velocityY = 0;
        this.isGrounded = true;
        this.runner.triggerLandSquash();
        this.sound.playLand();
      }
    }

    this.runner.root.position.set(this.runnerX, this.runnerY, this.runnerZ);
    if (isCarActive) {
      this.car.root.position.set(this.runnerX, this.runnerY, this.runnerZ);
      this.car.update(dt, this.worldSpeed, lateralDelta);
    }

    const animState: RunnerAnimState = isCarActive
      ? 'SEATED_CAR'
      : !this.isGrounded
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

    const nextBiome = this.environment.setBiomeDistance(this.distance, dt);
    if (nextBiome !== this.currentBiomeName) {
      this.currentBiomeName = nextBiome;
      this.milestoneLabel = `DISTRICT : ${nextBiome.toUpperCase()}`;
      this.milestoneTimer = 2.0;
    }

    this.environment.update(dt, this.runnerZ, this.worldSpeed);
    const magnetPullOn = this.magnetTimer > 0 || isCarActive;
    const currentFuelPct = Math.round((this.fuelUnits / GAME_CONSTANTS.FUEL_MAX_UNITS) * 100);
    const activeRushMask = (this.baseRushMask | this.runRushMaskEarned) & 0x0f;
    const poolFrame = this.pools.update(
      dt,
      this.runnerZ,
      this.worldSpeed,
      this.runnerX,
      this.runnerY,
      magnetPullOn,
      {
        fuelPct: currentFuelPct,
        carActive: isCarActive,
        hasShield: this.hasShield,
        magnetActive: this.magnetTimer > 0,
      },
      activeRushMask,
    );
    if (poolFrame.passedMovingTrain) {
      this.sound.playTrainPass();
    }
    if (poolFrame.crossedRecordGate) {
      this.recordGateMeters = null;
      this.sound.playRecordBreak();
      this.triggerHaptic('medium');
      this.milestoneLabel = 'BORNE TON RECORD FRANCHIE !';
      this.milestoneTimer = 2.0;
    }

    const isActivelySliding = this.slideTimer > 0 && this.isGrounded && !isCarActive;
    const isChangingLane = Math.abs(this.runnerX - targetX) > 0.18;
    const canTakeBump = this.staminaLife >= 2 && this.bumpInvulnTimer <= 0;

    const {
      hitKind,
      coinsCollected,
      sakuraCollected,
      fuelCollected,
      pickedPowerup,
      nearMisses,
      rushMaskCollected,
    } = this.pools.checkCollisions(
      this.runnerX,
      this.runnerY,
      isActivelySliding,
      this.runnerZ,
      isChangingLane,
      canTakeBump,
      this.bumpInvulnTimer > 0,
    );

    if (coinsCollected > 0) {
      const carCoinRate = isCarActive ? this.equippedCar.coinBonusRate : 0;
      const coinBonusRate =
        (passive.passiveType === 'COIN_BONUS' ? passive.passiveValue : 0) +
        (shibaSpec.passiveType === 'COIN_BONUS' ? shibaSpec.passiveValue : 0) +
        carCoinRate;
      const multipliedCoins = coinsCollected * this.shibaCoinMultFactor;
      this.coinBonusAccumulator += multipliedCoins * coinBonusRate;
      const bonusWhole = Math.floor(this.coinBonusAccumulator);
      this.coinBonusAccumulator -= bonusWhole;
      this.coins += multipliedCoins + bonusWhole;
      if (this.heroPowerActiveTimer <= 0) {
        this.heroPowerCharge = Math.min(
          passive.chargeCostSec,
          this.heroPowerCharge + coinsCollected * 0.55 * hasteFactor,
        );
      }
      if (this.shibaPowerActiveTimer <= 0) {
        this.shibaPowerCharge = Math.min(
          shibaSpec.chargeCostSec,
          this.shibaPowerCharge + coinsCollected * 0.45 * hasteFactor,
        );
      }
      this.sound.playCoin();
      if (!this.runCoinGoalAnnounced && this.coins >= 500) {
        this.runCoinGoalAnnounced = true;
        this.milestoneLabel = 'OBJECTIF ACCOMPLI : 500 PIÈCES !';
        this.milestoneTimer = 1.9;
      }
    }

    if (sakuraCollected > 0) {
      this.sakuraTokens += sakuraCollected;
      this.sound.playPowerup();
      this.triggerHaptic('light');
    }

    if (rushMaskCollected > 0) {
      this.runRushMaskEarned |= rushMaskCollected;
      const combinedMask = (this.baseRushMask | this.runRushMaskEarned) & 0x0f;
      if (!this.rushCompletedThisRun && combinedMask === 0x0f) {
        this.rushCompletedThisRun = true;
        this.baseRushMask = 0;
        this.sound.playWordComplete();
        this.triggerHaptic('medium');
        this.milestoneLabel = 'MOT R-U-S-H COMPLÉTÉ ! +400 PIÈCES & +25 GEMMES';
        this.milestoneTimer = 2.4;
        this.onRushWordCompleted?.();
      } else {
        this.sound.playLetterCollect();
        this.triggerHaptic('light');
        this.milestoneLabel = 'LETTRE R-U-S-H COLLECTÉE !';
        this.milestoneTimer = 1.25;
      }
    }

    if (fuelCollected > 0) {
      const fuelBonus =
        1 +
        (passive.passiveType === 'FUEL_EFFICIENCY' ? passive.passiveValue : 0) +
        (shibaSpec.passiveType === 'FUEL_EFFICIENCY' ? shibaSpec.passiveValue : 0);
      const addedFuel = Math.round(
        fuelCollected * GAME_CONSTANTS.FUEL_CAN_UNITS * fuelBonus,
      );
      const wasReady = this.fuelUnits >= GAME_CONSTANTS.FUEL_MAX_UNITS;
      this.fuelUnits = Math.min(GAME_CONSTANTS.FUEL_MAX_UNITS, this.fuelUnits + addedFuel);
      this.sound.playPowerup();
      this.triggerHaptic('light');
      if (!wasReady && this.fuelUnits >= GAME_CONSTANTS.FUEL_MAX_UNITS) {
        this.milestoneLabel = 'RÉSERVOIR PLEIN ! VOITURE PRÊTE';
        this.milestoneTimer = 1.8;
        this.triggerHaptic('medium');
      }
    }

    if (this.nearMissComboTimer > 0) {
      this.nearMissComboTimer = Math.max(0, this.nearMissComboTimer - dt);
      if (this.nearMissComboTimer === 0) {
        this.nearMissCombo = 0;
      }
    }

    if (nearMisses > 0) {
      this.nearMissCount += nearMisses;
      const comboRes = computeNearMissCombo(
        this.nearMissCombo,
        this.nearMissComboTimer,
        nearMisses,
      );
      this.nearMissCombo = comboRes.nextCombo;
      this.nearMissComboTimer = comboRes.nextTimerSec;
      this.nearMissBonusScore += comboRes.addedBonusScore;

      if (this.heroPowerActiveTimer <= 0) {
        this.heroPowerCharge = Math.min(
          passive.chargeCostSec,
          this.heroPowerCharge + passive.chargeCostSec * comboRes.extraChargeRatio,
        );
      }
      if (this.shibaPowerActiveTimer <= 0) {
        this.shibaPowerCharge = Math.min(
          shibaSpec.chargeCostSec,
          this.shibaPowerCharge + shibaSpec.chargeCostSec * comboRes.extraChargeRatio,
        );
      }
      this.nearMissLabel =
        comboRes.nextCombo > 1
          ? `FRÔLEMENT ×${comboRes.nextCombo} ! +${comboRes.addedBonusScore} PTS`
          : `FRÔLEMENT ! +${comboRes.addedBonusScore} PTS · +8% POUVOIR`;
      this.nearMissTimer = 1.45;
      this.sound.playNearMiss();
      this.triggerHaptic('light');
    }

    if (this.nearMissTimer > 0) {
      this.nearMissTimer = Math.max(0, this.nearMissTimer - dt);
      if (this.nearMissTimer === 0) {
        this.nearMissLabel = null;
      }
    }

    const magDurBonus =
      (passive.passiveType === 'MAGNET_DURATION' ? passive.passiveValue : 0) +
      (shibaSpec.passiveType === 'MAGNET_DURATION' ? shibaSpec.passiveValue : 0) +
      (this.upgradeLevels.magnet - 1) * 2.5;
    if (pickedPowerup === 'MAGNET') {
      this.magnetTimer = Math.max(this.magnetTimer, 11.0 + magDurBonus);
      this.milestoneLabel = 'AIMANT ACTIF !';
      this.milestoneTimer = 1.4;
      this.sound.playPowerup();
      this.triggerHaptic('light');
    } else if (pickedPowerup === 'SHIELD') {
      this.hasShield = true;
      this.runner.setShieldActive(true);
      this.milestoneLabel = 'BOUCLIER DOJO !';
      this.milestoneTimer = 1.4;
      this.sound.playPowerup();
      this.triggerHaptic('light');
    }

    const carScoreBonus = isCarActive ? this.equippedCar.scoreBonusRate : 0;
    const upgradeScoreBonus = (this.upgradeLevels.score - 1) * 0.12;
    const scorePassiveBonus =
      1 +
      (passive.passiveType === 'SCORE_BOOST' ? passive.passiveValue : 0) +
      (shibaSpec.passiveType === 'SCORE_BOOST' ? shibaSpec.passiveValue : 0) +
      carScoreBonus +
      upgradeScoreBonus;
    const effectiveMultiplier = this.scoreMultiplier * this.overdriveMultFactor;
    this.score = Math.floor(
      (this.distance * GAME_CONSTANTS.DISTANCE_SCORE_RATE +
        this.coins * GAME_CONSTANTS.COIN_SCORE_VALUE +
        this.nearMissBonusScore) *
        effectiveMultiplier *
        scorePassiveBonus,
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
      this.milestoneLabel = `OBJECTIF ${this.nextMilestoneMeters} m ACCOMPLI !`;
      this.milestoneTimer = 1.6;
      this.nextMilestoneMeters += 250;
    }

    // Invincible Car Turbo, Headstart, or Active Hero Sprint smashes obstacles cleanly!
    const isInvincibleSmash =
      isCarActive || this.headStartTimer > 0 || this.invincibleSprintTimer > 0;
    if ((hitKind === 'CRASH' || hitKind === 'BUMP') && isInvincibleSmash) {
      this.pools.clearObstacleNearZ(this.runnerZ);
      this.pools.emitBurstPublic(this.runnerX, 1.2, this.runnerZ, 20, 0xf97316);
      this.shakeIntensity = 0.25;
      this.sound.playBump();
      this.triggerHaptic('medium');
    } else if (hitKind === 'CRASH' && this.hasShield) {
      this.hasShield = false;
      this.runner.setShieldActive(false);
      this.bumpInvulnTimer = 1.25 + (this.upgradeLevels.shield - 1) * 0.6;
      this.pools.clearObstacleNearZ(this.runnerZ);
      this.pools.emitBurstPublic(this.runnerX, 1.1, this.runnerZ, 20, 0x38bdf8);
      this.shakeIntensity = 0.35;
      this.milestoneLabel = 'BOUCLIER BRISÉ !';
      this.milestoneTimer = 1.3;
      this.sound.playShieldBreak();
      this.triggerHaptic('medium');
      this.emitHud();
    } else if (hitKind === 'BUMP') {
      this.staminaLife = 1;
      this.lifeRegenTimer = Math.max(
        1.8,
        GAME_CONSTANTS.LIFE_REGEN_SEC - (this.upgradeLevels.shield - 1) * 0.45,
      );
      this.bumpInvulnTimer = 0.35;
      this.targetLane = this.previousLane;
      this.hitstopTimer = 0.03;
      this.shakeIntensity = 0.35;
      this.sound.playBump();
      this.triggerHaptic('medium');
      this.updatePursuerAura();
      this.emitHud();
    } else if (hitKind === 'CRASH') {
      this.triggerHaptic('heavy');
      this.triggerGameOver();
      return;
    }

    this.keyLight.position.set(this.runnerX + 10, 18, this.runnerZ + 12);
    this.keyLight.target.position.set(this.runnerX, 0, this.runnerZ - 8);

    this.updateCamera(dt, lateralDelta);

    this.hudSyncAccumulator += dt;
    if (
      coinsCollected > 0 ||
      sakuraCollected > 0 ||
      fuelCollected > 0 ||
      nearMisses > 0 ||
      rushMaskCollected > 0 ||
      poolFrame.crossedRecordGate ||
      pickedPowerup ||
      staminaChanged ||
      this.hudSyncAccumulator >= 0.05
    ) {
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
    const active = this.staminaLife < 2 && this.phase === 'PLAYING' && this.carRemaining <= 0;
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
    const carCamPull = this.carRemaining > 0 ? 1.1 : 0;
    const desiredX = this.runnerX * 0.68;
    const desiredY = 4.35 + carCamPull * 0.35 + this.runnerY * 0.45;
    const desiredZ = this.runnerZ + 7.5 + carCamPull;

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

    // Dynamic FOV expansion during Car Turbo, HeadStart, Sprint or high speed
    const speedRatio = THREE.MathUtils.clamp(
      (this.worldSpeed - GAME_CONSTANTS.BASE_SPEED) /
        (GAME_CONSTANTS.MAX_SPEED - GAME_CONSTANTS.BASE_SPEED),
      0,
      1,
    );
    const fovBoost =
      this.carRemaining > 0
        ? 8.5
        : this.headStartTimer > 0 || this.invincibleSprintTimer > 0
          ? 7.0
          : speedRatio * 5.0;
    const targetFov = this.baseCameraFov + fovBoost;
    const nextFov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 1 - Math.exp(-5.0 * dt));
    if (Math.abs(nextFov - this.camera.fov) > 0.04) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }
  }

  private triggerGameOver(): void {
    this.phase = 'GAME_OVER';
    this.sound.setBgmState(false);
    this.car.setVisible(false);
    this.carRemaining = 0;
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
      nearMisses: this.nearMissCount,
      shibaActivations: this.shibaActivations,
      carDistance: Math.floor(this.carDistance),
      trainJumps: this.trainJumps,
      rushLettersMaskEarned: this.runRushMaskEarned,
    });
  }

  private emitHud(): void {
    const spec = this.equippedHero.power;
    const shibaSpec = this.equippedCompanion.power;
    const fuelPct = Math.round(
      THREE.MathUtils.clamp(
        (this.fuelUnits / GAME_CONSTANTS.FUEL_MAX_UNITS) * 100,
        0,
        100,
      ),
    );
    const chargePct = Math.round(
      THREE.MathUtils.clamp((this.heroPowerCharge / spec.chargeCostSec) * 100, 0, 100),
    );
    const shibaChargePct = Math.round(
      THREE.MathUtils.clamp((this.shibaPowerCharge / shibaSpec.chargeCostSec) * 100, 0, 100),
    );

    const speedLinesIntensity =
      this.phase === 'PLAYING'
        ? THREE.MathUtils.clamp(
            this.carRemaining > 0 || this.headStartTimer > 0 || this.invincibleSprintTimer > 0
              ? 1
              : (this.worldSpeed - 20) / 13,
            0,
            1,
          )
        : 0;

    this.onHudChange({
      phase: this.phase,
      score: this.score,
      distance: Math.floor(this.distance),
      coins: this.coins,
      sakuraTokens: this.sakuraTokens,
      speedMultiplier: Number((this.worldSpeed / GAME_CONSTANTS.BASE_SPEED).toFixed(1)),
      scoreMultiplier: this.scoreMultiplier * this.overdriveMultFactor,
      bestScore: this.bestScore,
      isNewRecord: this.isNewRecord,
      milestoneLabel: this.milestoneLabel,
      dangerActive: this.staminaLife < 2 && this.carRemaining <= 0,
      magnetRemaining: Math.ceil(this.magnetTimer),
      hasShield: this.hasShield,
      jumps: this.jumps,
      slides: this.slides,
      headStartActive: this.headStartTimer > 0,
      fuelPct,
      fuelCount: Math.round(this.fuelUnits),
      fuelMax: GAME_CONSTANTS.FUEL_MAX_UNITS,
      fuelReady: this.fuelUnits >= GAME_CONSTANTS.FUEL_MAX_UNITS && this.carRemaining <= 0,
      carRemaining: Math.ceil(this.carRemaining),
      carActive: this.carRemaining > 0,
      carName: this.equippedCar.name,
      heroName: this.equippedHero.name,
      heroPowerName: spec.activeName,
      heroPowerAccent: this.equippedHero.uiAccent,
      heroPowerChargePct: chargePct,
      heroPowerReady:
        this.heroPowerCharge >= spec.chargeCostSec && this.heroPowerActiveTimer <= 0,
      heroPowerActiveRemaining: Math.ceil(this.heroPowerActiveTimer),
      heroPassiveSummary: spec.passiveLabel,
      shibaName: this.equippedCompanion.name,
      shibaPowerName: shibaSpec.activeName,
      shibaPowerAccent: this.equippedCompanion.uiAccent,
      shibaPowerChargePct: shibaChargePct,
      shibaPowerReady:
        this.shibaPowerCharge >= shibaSpec.chargeCostSec && this.shibaPowerActiveTimer <= 0,
      shibaPowerActiveRemaining: Math.ceil(this.shibaPowerActiveTimer),
      shibaCoinX2Active: this.shibaCoinMultFactor > 1 && this.shibaPowerActiveTimer > 0,
      nearMissCount: this.nearMissCount,
      nearMissCombo: this.nearMissCombo,
      nearMissComboTimer: Number(this.nearMissComboTimer.toFixed(1)),
      nearMissLabel: this.nearMissLabel,
      rushLettersMask: (this.baseRushMask | this.runRushMaskEarned) & 0x0f,
      speedLinesIntensity,
      tutorialStep: this.phase === 'PLAYING' && this.distance >= 2 ? this.tutorialStep : null,
      recordGateMeters: this.recordGateMeters,
      biomeName: this.currentBiomeName,
      canRevive: !this.revivedUsed,
      revivedUsed: this.revivedUsed,
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
    this.car.dispose();
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
