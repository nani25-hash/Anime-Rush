import * as THREE from 'three';
import { GAME_CONSTANTS, LaneIndex, ObstacleKind } from '../types/game';
import {
  RUSH_LETTERS,
  RUSH_LETTER_BITS,
  RushLetter,
  SPAWN_THRESHOLDS,
  SpawnContext,
  boxesOverlap,
  checkWallGateCollision,
  getMissingRushLetters,
  getRunnerAabb,
  getTrainSupportY,
  isNearMissDodge,
  isSideGrazeCollision,
  shouldSpawnCollectibleAtDistance,
} from './collisionMath';
import {
  createBrickWallTexture,
  createNekoCoinTexture,
  createOrnateArchTexture,
  createRushTrainFrontTexture,
  createRushTrainSideTexture,
  loadAtlasCropTexture,
} from './textures';
import { WorldCurveUniforms, applyWorldCurveShader } from './worldCurve';

export type ObstacleHitKind = 'NONE' | 'BUMP' | 'CRASH';
export type PowerupKind = 'MAGNET' | 'SHIELD';

export interface PooledObstacle {
  kind: ObstacleKind;
  mesh: THREE.Group;
  active: boolean;
  triggered: boolean;
  passSoundPlayed: boolean;
  nearMissAwarded: boolean;
  hasRamp: boolean;
  rampMesh?: THREE.Mesh;
  lane: LaneIndex;
  openLanes: LaneIndex[];
  speed: number;
  wheels?: THREE.Mesh[];
  laneBlocks?: [THREE.Mesh, THREE.Mesh, THREE.Mesh];
  singleArchFrames?: [THREE.Group, THREE.Group, THREE.Group];
  doubleArchFrames?: [THREE.Group, THREE.Group];
  z: number;
  halfWidth: number;
  minY: number;
  maxY: number;
  halfDepth: number;
}

export interface PooledCoin {
  mesh: THREE.Mesh;
  active: boolean;
  x: number;
  y: number;
  z: number;
  phase: number;
}

export interface PooledSakuraToken {
  mesh: THREE.Group;
  active: boolean;
  x: number;
  y: number;
  z: number;
  phase: number;
}

export interface PooledFuelCan {
  mesh: THREE.Group;
  active: boolean;
  x: number;
  y: number;
  z: number;
  phase: number;
}

export interface PooledPowerup {
  kind: PowerupKind;
  mesh: THREE.Group;
  active: boolean;
  x: number;
  y: number;
  z: number;
  phase: number;
}

export interface PooledRushLetter {
  letter: RushLetter;
  bit: number;
  mesh: THREE.Group;
  active: boolean;
  x: number;
  y: number;
  z: number;
  phase: number;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

export class ObstacleAndCoinPools {
  private readonly obstacles: PooledObstacle[] = [];
  private readonly coins: PooledCoin[] = [];
  private readonly sakuraTokens: PooledSakuraToken[] = [];
  private readonly fuelCans: PooledFuelCan[] = [];
  private readonly powerups: PooledPowerup[] = [];
  private readonly rushLetters: PooledRushLetter[] = [];
  private readonly recordGateGroup: THREE.Group;
  private recordGateTargetMeters: number | null = null;
  private recordGateCrossed = false;
  private readonly particles: Particle[] = [];
  private readonly particleMesh: THREE.InstancedMesh;

  private readonly dummyMatrix = new THREE.Matrix4();
  private readonly dummyPos = new THREE.Vector3();
  private readonly dummyQuat = new THREE.Quaternion();
  private readonly dummyScale = new THREE.Vector3();

  private readonly sharedDisposables: Array<{ dispose: () => void }> = [];
  private nextSpawnZ = -SPAWN_THRESHOLDS.OBSTACLE_START_Z;
  private waveCounter = 0;
  private lastTrainAbsZ = -999;
  private lastWallAbsZ = -999;
  private lastFuelAbsZ = -999;
  private lastSakuraAbsZ = -999;
  private lastMagnetAbsZ = -999;
  private lastShieldAbsZ = -999;
  private lastRushLetterAbsZ = -999;

  constructor(
    scene: THREE.Scene,
    shadowTexture: THREE.Texture,
    curveUniforms: WorldCurveUniforms,
  ) {
    const trainSideTex = createRushTrainSideTexture();
    const trainFrontTex = createRushTrainFrontTexture();
    const nekoCoinTex = createNekoCoinTexture();
    const brickTex = createBrickWallTexture();
    brickTex.repeat.set(1.2, 1.5);
    const ornateArchTex = createOrnateArchTexture();

    // Crop hazard stripe and high-voltage caution emblem from uploaded Mobile - Main atlas
    const hazardStripeTex = loadAtlasCropTexture(
      './assets/textures/atlas_main.png',
      0.88,
      0.56,
      0.11,
      0.13,
      (ctx, size) => {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#dc2626';
        for (let i = -size; i < size * 2; i += 44) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i + 22, 0);
          ctx.lineTo(i - size + 22, size);
          ctx.lineTo(i - size, size);
          ctx.closePath();
          ctx.fill();
        }
      },
      true,
    );

    // Crop Mystery '?' icon tile from uploaded Mobile - Power-ups atlas
    const mysteryBlueTex = loadAtlasCropTexture(
      './assets/textures/atlas_powerups.png',
      0.0,
      0.125,
      0.16,
      0.16,
      (ctx, size) => {
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 140px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', size / 2, size / 2 + 8);
      },
    );

    const highVoltageTex = loadAtlasCropTexture(
      './assets/textures/atlas_main.png',
      0.175,
      0.625,
      0.08,
      0.065,
      (ctx, size) => {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 130px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', size / 2, size / 2 + 6);
      },
    );

    this.sharedDisposables.push(
      trainSideTex,
      trainFrontTex,
      nekoCoinTex,
      brickTex,
      ornateArchTex,
      hazardStripeTex,
      mysteryBlueTex,
      highVoltageTex,
    );

    const redLacquerMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.36,
      metalness: 0.25,
    });
    const fuelBodyMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.35,
      roughness: 0.28,
      metalness: 0.3,
    });
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.56,
      metalness: 0.45,
    });
    const hazardBarMat = new THREE.MeshStandardMaterial({
      map: hazardStripeTex,
      roughness: 0.35,
      metalness: 0.25,
    });
    const warningYellowMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xb45309,
      emissiveIntensity: 0.55,
      roughness: 0.32,
      metalness: 0.3,
    });
    const highVoltageMat = new THREE.MeshStandardMaterial({
      map: highVoltageTex,
      emissive: 0x92400e,
      emissiveIntensity: 0.35,
      roughness: 0.3,
    });
    const cyanSignalMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.45,
      roughness: 0.2,
    });
    const mysteryCrateMat = new THREE.MeshStandardMaterial({
      map: mysteryBlueTex,
      emissive: 0x0369a1,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.35,
    });
    const sakuraCrystalMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      emissive: 0xdb2777,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.4,
    });
    const shieldOrbMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x15803d,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.5,
    });
    const trainSideMat = new THREE.MeshStandardMaterial({
      map: trainSideTex,
      roughness: 0.34,
      metalness: 0.42,
    });
    const trainFrontMat = new THREE.MeshStandardMaterial({
      map: trainFrontTex,
      roughness: 0.32,
      metalness: 0.4,
    });
    const trainRoofMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.4,
      metalness: 0.5,
    });
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      emissive: 0xfde047,
      emissiveIntensity: 2.5,
      roughness: 0.15,
    });
    const brickMat = new THREE.MeshStandardMaterial({
      map: brickTex,
      roughness: 0.8,
      metalness: 0.05,
    });
    const ornateArchMat = new THREE.MeshStandardMaterial({
      map: ornateArchTex,
      roughness: 0.35,
      metalness: 0.25,
    });
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0x854d0e,
      emissiveIntensity: 0.35,
      roughness: 0.28,
      metalness: 0.72,
    });
    const coinRimMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xb45309,
      emissiveIntensity: 0.55,
      roughness: 0.22,
      metalness: 0.85,
    });
    const coinFaceMat = new THREE.MeshStandardMaterial({
      map: nekoCoinTex,
      emissive: 0x854d0e,
      emissiveIntensity: 0.25,
      roughness: 0.25,
      metalness: 0.6,
    });
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    });

    const curvedMaterials: THREE.Material[] = [
      redLacquerMat,
      fuelBodyMat,
      darkMetalMat,
      hazardBarMat,
      warningYellowMat,
      highVoltageMat,
      cyanSignalMat,
      mysteryCrateMat,
      sakuraCrystalMat,
      shieldOrbMat,
      trainSideMat,
      trainFrontMat,
      trainRoofMat,
      headlightMat,
      brickMat,
      ornateArchMat,
      goldTrimMat,
      coinRimMat,
      coinFaceMat,
      shadowMat,
    ];
    for (const mat of curvedMaterials) {
      applyWorldCurveShader(mat, curveUniforms);
    }
    this.sharedDisposables.push(...curvedMaterials);

    // Pre-allocate railway barriers, high beams, and dynamic moving Rush Metro Trains
    for (let i = 0; i < 10; i++) {
      this.obstacles.push(
        this.createLowBarrier(scene, hazardBarMat, darkMetalMat, redLacquerMat, shadowMat),
      );
      this.obstacles.push(
        this.createHighBeam(scene, darkMetalMat, cyanSignalMat, highVoltageMat, shadowMat),
      );
    }
    // 14 dynamic moving metro trains (half with front rooftop ramps, zero static trains!)
    for (let i = 0; i < 14; i++) {
      this.obstacles.push(
        this.createMovingRushTrain(
          scene,
          trainSideMat,
          trainFrontMat,
          trainRoofMat,
          darkMetalMat,
          headlightMat,
          hazardBarMat,
          shadowMat,
          i % 2 === 0 ? 4.4 : 6.4,
          i % 2 === 0 ? 11.4 : 9.8,
          i % 2 === 1,
        ),
      );
    }
    // Pre-allocate Full 3-Lane Brick Walls with 1-Lane & 2-Lane Ornate Portal Archways
    for (let i = 0; i < 4; i++) {
      this.obstacles.push(
        this.createWallGate('WALL_GATE_1', scene, brickMat, ornateArchMat, goldTrimMat, shadowMat),
      );
    }
    for (let i = 0; i < 3; i++) {
      this.obstacles.push(
        this.createWallGate('WALL_GATE_2', scene, brickMat, ornateArchMat, goldTrimMat, shadowMat),
      );
    }

    // Pre-allocate 64 spinning Gold Neko Coins
    const coinGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.09, 18);
    coinGeo.rotateX(Math.PI / 2);
    this.sharedDisposables.push(coinGeo);
    const coinMats = [coinRimMat, coinFaceMat, coinFaceMat];

    for (let i = 0; i < 64; i++) {
      const coinMesh = new THREE.Mesh(coinGeo, coinMats);
      coinMesh.visible = false;
      scene.add(coinMesh);
      this.coins.push({
        mesh: coinMesh,
        active: false,
        x: 0,
        y: 1.0,
        z: 0,
        phase: i * 0.45,
      });
    }

    // Pre-allocate 14 collectible Pink Sakura Tokens
    const tokenCoreGeo = new THREE.OctahedronGeometry(0.34, 0);
    const tokenRingGeo = new THREE.TorusGeometry(0.42, 0.05, 6, 12);
    this.sharedDisposables.push(tokenCoreGeo, tokenRingGeo);

    for (let i = 0; i < 14; i++) {
      const group = new THREE.Group();
      const core = new THREE.Mesh(tokenCoreGeo, sakuraCrystalMat);
      const ring = new THREE.Mesh(tokenRingGeo, warningYellowMat);
      group.add(core, ring);
      group.visible = false;
      scene.add(group);
      this.sakuraTokens.push({
        mesh: group,
        active: false,
        x: 0,
        y: 1.1,
        z: 0,
        phase: i * 0.7,
      });
    }

    // Pre-allocate 10 Collectible Red Fuel Jerrycans ("Bidons d'essence")
    const jerryBodyGeo = new THREE.BoxGeometry(0.42, 0.5, 0.24);
    const jerryStripeGeo = new THREE.BoxGeometry(0.44, 0.14, 0.26);
    const jerryHandleGeo = new THREE.BoxGeometry(0.24, 0.09, 0.1);
    const jerrySpoutGeo = new THREE.CylinderGeometry(0.045, 0.06, 0.18, 8);
    const jerryGlowGeo = new THREE.TorusGeometry(0.46, 0.045, 6, 18);
    this.sharedDisposables.push(
      jerryBodyGeo,
      jerryStripeGeo,
      jerryHandleGeo,
      jerrySpoutGeo,
      jerryGlowGeo,
    );

    for (let i = 0; i < 10; i++) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(jerryBodyGeo, fuelBodyMat);
      const stripe = new THREE.Mesh(jerryStripeGeo, warningYellowMat);
      stripe.position.y = -0.02;
      const handle = new THREE.Mesh(jerryHandleGeo, darkMetalMat);
      handle.position.set(-0.04, 0.29, 0);
      const spout = new THREE.Mesh(jerrySpoutGeo, warningYellowMat);
      spout.position.set(0.14, 0.31, 0);
      spout.rotation.z = -0.45;
      const halo = new THREE.Mesh(jerryGlowGeo, warningYellowMat);
      halo.rotation.x = Math.PI / 2;
      halo.position.y = -0.26;
      group.add(body, stripe, handle, spout, halo);
      group.visible = false;
      scene.add(group);
      this.fuelCans.push({
        mesh: group,
        active: false,
        x: 0,
        y: 1.08,
        z: 0,
        phase: i * 0.85,
      });
    }

    // Pre-allocate 6 In-Run Power-Up Orbs / Mystery Cubes (Magnet & Shield)
    const orbCoreGeo = new THREE.BoxGeometry(0.56, 0.56, 0.56);
    const orbHaloGeo = new THREE.TorusGeometry(0.54, 0.055, 8, 16);
    this.sharedDisposables.push(orbCoreGeo, orbHaloGeo);

    for (let i = 0; i < 6; i++) {
      const kind: PowerupKind = i % 2 === 0 ? 'MAGNET' : 'SHIELD';
      const group = new THREE.Group();
      const core = new THREE.Mesh(
        orbCoreGeo,
        kind === 'MAGNET' ? mysteryCrateMat : shieldOrbMat,
      );
      const halo = new THREE.Mesh(orbHaloGeo, kind === 'MAGNET' ? cyanSignalMat : warningYellowMat);
      halo.rotation.x = Math.PI / 3;
      group.add(core, halo);
      group.visible = false;
      scene.add(group);
      this.powerups.push({
        kind,
        mesh: group,
        active: false,
        x: 0,
        y: 1.15,
        z: 0,
        phase: i * 0.9,
      });
    }

    // Pre-allocate 4 glowing R-U-S-H Letter Collectibles
    const rushCubeGeo = new THREE.BoxGeometry(0.58, 0.58, 0.58);
    const rushHaloGeo = new THREE.TorusGeometry(0.54, 0.055, 8, 18);
    this.sharedDisposables.push(rushCubeGeo, rushHaloGeo);

    RUSH_LETTERS.forEach((letter, idx) => {
      const tex = this.createRushLetterTexture(letter);
      const letterMat = new THREE.MeshStandardMaterial({
        map: tex,
        emissive: 0x9a3412,
        emissiveIntensity: 0.45,
        roughness: 0.22,
        metalness: 0.4,
      });
      applyWorldCurveShader(letterMat, curveUniforms);
      this.sharedDisposables.push(tex, letterMat);

      const group = new THREE.Group();
      const core = new THREE.Mesh(rushCubeGeo, letterMat);
      const halo = new THREE.Mesh(rushHaloGeo, warningYellowMat);
      halo.rotation.x = Math.PI / 3;
      group.add(core, halo);
      group.visible = false;
      scene.add(group);

      this.rushLetters.push({
        letter,
        bit: RUSH_LETTER_BITS[letter],
        mesh: group,
        active: false,
        x: 0,
        y: 1.24,
        z: 0,
        phase: idx * 0.85,
      });
    });

    // Physical glowing "TON RECORD" arch placed on the rails when player has a best score
    this.recordGateGroup = this.createRecordGate(scene, curveUniforms, goldTrimMat, cyanSignalMat);

    // Pre-allocate 72 pooled particle instances
    const pGeo = new THREE.OctahedronGeometry(0.12, 0);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    applyWorldCurveShader(pMat, curveUniforms);
    this.sharedDisposables.push(pGeo, pMat);
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, 72);
    this.particleMesh.frustumCulled = false;
    for (let i = 0; i < 72; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.4,
        color: new THREE.Color(0xfacc15),
      });
      this.dummyPos.set(0, -50, 0);
      this.dummyScale.set(0, 0, 0);
      this.dummyMatrix.compose(this.dummyPos, this.dummyQuat, this.dummyScale);
      this.particleMesh.setMatrixAt(i, this.dummyMatrix);
      this.particleMesh.setColorAt(i, this.particles[i].color);
    }
    scene.add(this.particleMesh);
  }

  private createLowBarrier(
    scene: THREE.Scene,
    hazardMat: THREE.Material,
    darkMat: THREE.Material,
    redMat: THREE.Material,
    shadowMat: THREE.Material,
  ): PooledObstacle {
    const group = new THREE.Group();
    const postGeo = new THREE.BoxGeometry(0.24, 1.0, 0.28);
    const barGeo = new THREE.BoxGeometry(1.94, 0.34, 0.24);
    const lampGeo = new THREE.SphereGeometry(0.11, 8, 8);
    const shadowGeo = new THREE.PlaneGeometry(2.1, 1.1);
    this.sharedDisposables.push(postGeo, barGeo, lampGeo, shadowGeo);

    const leftPost = new THREE.Mesh(postGeo, darkMat);
    leftPost.position.set(-0.8, 0.5, 0);
    leftPost.castShadow = true;
    const rightPost = new THREE.Mesh(postGeo, darkMat);
    rightPost.position.set(0.8, 0.5, 0);
    rightPost.castShadow = true;

    const upperBar = new THREE.Mesh(barGeo, hazardMat);
    upperBar.position.set(0, 0.85, 0);
    upperBar.castShadow = true;

    const leftLamp = new THREE.Mesh(lampGeo, redMat);
    leftLamp.position.set(-0.8, 1.04, 0);
    const rightLamp = new THREE.Mesh(lampGeo, redMat);
    rightLamp.position.set(0.8, 1.04, 0);

    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.025;

    group.add(leftPost, rightPost, upperBar, leftLamp, rightLamp, shadow);
    group.visible = false;
    scene.add(group);

    return {
      kind: 'LOW_BARRIER',
      mesh: group,
      active: false,
      triggered: false,
      passSoundPlayed: false,
      nearMissAwarded: false,
      hasRamp: false,
      lane: 0,
      openLanes: [],
      speed: 0,
      z: 0,
      halfWidth: 0.78,
      minY: 0,
      maxY: 1.04,
      halfDepth: 0.22,
    };
  }

  private createHighBeam(
    scene: THREE.Scene,
    darkMat: THREE.Material,
    cyanMat: THREE.Material,
    highVoltageMat: THREE.Material,
    shadowMat: THREE.Material,
  ): PooledObstacle {
    const group = new THREE.Group();
    const legGeo = new THREE.CylinderGeometry(0.12, 0.14, 2.75, 8);
    const beamGeo = new THREE.BoxGeometry(2.15, 0.66, 0.42);
    const trimGeo = new THREE.BoxGeometry(2.2, 0.12, 0.46);
    const signGeo = new THREE.BoxGeometry(0.56, 0.48, 0.5);
    const shadowGeo = new THREE.PlaneGeometry(2.2, 1.0);
    this.sharedDisposables.push(legGeo, beamGeo, trimGeo, signGeo, shadowGeo);

    const leftLeg = new THREE.Mesh(legGeo, darkMat);
    leftLeg.position.set(-0.94, 1.38, 0);
    leftLeg.castShadow = true;
    const rightLeg = new THREE.Mesh(legGeo, darkMat);
    rightLeg.position.set(0.94, 1.38, 0);
    rightLeg.castShadow = true;

    const beam = new THREE.Mesh(beamGeo, darkMat);
    beam.position.set(0, 1.95, 0);
    beam.castShadow = true;

    const topCap = new THREE.Mesh(trimGeo, highVoltageMat);
    topCap.position.set(0, 2.34, 0);

    const bottomGlow = new THREE.Mesh(trimGeo, cyanMat);
    bottomGlow.position.set(0, 1.6, 0);

    const sigCenter = new THREE.Mesh(signGeo, highVoltageMat);
    sigCenter.position.set(0, 1.95, 0);

    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.025;

    group.add(leftLeg, rightLeg, beam, topCap, bottomGlow, sigCenter, shadow);
    group.visible = false;
    scene.add(group);

    return {
      kind: 'HIGH_BEAM',
      mesh: group,
      active: false,
      triggered: false,
      passSoundPlayed: false,
      nearMissAwarded: false,
      hasRamp: false,
      lane: 0,
      openLanes: [],
      speed: 0,
      z: 0,
      halfWidth: 0.78,
      minY: 1.05,
      maxY: 2.5,
      halfDepth: 0.28,
    };
  }

  private createMovingRushTrain(
    scene: THREE.Scene,
    trainSideMat: THREE.Material,
    trainFrontMat: THREE.Material,
    trainRoofMat: THREE.Material,
    darkMat: THREE.Material,
    headlightMat: THREE.Material,
    rampMat: THREE.Material,
    shadowMat: THREE.Material,
    trainLength = 4.4,
    trainSpeed = 11.2,
    hasRamp = false,
  ): PooledObstacle {
    const group = new THREE.Group();
    const halfLen = trainLength * 0.5;
    const chassisGeo = new THREE.BoxGeometry(1.82, 0.34, trainLength);
    const cabinGeo = new THREE.BoxGeometry(1.76, 2.15, trainLength - 0.16);
    const roofGeo = new THREE.BoxGeometry(1.64, 0.25, trainLength - 0.2);
    const acUnitGeo = new THREE.BoxGeometry(0.9, 0.22, Math.min(2.0, trainLength * 0.32));
    const lampGeo = new THREE.BoxGeometry(0.32, 0.24, 0.16);
    const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 1.72, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const shadowGeo = new THREE.PlaneGeometry(2.3, trainLength + (hasRamp ? 3.2 : 0.35));
    // Sloped ramp deck (~3.0m horizontal run, 2.75m climb -> length ~4.07m)
    const rampGeo = new THREE.BoxGeometry(1.66, 0.14, 4.1);
    this.sharedDisposables.push(
      chassisGeo,
      cabinGeo,
      roofGeo,
      acUnitGeo,
      lampGeo,
      wheelGeo,
      shadowGeo,
      rampGeo,
    );

    const bodyMats = [
      trainSideMat,
      trainSideMat,
      trainRoofMat,
      darkMat,
      trainFrontMat,
      trainFrontMat,
    ];

    const chassis = new THREE.Mesh(chassisGeo, darkMat);
    chassis.position.y = 0.28;
    chassis.castShadow = true;

    const cabin = new THREE.Mesh(cabinGeo, bodyMats);
    cabin.position.y = 1.52;
    cabin.castShadow = true;

    const roof = new THREE.Mesh(roofGeo, trainRoofMat);
    roof.position.y = 2.72;

    const acUnit = new THREE.Mesh(acUnitGeo, darkMat);
    acUnit.position.y = 2.93;

    const leftLamp = new THREE.Mesh(lampGeo, headlightMat);
    leftLamp.position.set(-0.54, 0.88, halfLen - 0.04);
    const rightLamp = new THREE.Mesh(lampGeo, headlightMat);
    rightLamp.position.set(0.54, 0.88, halfLen - 0.04);

    let rampMesh: THREE.Mesh | undefined;
    if (hasRamp) {
      rampMesh = new THREE.Mesh(rampGeo, rampMat);
      rampMesh.position.set(0, 1.38, halfLen + 1.4);
      rampMesh.rotation.x = Math.atan2(2.75, 3.0);
      rampMesh.castShadow = true;
      group.add(rampMesh);
    }

    const wheels: THREE.Mesh[] = [];
    const axleZs =
      trainLength > 5.0
        ? [-halfLen + 0.65, -0.4, 0.4, halfLen - 0.65]
        : [-halfLen + 0.65, halfLen - 0.65];
    for (const wz of axleZs) {
      const axle = new THREE.Mesh(wheelGeo, darkMat);
      axle.position.set(0, 0.24, wz);
      group.add(axle);
      wheels.push(axle);
    }

    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.025;
    if (hasRamp) shadow.position.z = 1.4;

    group.add(chassis, cabin, roof, acUnit, leftLamp, rightLamp, shadow);
    group.visible = false;
    scene.add(group);

    return {
      kind: 'MOVING_CART',
      mesh: group,
      active: false,
      triggered: false,
      passSoundPlayed: false,
      nearMissAwarded: false,
      hasRamp,
      rampMesh,
      lane: 0,
      openLanes: [],
      speed: trainSpeed,
      wheels,
      z: 0,
      halfWidth: 0.78,
      minY: 0,
      maxY: 2.8,
      halfDepth: halfLen - 0.14,
    };
  }

  private createWallGate(
    kind: 'WALL_GATE_1' | 'WALL_GATE_2',
    scene: THREE.Scene,
    brickMat: THREE.Material,
    ornateArchMat: THREE.Material,
    goldTrimMat: THREE.Material,
    shadowMat: THREE.Material,
  ): PooledObstacle {
    const group = new THREE.Group();
    const laneW = GAME_CONSTANTS.LANE_WIDTH;

    // 3 solid brick lane segments + outer boundary brick piers covering all 3 lanes
    const laneWallGeo = new THREE.BoxGeometry(laneW + 0.08, 3.25, 0.72);
    const pierGeo = new THREE.BoxGeometry(1.15, 3.35, 0.76);
    const copingGeo = new THREE.BoxGeometry(8.9, 0.18, 0.86);
    const pillarGeo = new THREE.BoxGeometry(0.24, 2.55, 0.82);
    const singleLintelGeo = new THREE.BoxGeometry(laneW + 0.14, 0.62, 0.76);
    const singleArchGeo = new THREE.TorusGeometry(0.86, 0.18, 8, 18, Math.PI);
    const doubleLintelGeo = new THREE.BoxGeometry(laneW * 2 + 0.16, 0.62, 0.76);
    const doubleArchGeo = new THREE.TorusGeometry(1.88, 0.2, 8, 22, Math.PI);
    const shadowGeo = new THREE.PlaneGeometry(8.8, 1.6);

    this.sharedDisposables.push(
      laneWallGeo,
      pierGeo,
      copingGeo,
      pillarGeo,
      singleLintelGeo,
      singleArchGeo,
      doubleLintelGeo,
      doubleArchGeo,
      shadowGeo,
    );

    const leftPier = new THREE.Mesh(pierGeo, brickMat);
    leftPier.position.set(-laneW * 1.5 - 0.55, 1.675, 0);
    leftPier.castShadow = true;

    const rightPier = new THREE.Mesh(pierGeo, brickMat);
    rightPier.position.set(laneW * 1.5 + 0.55, 1.675, 0);
    rightPier.castShadow = true;

    const coping = new THREE.Mesh(copingGeo, goldTrimMat);
    coping.position.set(0, 3.32, 0);

    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.025;

    group.add(leftPier, rightPier, coping, shadow);

    const lanePositions: number[] = [-laneW, 0, laneW];
    const laneBlocks: THREE.Mesh[] = [];
    const singleArchFrames: THREE.Group[] = [];

    for (const lx of lanePositions) {
      const block = new THREE.Mesh(laneWallGeo, brickMat);
      block.position.set(lx, 1.625, 0);
      block.castShadow = true;
      group.add(block);
      laneBlocks.push(block);

      // Ornate single-lane archway portal
      const archFrame = new THREE.Group();
      archFrame.position.set(lx, 0, 0);
      const lintel = new THREE.Mesh(singleLintelGeo, brickMat);
      lintel.position.set(0, 2.94, 0);
      const colL = new THREE.Mesh(pillarGeo, ornateArchMat);
      colL.position.set(-0.96, 1.28, 0);
      const colR = new THREE.Mesh(pillarGeo, ornateArchMat);
      colR.position.set(0.96, 1.28, 0);
      const archCrown = new THREE.Mesh(singleArchGeo, ornateArchMat);
      archCrown.position.set(0, 2.15, 0.36);
      const archCrownBack = new THREE.Mesh(singleArchGeo, goldTrimMat);
      archCrownBack.position.set(0, 2.15, -0.36);
      archFrame.add(lintel, colL, colR, archCrown, archCrownBack);
      archFrame.visible = false;
      group.add(archFrame);
      singleArchFrames.push(archFrame);
    }

    // 2 Double-wide ornate archway portals spanning [-1, 0] or [0, 1]
    const doubleArchFrames: THREE.Group[] = [];
    for (const centerX of [-laneW * 0.5, laneW * 0.5]) {
      const dblFrame = new THREE.Group();
      dblFrame.position.set(centerX, 0, 0);
      const lintel = new THREE.Mesh(doubleLintelGeo, brickMat);
      lintel.position.set(0, 2.94, 0);
      const colL = new THREE.Mesh(pillarGeo, ornateArchMat);
      colL.position.set(-laneW + 0.25, 1.28, 0);
      const colR = new THREE.Mesh(pillarGeo, ornateArchMat);
      colR.position.set(laneW - 0.25, 1.28, 0);
      const archCrown = new THREE.Mesh(doubleArchGeo, ornateArchMat);
      archCrown.position.set(0, 2.02, 0.36);
      const archCrownBack = new THREE.Mesh(doubleArchGeo, goldTrimMat);
      archCrownBack.position.set(0, 2.02, -0.36);
      dblFrame.add(lintel, colL, colR, archCrown, archCrownBack);
      dblFrame.visible = false;
      group.add(dblFrame);
      doubleArchFrames.push(dblFrame);
    }

    group.visible = false;
    scene.add(group);

    return {
      kind,
      mesh: group,
      active: false,
      triggered: false,
      passSoundPlayed: false,
      nearMissAwarded: false,
      hasRamp: false,
      lane: 0,
      openLanes: [0],
      speed: 0,
      laneBlocks: laneBlocks as [THREE.Mesh, THREE.Mesh, THREE.Mesh],
      singleArchFrames: singleArchFrames as [THREE.Group, THREE.Group, THREE.Group],
      doubleArchFrames: doubleArchFrames as [THREE.Group, THREE.Group],
      z: 0,
      halfWidth: 4.3,
      minY: 0,
      maxY: 3.25,
      halfDepth: 0.38,
    };
  }

  public reset(): void {
    for (const obs of this.obstacles) {
      obs.active = false;
      obs.triggered = false;
      obs.passSoundPlayed = false;
      obs.nearMissAwarded = false;
      obs.mesh.visible = false;
    }
    for (const coin of this.coins) {
      coin.active = false;
      coin.mesh.visible = false;
    }
    for (const tok of this.sakuraTokens) {
      tok.active = false;
      tok.mesh.visible = false;
    }
    for (const can of this.fuelCans) {
      can.active = false;
      can.mesh.visible = false;
    }
    for (const pu of this.powerups) {
      pu.active = false;
      pu.mesh.visible = false;
    }
    for (const rl of this.rushLetters) {
      rl.active = false;
      rl.mesh.visible = false;
    }
    this.recordGateTargetMeters = null;
    this.recordGateCrossed = false;
    this.recordGateGroup.visible = false;
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].active = false;
      this.dummyPos.set(0, -50, 0);
      this.dummyScale.set(0, 0, 0);
      this.dummyMatrix.compose(this.dummyPos, this.dummyQuat, this.dummyScale);
      this.particleMesh.setMatrixAt(i, this.dummyMatrix);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    this.nextSpawnZ = -SPAWN_THRESHOLDS.OBSTACLE_START_Z;
    this.waveCounter = 0;
    this.lastTrainAbsZ = -999;
    this.lastWallAbsZ = -999;
    this.lastFuelAbsZ = -999;
    this.lastSakuraAbsZ = -999;
    this.lastMagnetAbsZ = -999;
    this.lastShieldAbsZ = -999;
    this.lastRushLetterAbsZ = -999;
  }

  public setRecordTargetMeters(meters: number | null): void {
    if (meters !== null && meters >= 35) {
      this.recordGateTargetMeters = meters;
      this.recordGateCrossed = false;
      this.recordGateGroup.position.set(0, 0, -meters);
      this.recordGateGroup.visible = true;
    } else {
      this.recordGateTargetMeters = null;
      this.recordGateCrossed = false;
      this.recordGateGroup.visible = false;
    }
  }

  public emitBurstPublic(x: number, y: number, z: number, count: number, hexColor: number): void {
    this.emitBurst(x, y, z, count, hexColor);
  }

  public clearObstacleNearZ(runnerZ: number): void {
    for (const obs of this.obstacles) {
      if (obs.active && Math.abs(obs.z - runnerZ) < 4.5) {
        obs.active = false;
        obs.mesh.visible = false;
      }
    }
  }

  public destroyObstaclesAhead(runnerZ: number, rangeZ = 38): number {
    let smashed = 0;
    for (const obs of this.obstacles) {
      if (!obs.active) continue;
      if (obs.z <= runnerZ + 2.5 && obs.z >= runnerZ - rangeZ) {
        obs.active = false;
        obs.mesh.visible = false;
        const burstX =
          obs.kind === 'WALL_GATE_1' || obs.kind === 'WALL_GATE_2'
            ? 0
            : obs.lane * GAME_CONSTANTS.LANE_WIDTH;
        this.emitBurst(burstX, 1.4, obs.z, 16, 0x38bdf8);
        smashed++;
      }
    }
    return smashed;
  }

  public update(
    dt: number,
    runnerZ: number,
    worldSpeed: number,
    runnerX = 0,
    runnerY = 0,
    magnetActive = false,
    spawnCtx: SpawnContext = {
      fuelPct: 0,
      carActive: false,
      hasShield: false,
      magnetActive,
    },
    currentRushMask = 0,
  ): { passedMovingTrain: boolean; crossedRecordGate: boolean } {
    const cullZ = runnerZ + 12;
    let passedMovingTrain = false;
    let crossedRecordGate = false;

    if (this.recordGateTargetMeters !== null) {
      const gateZ = -this.recordGateTargetMeters;
      if (!this.recordGateCrossed && runnerZ <= gateZ + 0.35) {
        this.recordGateCrossed = true;
        crossedRecordGate = true;
        this.emitBurst(runnerX, 2.2, gateZ, 30, 0xfacc15);
        this.emitBurst(runnerX, 2.6, gateZ, 22, 0x38bdf8);
      }
      if (gateZ > cullZ) {
        this.recordGateGroup.visible = false;
      }
    }

    for (const obs of this.obstacles) {
      if (!obs.active) continue;
      if (obs.kind === 'MOVING_CART' && worldSpeed > 0) {
        if (!obs.triggered && Math.abs(obs.z - runnerZ) <= GAME_CONSTANTS.MOVING_CART_TRIGGER_DIST) {
          obs.triggered = true;
        }
        if (obs.triggered) {
          const stepSpeed = obs.speed > 0 ? obs.speed : GAME_CONSTANTS.MOVING_CART_SPEED;
          let nextZ = obs.z + stepSpeed * dt;

          // Prevent dynamic moving trains from clipping through any active brick wall gate ahead of them
          for (const wall of this.obstacles) {
            if (!wall.active || (wall.kind !== 'WALL_GATE_1' && wall.kind !== 'WALL_GATE_2')) {
              continue;
            }
            const stopBoundary = wall.z - wall.halfDepth - obs.halfDepth - 0.85;
            if (obs.z <= stopBoundary + 0.05 && nextZ > stopBoundary) {
              nextZ = stopBoundary;
              break;
            }
          }

          const movedDz = Math.max(0, nextZ - obs.z);
          obs.z = nextZ;
          obs.mesh.position.z = obs.z;

          if (obs.wheels && movedDz > 0) {
            for (const wheel of obs.wheels) {
              wheel.rotation.x += movedDz * 4.2;
            }
          }

          if (!obs.passSoundPlayed && Math.abs(obs.z - runnerZ) < 11.5) {
            obs.passSoundPlayed = true;
            passedMovingTrain = true;
          }
        }
      }
      if (obs.z > cullZ) {
        obs.active = false;
        obs.triggered = false;
        obs.passSoundPlayed = false;
        obs.mesh.visible = false;
      }
    }

    const attractLerp = 1 - Math.exp(-12.5 * dt);
    for (const coin of this.coins) {
      if (!coin.active) continue;
      if (coin.z > cullZ) {
        coin.active = false;
        coin.mesh.visible = false;
      } else {
        if (magnetActive) {
          const dz = coin.z - runnerZ;
          const dx = coin.x - runnerX;
          if (Math.abs(dz) < 9.5 && Math.abs(dx) < 6.4) {
            coin.x = THREE.MathUtils.lerp(coin.x, runnerX, attractLerp);
            coin.y = THREE.MathUtils.lerp(coin.y, runnerY + 0.95, attractLerp);
            coin.z = THREE.MathUtils.lerp(coin.z, runnerZ, attractLerp);
          }
        }
        coin.phase += dt * 4.4;
        coin.mesh.rotation.y = coin.phase;
        coin.mesh.position.set(coin.x, coin.y + Math.sin(coin.phase * 1.3) * 0.1, coin.z);
      }
    }

    for (const tok of this.sakuraTokens) {
      if (!tok.active) continue;
      if (tok.z > cullZ) {
        tok.active = false;
        tok.mesh.visible = false;
      } else {
        tok.phase += dt * 3.8;
        tok.mesh.rotation.y = tok.phase;
        tok.mesh.rotation.x = Math.sin(tok.phase * 0.7) * 0.25;
        tok.mesh.position.y = tok.y + Math.sin(tok.phase * 1.4) * 0.12;
      }
    }

    for (const can of this.fuelCans) {
      if (!can.active) continue;
      if (can.z > cullZ) {
        can.active = false;
        can.mesh.visible = false;
      } else {
        can.phase += dt * 3.2;
        can.mesh.rotation.y = can.phase;
        can.mesh.position.y = can.y + Math.sin(can.phase * 1.6) * 0.14;
      }
    }

    for (const pu of this.powerups) {
      if (!pu.active) continue;
      if (pu.z > cullZ) {
        pu.active = false;
        pu.mesh.visible = false;
      } else {
        pu.phase += dt * 3.2;
        pu.mesh.rotation.y = pu.phase;
        pu.mesh.position.y = pu.y + Math.sin(pu.phase * 1.6) * 0.14;
      }
    }

    for (const rl of this.rushLetters) {
      if (!rl.active) continue;
      if (rl.z > cullZ) {
        rl.active = false;
        rl.mesh.visible = false;
      } else {
        rl.phase += dt * 3.5;
        rl.mesh.rotation.y = rl.phase;
        rl.mesh.position.y = rl.y + Math.sin(rl.phase * 1.5) * 0.16;
      }
    }

    const spawnHorizonZ = runnerZ - 115;
    while (this.nextSpawnZ > spawnHorizonZ) {
      this.spawnNextWave(worldSpeed, spawnCtx, currentRushMask);
    }

    let dirty = false;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      dirty = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.dummyPos.set(0, -50, 0);
        this.dummyScale.set(0, 0, 0);
      } else {
        p.vy -= 14 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        const s = Math.max(0.01, p.life / p.maxLife);
        this.dummyPos.set(p.x, p.y, p.z);
        this.dummyScale.set(s, s, s);
      }
      this.dummyMatrix.compose(this.dummyPos, this.dummyQuat, this.dummyScale);
      this.particleMesh.setMatrixAt(i, this.dummyMatrix);
    }
    if (dirty) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
    }

    return { passedMovingTrain, crossedRecordGate };
  }

  private spawnNextWave(worldSpeed: number, spawnCtx: SpawnContext, currentRushMask: number): void {
    const z = this.nextSpawnZ;
    const absZ = Math.abs(z);
    this.waveCounter++;
    const difficulty = THREE.MathUtils.clamp((worldSpeed - 14.5) / 16.0, 0, 1);

    const lanes: LaneIndex[] = [-1, 0, 1];
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = lanes[i];
      lanes[i] = lanes[j];
      lanes[j] = tmp;
    }

    const openLane = lanes[0];
    const laneB = lanes[1];
    const laneC = lanes[2];

    const canSpawnWall =
      absZ >= SPAWN_THRESHOLDS.WALL_GATE_MIN_DIST &&
      absZ - this.lastWallAbsZ >= SPAWN_THRESHOLDS.WALL_GATE_COOLDOWN_DIST &&
      absZ - this.lastTrainAbsZ >= 18;
    const canSpawnTrain =
      absZ >= SPAWN_THRESHOLDS.TRAIN_MIN_DIST &&
      absZ - this.lastTrainAbsZ >= SPAWN_THRESHOLDS.TRAIN_COOLDOWN_DIST &&
      absZ - this.lastWallAbsZ >= 20;
    const canSpawnRampTrain =
      canSpawnTrain && absZ >= SPAWN_THRESHOLDS.RAMP_TRAIN_MIN_DIST;
    const canSpawnDoubleTrain =
      canSpawnTrain && absZ >= SPAWN_THRESHOLDS.DOUBLE_TRAIN_MIN_DIST;

    const roll = Math.random();
    let spawnedWallThisWave = false;

    if (canSpawnWall && this.waveCounter % 5 === 0) {
      // Full-Width 3-Lane Brick Wall with Ornate 1-Lane or 2-Lane Portal Archway
      const isTwoLane = Math.random() < 0.45;
      if (isTwoLane) {
        const pair: [LaneIndex, LaneIndex] = Math.random() < 0.5 ? [-1, 0] : [0, 1];
        this.activateWallGate('WALL_GATE_2', z, pair);
        this.spawnCoinLine(pair[0], z + 4.5, 4, 2.2, 1.0);
        this.spawnCoinLine(pair[1], z - 2.0, 3, 2.2, 1.0);
      } else {
        this.activateWallGate('WALL_GATE_1', z, [openLane]);
        this.spawnCoinLine(openLane, z + 5.0, 5, 2.2, 1.0);
      }
      this.lastWallAbsZ = absZ;
      spawnedWallThisWave = true;
    } else if (!canSpawnTrain || this.waveCounter <= 2 || roll < 0.28) {
      // Early track & calm waves: clean barriers/beams before trains unlock at 95m
      const kind: ObstacleKind =
        canSpawnTrain && roll >= 0.19
          ? 'MOVING_CART'
          : roll < 0.14
            ? 'LOW_BARRIER'
            : 'HIGH_BEAM';
      this.activateObstacle(kind, laneB, kind === 'MOVING_CART' ? z - 5 : z);
      if (kind === 'MOVING_CART') {
        this.lastTrainAbsZ = absZ;
      } else if (difficulty > 0.25 && Math.random() < 0.45) {
        this.activateObstacle(kind === 'LOW_BARRIER' ? 'HIGH_BEAM' : 'LOW_BARRIER', laneC, z);
      }
      this.spawnCoinLine(openLane, z + 4, 5, 2.2, 1.0);
    } else if (canSpawnRampTrain && roll < 0.52) {
      const rampTrain = this.activateObstacle('MOVING_CART', laneB, z - 5.5, true);
      if (rampTrain) {
        this.lastTrainAbsZ = absZ;
      }
      if (rampTrain?.hasRamp) {
        this.spawnRampToRoofCoinArc(laneB, rampTrain.z, rampTrain.halfDepth);
      }
      if (difficulty > 0.15 || Math.random() < 0.68) {
        const secondKind: ObstacleKind =
          canSpawnDoubleTrain && Math.random() < 0.42 ? 'MOVING_CART' : 'LOW_BARRIER';
        this.activateObstacle(secondKind, laneC, secondKind === 'MOVING_CART' ? z - 8.0 : z);
      }
      this.spawnCoinLine(openLane, z + 2, 4, 2.2, 1.0);
    } else if (roll < 0.72) {
      this.activateObstacle('LOW_BARRIER', openLane, z);
      this.activateObstacle('MOVING_CART', laneB, z - 5);
      this.lastTrainAbsZ = absZ;
      if (difficulty > 0.28) {
        this.activateObstacle('HIGH_BEAM', laneC, z);
      }
      this.spawnCoinArc(openLane, z);
    } else if (roll < 0.88 || !canSpawnDoubleTrain) {
      this.activateObstacle('HIGH_BEAM', openLane, z);
      this.activateObstacle('MOVING_CART', laneB, z - 5);
      this.lastTrainAbsZ = absZ;
      if (difficulty > 0.22) {
        this.activateObstacle('LOW_BARRIER', laneC, z);
      }
      this.spawnCoinLine(openLane, z + 3.2, 4, 2.1, 0.52);
    } else {
      const rampLeft = this.activateObstacle('MOVING_CART', laneB, z - 5, true);
      if (rampLeft?.hasRamp) {
        this.spawnRampToRoofCoinArc(laneB, rampLeft.z, rampLeft.halfDepth);
      }
      this.activateObstacle('MOVING_CART', laneC, z - 9.0);
      this.lastTrainAbsZ = absZ;
      this.spawnCoinLine(openLane, z + 3.5, 5, 2.2, 1.0);
    }

    // Smart distance-gated & context-aware collectibles placed cleanly on safe lane
    const itemZ = spawnedWallThisWave ? z - 7.5 : z - 6.8;
    const itemAbsZ = Math.abs(itemZ);
    const safeX = openLane * GAME_CONSTANTS.LANE_WIDTH;

    let spawnedStandardCollectible = false;
    if (shouldSpawnCollectibleAtDistance('FUEL', itemAbsZ, this.lastFuelAbsZ, spawnCtx)) {
      this.activateFuelCan(safeX, 1.08, itemZ);
      this.lastFuelAbsZ = itemAbsZ;
      spawnedStandardCollectible = true;
    } else if (
      shouldSpawnCollectibleAtDistance('SHIELD', itemAbsZ, this.lastShieldAbsZ, spawnCtx)
    ) {
      this.activatePowerup('SHIELD', safeX, 1.15, itemZ);
      this.lastShieldAbsZ = itemAbsZ;
      spawnedStandardCollectible = true;
    } else if (
      shouldSpawnCollectibleAtDistance('MAGNET', itemAbsZ, this.lastMagnetAbsZ, spawnCtx)
    ) {
      this.activatePowerup('MAGNET', safeX, 1.15, itemZ);
      this.lastMagnetAbsZ = itemAbsZ;
      spawnedStandardCollectible = true;
    } else if (
      shouldSpawnCollectibleAtDistance('SAKURA', itemAbsZ, this.lastSakuraAbsZ, spawnCtx)
    ) {
      this.activateSakuraToken(safeX, 1.15, itemZ);
      this.lastSakuraAbsZ = itemAbsZ;
      spawnedStandardCollectible = true;
    }

    // Daily R-U-S-H Word Hunt letter spawn (every ~38m starting after 72m)
    const rushZ = spawnedStandardCollectible ? itemZ - 4.2 : itemZ;
    const rushAbsZ = Math.abs(rushZ);
    if (rushAbsZ >= 72 && rushAbsZ - this.lastRushLetterAbsZ >= 38) {
      const missing = getMissingRushLetters(currentRushMask);
      const candidate = missing.find((letter) => {
        const slot = this.rushLetters.find((r) => r.letter === letter);
        return slot && !slot.active;
      });
      if (candidate) {
        this.activateRushLetter(candidate, safeX, 1.24, rushZ);
        this.lastRushLetterAbsZ = rushAbsZ;
      }
    }

    const extraWallBuffer = spawnedWallThisWave ? 8.5 : 0;
    const minGap = 18.5 + extraWallBuffer + worldSpeed * 0.45 - difficulty * 1.8;
    const maxGap = minGap + 6.5;
    this.nextSpawnZ -= minGap + Math.random() * (maxGap - minGap);
  }

  private activateObstacle(
    kind: ObstacleKind,
    lane: LaneIndex,
    z: number,
    preferRamp = false,
  ): PooledObstacle | undefined {
    const item =
      (preferRamp
        ? this.obstacles.find((o) => !o.active && o.kind === kind && o.hasRamp)
        : undefined) ?? this.obstacles.find((o) => !o.active && o.kind === kind);
    if (!item) return undefined;
    item.active = true;
    item.triggered = false;
    item.passSoundPlayed = false;
    item.nearMissAwarded = false;
    item.lane = lane;
    item.z = z;
    item.mesh.position.set(lane * GAME_CONSTANTS.LANE_WIDTH, 0, z);
    item.mesh.visible = true;
    return item;
  }

  private activateWallGate(
    kind: 'WALL_GATE_1' | 'WALL_GATE_2',
    z: number,
    openLanes: LaneIndex[],
  ): void {
    const wall = this.obstacles.find((o) => !o.active && o.kind === kind);
    if (!wall || !wall.laneBlocks || !wall.singleArchFrames || !wall.doubleArchFrames) return;
    wall.active = true;
    wall.triggered = false;
    wall.passSoundPlayed = false;
    wall.lane = 0;
    wall.openLanes = [...openLanes];
    wall.z = z;
    wall.mesh.position.set(0, 0, z);

    const laneList: LaneIndex[] = [-1, 0, 1];
    for (let i = 0; i < 3; i++) {
      const isOpen = openLanes.includes(laneList[i]);
      wall.laneBlocks[i].visible = !isOpen;
      wall.singleArchFrames[i].visible = kind === 'WALL_GATE_1' && isOpen;
    }

    if (kind === 'WALL_GATE_2') {
      const isLeftPair = openLanes.includes(-1) && openLanes.includes(0);
      wall.doubleArchFrames[0].visible = isLeftPair;
      wall.doubleArchFrames[1].visible = !isLeftPair;
    } else {
      wall.doubleArchFrames[0].visible = false;
      wall.doubleArchFrames[1].visible = false;
    }

    wall.mesh.visible = true;
  }

  private spawnCoinLine(
    lane: LaneIndex,
    startZ: number,
    count: number,
    stepZ: number,
    y: number,
  ): void {
    const x = lane * GAME_CONSTANTS.LANE_WIDTH;
    for (let i = 0; i < count; i++) {
      this.activateCoin(x, y, startZ - i * stepZ);
    }
  }

  private spawnCoinArc(lane: LaneIndex, centerZ: number): void {
    const x = lane * GAME_CONSTANTS.LANE_WIDTH;
    const offsets = [-3.2, -1.6, 0, 1.6, 3.2];
    const heights = [1.0, 1.85, 2.35, 1.85, 1.0];
    for (let i = 0; i < offsets.length; i++) {
      this.activateCoin(x, heights[i], centerZ + offsets[i]);
    }
  }

  private spawnRampToRoofCoinArc(lane: LaneIndex, trainZ: number, halfDepth: number): void {
    const x = lane * GAME_CONSTANTS.LANE_WIDTH;
    const rampTopZ = trainZ + halfDepth;
    // Ascending arc up the 3.0m incline ramp
    this.activateCoin(x, 1.15, rampTopZ + 2.8);
    this.activateCoin(x, 2.1, rampTopZ + 1.5);
    this.activateCoin(x, 3.15, rampTopZ + 0.2);
    // Rooftop coin line along the train top
    this.activateCoin(x, 3.65, rampTopZ - 1.2);
    this.activateCoin(x, 3.65, rampTopZ - 2.6);
    this.activateCoin(x, 3.65, rampTopZ - 4.0);
  }

  private activateCoin(x: number, y: number, z: number): void {
    const coin = this.coins.find((c) => !c.active);
    if (!coin) return;
    coin.active = true;
    coin.x = x;
    coin.y = y;
    coin.z = z;
    coin.mesh.position.set(x, y, z);
    coin.mesh.visible = true;
  }

  private activateSakuraToken(x: number, y: number, z: number): void {
    const tok = this.sakuraTokens.find((t) => !t.active);
    if (!tok) return;
    tok.active = true;
    tok.x = x;
    tok.y = y;
    tok.z = z;
    tok.mesh.position.set(x, y, z);
    tok.mesh.visible = true;
  }

  private activateFuelCan(x: number, y: number, z: number): void {
    const can = this.fuelCans.find((c) => !c.active);
    if (!can) return;
    can.active = true;
    can.x = x;
    can.y = y;
    can.z = z;
    can.mesh.position.set(x, y, z);
    can.mesh.visible = true;
  }

  private activatePowerup(kind: PowerupKind, x: number, y: number, z: number): void {
    const pu = this.powerups.find((p) => !p.active && p.kind === kind);
    if (!pu) return;
    pu.active = true;
    pu.x = x;
    pu.y = y;
    pu.z = z;
    pu.mesh.position.set(x, y, z);
    pu.mesh.visible = true;
  }

  private activateRushLetter(letter: RushLetter, x: number, y: number, z: number): void {
    const rl = this.rushLetters.find((r) => r.letter === letter && !r.active);
    if (!rl) return;
    rl.active = true;
    rl.x = x;
    rl.y = y;
    rl.z = z;
    rl.mesh.position.set(x, y, z);
    rl.mesh.visible = true;
  }

  private createRushLetterTexture(letter: RushLetter): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 128, 128);
      grad.addColorStop(0, '#facc15');
      grad.addColorStop(0.55, '#f97316');
      grad.addColorStop(1, '#e11d48');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.strokeRect(8, 8, 112, 112);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 76px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letter, 64, 68);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private createRecordGate(
    scene: THREE.Scene,
    curveUniforms: WorldCurveUniforms,
    goldTrimMat: THREE.Material,
    cyanSignalMat: THREE.Material,
  ): THREE.Group {
    const group = new THREE.Group();
    const pillarGeo = new THREE.BoxGeometry(0.42, 4.4, 0.42);
    const bannerGeo = new THREE.BoxGeometry(8.6, 1.05, 0.34);

    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 512;
    bannerCanvas.height = 96;
    const ctx = bannerCanvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 512, 0);
      grad.addColorStop(0, '#e11d48');
      grad.addColorStop(0.5, '#f59e0b');
      grad.addColorStop(1, '#0284c7');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 96);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 6;
      ctx.strokeRect(4, 4, 504, 88);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 42px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★ TON RECORD · 記録 ★', 256, 50);
    }
    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    bannerTex.colorSpace = THREE.SRGBColorSpace;
    const bannerMat = new THREE.MeshStandardMaterial({
      map: bannerTex,
      emissive: 0x78350f,
      emissiveIntensity: 0.45,
      roughness: 0.25,
    });
    applyWorldCurveShader(bannerMat, curveUniforms);
    this.sharedDisposables.push(pillarGeo, bannerGeo, bannerTex, bannerMat);

    const leftPillar = new THREE.Mesh(pillarGeo, cyanSignalMat);
    leftPillar.position.set(-4.1, 2.2, 0);
    const rightPillar = new THREE.Mesh(pillarGeo, goldTrimMat);
    rightPillar.position.set(4.1, 2.2, 0);
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(0, 4.25, 0);

    group.add(leftPillar, rightPillar, banner);
    group.visible = false;
    scene.add(group);
    return group;
  }

  public getSupportFloorY(runnerX: number, runnerY: number, runnerZ: number): number {
    let supportY = 0;
    for (const obs of this.obstacles) {
      if (!obs.active || obs.kind !== 'MOVING_CART') continue;
      const obsX = obs.lane * GAME_CONSTANTS.LANE_WIDTH;
      const y = getTrainSupportY(
        runnerX,
        runnerY,
        runnerZ,
        obsX,
        obs.z,
        obs.halfWidth,
        obs.halfDepth,
        obs.maxY,
        obs.hasRamp,
        3.0,
      );
      if (y > supportY) supportY = y;
    }
    return supportY;
  }

  public checkCollisions(
    runnerX: number,
    runnerY: number,
    isSliding: boolean,
    runnerZ: number,
    isChangingLane: boolean,
    canTakeBump: boolean,
    skipObstacles = false,
  ): {
    hitKind: ObstacleHitKind;
    coinsCollected: number;
    sakuraCollected: number;
    fuelCollected: number;
    pickedPowerup: PowerupKind | null;
    nearMisses: number;
    rushMaskCollected: number;
  } {
    const runnerBox = getRunnerAabb(runnerX, runnerY, runnerZ, isSliding);

    let hitKind: ObstacleHitKind = 'NONE';
    let nearMisses = 0;
    if (!skipObstacles) {
      for (const obs of this.obstacles) {
        if (!obs.active) continue;

        if (obs.kind === 'WALL_GATE_1' || obs.kind === 'WALL_GATE_2') {
          const hitWall = checkWallGateCollision(
            runnerBox,
            obs.z,
            obs.halfDepth,
            obs.openLanes,
            GAME_CONSTANTS.LANE_WIDTH,
          );
          if (hitWall) {
            hitKind = 'CRASH';
            this.emitBurst(runnerX, 1.3, runnerZ, 24, 0xff4444);
            break;
          }
          continue;
        }

        const obsX = obs.lane * GAME_CONSTANTS.LANE_WIDTH;
        const onTrainRoofOrRamp =
          obs.kind === 'MOVING_CART' &&
          (runnerY >= obs.maxY - 0.55 ||
            (obs.hasRamp &&
              runnerZ >= obs.z + obs.halfDepth - 0.15 &&
              runnerZ <= obs.z + obs.halfDepth + 3.15 &&
              Math.abs(runnerX - obsX) <= obs.halfWidth + 0.24));

        const obsBox = {
          minX: obsX - obs.halfWidth,
          maxX: obsX + obs.halfWidth,
          minY: obs.minY,
          maxY: obs.maxY,
          minZ: obs.z - obs.halfDepth,
          maxZ: obs.z + obs.halfDepth,
        };
        if (!onTrainRoofOrRamp && boxesOverlap(runnerBox, obsBox)) {
          const hitFrontOfMovingCart =
            obs.kind === 'MOVING_CART' && runnerZ >= obs.z + obs.halfDepth - 0.45;
          if (
            canTakeBump &&
            !hitFrontOfMovingCart &&
            isSideGrazeCollision(runnerX, obsX, obs.halfWidth, isChangingLane)
          ) {
            hitKind = 'BUMP';
            this.emitBurst(runnerX, (runnerBox.minY + runnerBox.maxY) * 0.5, runnerZ, 14, 0xf97316);
          } else {
            hitKind = 'CRASH';
            this.emitBurst(runnerX, (runnerBox.minY + runnerBox.maxY) * 0.5, runnerZ, 22, 0xff4444);
          }
          break;
        }

        if (
          !obs.nearMissAwarded &&
          !onTrainRoofOrRamp &&
          isNearMissDodge(
            runnerX,
            runnerY,
            runnerZ,
            obsX,
            obs.z,
            obs.halfWidth,
            obs.maxY,
            obs.halfDepth,
            GAME_CONSTANTS.LANE_WIDTH,
          )
        ) {
          obs.nearMissAwarded = true;
          nearMisses++;
          this.emitBurst(runnerX, runnerY + 0.9, runnerZ, 8, 0x38bdf8);
        }
      }
    }

    let coinsCollected = 0;
    const coinPickupRadiusXZ = 0.96;
    const coinPickupRadiusY = 1.0;
    const runnerCenterY = (runnerBox.minY + runnerBox.maxY) * 0.5;
    for (const coin of this.coins) {
      if (!coin.active) continue;
      if (
        Math.abs(coin.z - runnerZ) < coinPickupRadiusXZ &&
        Math.abs(coin.x - runnerX) < coinPickupRadiusXZ &&
        Math.abs(coin.y - runnerCenterY) < coinPickupRadiusY
      ) {
        coin.active = false;
        coin.mesh.visible = false;
        coinsCollected++;
        this.emitBurst(coin.x, coin.y, coin.z, 8, 0xfacc15);
      }
    }

    let sakuraCollected = 0;
    for (const tok of this.sakuraTokens) {
      if (!tok.active) continue;
      if (
        Math.abs(tok.z - runnerZ) < 1.0 &&
        Math.abs(tok.x - runnerX) < 1.0 &&
        Math.abs(tok.y - runnerCenterY) < 1.05
      ) {
        tok.active = false;
        tok.mesh.visible = false;
        sakuraCollected++;
        this.emitBurst(tok.x, tok.y, tok.z, 12, 0xf472b6);
      }
    }

    let fuelCollected = 0;
    for (const can of this.fuelCans) {
      if (!can.active) continue;
      if (
        Math.abs(can.z - runnerZ) < 1.05 &&
        Math.abs(can.x - runnerX) < 1.05 &&
        Math.abs(can.y - runnerCenterY) < 1.15
      ) {
        can.active = false;
        can.mesh.visible = false;
        fuelCollected++;
        this.emitBurst(can.x, can.y, can.z, 14, 0xf97316);
      }
    }

    let pickedPowerup: PowerupKind | null = null;
    for (const pu of this.powerups) {
      if (!pu.active) continue;
      if (
        Math.abs(pu.z - runnerZ) < 1.0 &&
        Math.abs(pu.x - runnerX) < 1.0 &&
        Math.abs(pu.y - runnerCenterY) < 1.05
      ) {
        pu.active = false;
        pu.mesh.visible = false;
        pickedPowerup = pu.kind;
        this.emitBurst(pu.x, pu.y, pu.z, 14, pu.kind === 'MAGNET' ? 0x38bdf8 : 0x22c55e);
      }
    }

    let rushMaskCollected = 0;
    for (const rl of this.rushLetters) {
      if (!rl.active) continue;
      if (
        Math.abs(rl.z - runnerZ) < 1.15 &&
        Math.abs(rl.x - runnerX) < 1.15 &&
        Math.abs(rl.y - runnerCenterY) < 1.25
      ) {
        rl.active = false;
        rl.mesh.visible = false;
        rushMaskCollected |= rl.bit;
        this.emitBurst(rl.x, rl.y, rl.z, 16, 0xfacc15);
      }
    }

    return {
      hitKind,
      coinsCollected,
      sakuraCollected,
      fuelCollected,
      pickedPowerup,
      nearMisses,
      rushMaskCollected,
    };
  }

  private emitBurst(x: number, y: number, z: number, count: number, hexColor: number): void {
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < count; i++) {
      const p = this.particles[i];
      if (p.active) continue;
      p.active = true;
      p.x = x;
      p.y = y;
      p.z = z;
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 4.5;
      p.vx = Math.cos(angle) * speed;
      p.vy = 2.2 + Math.random() * 4.2;
      p.vz = Math.sin(angle) * speed;
      p.maxLife = 0.35 + Math.random() * 0.2;
      p.life = p.maxLife;
      p.color.setHex(hexColor);
      this.particleMesh.setColorAt(i, p.color);
      spawned++;
    }
    if (this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  public dispose(): void {
    for (const item of this.sharedDisposables) {
      item.dispose();
    }
  }
}
