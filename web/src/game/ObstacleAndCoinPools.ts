import * as THREE from 'three';
import { GAME_CONSTANTS, LaneIndex, ObstacleKind } from '../types/game';
import { boxesOverlap, getRunnerAabb, isSideGrazeCollision } from './collisionMath';
import {
  createNekoCoinTexture,
  createRushTrainFrontTexture,
  createRushTrainSideTexture,
} from './textures';
import { WorldCurveUniforms, applyWorldCurveShader } from './worldCurve';

export type ObstacleHitKind = 'NONE' | 'BUMP' | 'CRASH';
export type PowerupKind = 'MAGNET' | 'SHIELD';

export interface PooledObstacle {
  kind: ObstacleKind;
  mesh: THREE.Group;
  active: boolean;
  triggered: boolean;
  lane: LaneIndex;
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

export interface PooledPowerup {
  kind: PowerupKind;
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
  private readonly powerups: PooledPowerup[] = [];
  private readonly particles: Particle[] = [];
  private readonly particleMesh: THREE.InstancedMesh;

  private readonly dummyMatrix = new THREE.Matrix4();
  private readonly dummyPos = new THREE.Vector3();
  private readonly dummyQuat = new THREE.Quaternion();
  private readonly dummyScale = new THREE.Vector3();

  private readonly sharedDisposables: Array<{ dispose: () => void }> = [];
  private nextSpawnZ = -38;
  private waveCounter = 0;

  constructor(
    scene: THREE.Scene,
    shadowTexture: THREE.Texture,
    curveUniforms: WorldCurveUniforms,
  ) {
    const trainSideTex = createRushTrainSideTexture();
    const trainFrontTex = createRushTrainFrontTexture();
    const nekoCoinTex = createNekoCoinTexture();
    this.sharedDisposables.push(trainSideTex, trainFrontTex, nekoCoinTex);

    const redLacquerMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.38,
      metalness: 0.25,
    });
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.58,
      metalness: 0.42,
    });
    const warningYellowMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xb45309,
      emissiveIntensity: 0.55,
      roughness: 0.35,
      metalness: 0.3,
    });
    const cyanSignalMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.5,
      roughness: 0.2,
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
      roughness: 0.38,
      metalness: 0.45,
    });
    const trainFrontMat = new THREE.MeshStandardMaterial({
      map: trainFrontTex,
      roughness: 0.35,
      metalness: 0.42,
    });
    const trainRoofMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.45,
      metalness: 0.55,
    });
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      emissive: 0xfde047,
      emissiveIntensity: 2.5,
      roughness: 0.15,
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
      darkMetalMat,
      warningYellowMat,
      cyanSignalMat,
      sakuraCrystalMat,
      shieldOrbMat,
      trainSideMat,
      trainFrontMat,
      trainRoofMat,
      headlightMat,
      coinRimMat,
      coinFaceMat,
      shadowMat,
    ];
    for (const mat of curvedMaterials) {
      applyWorldCurveShader(mat, curveUniforms);
    }
    this.sharedDisposables.push(...curvedMaterials);

    // Pre-allocate railway obstacles + oncoming RUSH Express Trains
    for (let i = 0; i < 10; i++) {
      this.obstacles.push(
        this.createLowBarrier(scene, warningYellowMat, darkMetalMat, redLacquerMat, shadowMat),
      );
      this.obstacles.push(
        this.createHighBeam(scene, darkMetalMat, cyanSignalMat, warningYellowMat, shadowMat),
      );
      this.obstacles.push(
        this.createParkedTrainCar(
          scene,
          trainSideMat,
          trainFrontMat,
          trainRoofMat,
          darkMetalMat,
          shadowMat,
        ),
      );
    }
    for (let i = 0; i < 6; i++) {
      this.obstacles.push(
        this.createMovingRushTrain(
          scene,
          trainSideMat,
          trainFrontMat,
          trainRoofMat,
          darkMetalMat,
          headlightMat,
          shadowMat,
        ),
      );
    }

    // Pre-allocate 64 spinning Gold Neko Coins (matches mockup!)
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

    // Pre-allocate 14 collectible Pink Sakura Tokens (Course des Sakura event)
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

    // Pre-allocate 6 In-Run Power-Up Orbs (Magnet & Shield)
    const orbCoreGeo = new THREE.IcosahedronGeometry(0.36, 1);
    const orbHaloGeo = new THREE.TorusGeometry(0.52, 0.06, 8, 16);
    this.sharedDisposables.push(orbCoreGeo, orbHaloGeo);

    for (let i = 0; i < 6; i++) {
      const kind: PowerupKind = i % 2 === 0 ? 'MAGNET' : 'SHIELD';
      const group = new THREE.Group();
      const core = new THREE.Mesh(orbCoreGeo, kind === 'MAGNET' ? cyanSignalMat : shieldOrbMat);
      const halo = new THREE.Mesh(orbHaloGeo, warningYellowMat);
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
    yellowMat: THREE.Material,
    darkMat: THREE.Material,
    redMat: THREE.Material,
    shadowMat: THREE.Material,
  ): PooledObstacle {
    const group = new THREE.Group();
    const postGeo = new THREE.BoxGeometry(0.24, 1.0, 0.28);
    const barGeo = new THREE.BoxGeometry(1.92, 0.3, 0.24);
    const stripeGeo = new THREE.BoxGeometry(0.32, 0.32, 0.26);
    const lampGeo = new THREE.SphereGeometry(0.11, 8, 8);
    const shadowGeo = new THREE.PlaneGeometry(2.1, 1.1);
    this.sharedDisposables.push(postGeo, barGeo, stripeGeo, lampGeo, shadowGeo);

    const leftPost = new THREE.Mesh(postGeo, darkMat);
    leftPost.position.set(-0.8, 0.5, 0);
    leftPost.castShadow = true;
    const rightPost = new THREE.Mesh(postGeo, darkMat);
    rightPost.position.set(0.8, 0.5, 0);
    rightPost.castShadow = true;

    const upperBar = new THREE.Mesh(barGeo, yellowMat);
    upperBar.position.set(0, 0.85, 0);
    upperBar.castShadow = true;

    for (const sx of [-0.55, 0, 0.55]) {
      const stripe = new THREE.Mesh(stripeGeo, darkMat);
      stripe.position.set(sx, 0.85, 0);
      group.add(stripe);
    }

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
      lane: 0,
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
    yellowMat: THREE.Material,
    shadowMat: THREE.Material,
  ): PooledObstacle {
    const group = new THREE.Group();
    const legGeo = new THREE.CylinderGeometry(0.12, 0.14, 2.75, 8);
    const beamGeo = new THREE.BoxGeometry(2.15, 0.65, 0.42);
    const trimGeo = new THREE.BoxGeometry(2.2, 0.12, 0.46);
    const signalGeo = new THREE.BoxGeometry(0.45, 0.42, 0.52);
    const shadowGeo = new THREE.PlaneGeometry(2.2, 1.0);
    this.sharedDisposables.push(legGeo, beamGeo, trimGeo, signalGeo, shadowGeo);

    const leftLeg = new THREE.Mesh(legGeo, darkMat);
    leftLeg.position.set(-0.94, 1.38, 0);
    leftLeg.castShadow = true;
    const rightLeg = new THREE.Mesh(legGeo, darkMat);
    rightLeg.position.set(0.94, 1.38, 0);
    rightLeg.castShadow = true;

    const beam = new THREE.Mesh(beamGeo, darkMat);
    beam.position.set(0, 1.95, 0);
    beam.castShadow = true;

    const topCap = new THREE.Mesh(trimGeo, yellowMat);
    topCap.position.set(0, 2.34, 0);

    const bottomGlow = new THREE.Mesh(trimGeo, cyanMat);
    bottomGlow.position.set(0, 1.6, 0);

    const sigL = new THREE.Mesh(signalGeo, cyanMat);
    sigL.position.set(-0.55, 1.95, 0);
    const sigR = new THREE.Mesh(signalGeo, cyanMat);
    sigR.position.set(0.55, 1.95, 0);

    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.025;

    group.add(leftLeg, rightLeg, beam, topCap, bottomGlow, sigL, sigR, shadow);
    group.visible = false;
    scene.add(group);

    return {
      kind: 'HIGH_BEAM',
      mesh: group,
      active: false,
      triggered: false,
      lane: 0,
      z: 0,
      halfWidth: 0.78,
      minY: 1.05,
      maxY: 2.5,
      halfDepth: 0.28,
    };
  }

  private createParkedTrainCar(
    scene: THREE.Scene,
    trainSideMat: THREE.Material,
    trainFrontMat: THREE.Material,
    trainRoofMat: THREE.Material,
    darkMat: THREE.Material,
    shadowMat: THREE.Material,
  ): PooledObstacle {
    const group = new THREE.Group();
    const chassisGeo = new THREE.BoxGeometry(1.72, 0.34, 1.65);
    const bodyGeo = new THREE.BoxGeometry(1.66, 2.48, 1.56);
    const roofGeo = new THREE.BoxGeometry(1.56, 0.26, 1.58);
    const shadowGeo = new THREE.PlaneGeometry(2.1, 2.0);
    this.sharedDisposables.push(chassisGeo, bodyGeo, roofGeo, shadowGeo);

    const bodyMats = [
      trainSideMat,
      trainSideMat,
      trainRoofMat,
      darkMat,
      trainFrontMat,
      trainFrontMat,
    ];

    const chassis = new THREE.Mesh(chassisGeo, darkMat);
    chassis.position.y = 0.17;
    chassis.castShadow = true;

    const body = new THREE.Mesh(bodyGeo, bodyMats);
    body.position.y = 1.58;
    body.castShadow = true;

    const roof = new THREE.Mesh(roofGeo, trainRoofMat);
    roof.position.y = 2.95;

    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.025;

    group.add(chassis, body, roof, shadow);
    group.visible = false;
    scene.add(group);

    return {
      kind: 'FULL_PILLAR',
      mesh: group,
      active: false,
      triggered: false,
      lane: 0,
      z: 0,
      halfWidth: 0.74,
      minY: 0,
      maxY: 3.1,
      halfDepth: 0.72,
    };
  }

  private createMovingRushTrain(
    scene: THREE.Scene,
    trainSideMat: THREE.Material,
    trainFrontMat: THREE.Material,
    trainRoofMat: THREE.Material,
    darkMat: THREE.Material,
    headlightMat: THREE.Material,
    shadowMat: THREE.Material,
  ): PooledObstacle {
    const group = new THREE.Group();
    const chassisGeo = new THREE.BoxGeometry(1.8, 0.38, 4.4);
    const cabinGeo = new THREE.BoxGeometry(1.74, 2.15, 4.25);
    const roofGeo = new THREE.BoxGeometry(1.64, 0.25, 4.2);
    const acUnitGeo = new THREE.BoxGeometry(0.9, 0.22, 1.4);
    const lampGeo = new THREE.BoxGeometry(0.32, 0.24, 0.16);
    const shadowGeo = new THREE.PlaneGeometry(2.3, 4.7);
    this.sharedDisposables.push(
      chassisGeo,
      cabinGeo,
      roofGeo,
      acUnitGeo,
      lampGeo,
      shadowGeo,
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
    chassis.position.y = 0.19;
    chassis.castShadow = true;

    const cabin = new THREE.Mesh(cabinGeo, bodyMats);
    cabin.position.y = 1.45;
    cabin.castShadow = true;

    const roof = new THREE.Mesh(roofGeo, trainRoofMat);
    roof.position.y = 2.65;

    const acUnit = new THREE.Mesh(acUnitGeo, darkMat);
    acUnit.position.y = 2.86;

    const leftLamp = new THREE.Mesh(lampGeo, headlightMat);
    leftLamp.position.set(-0.54, 0.85, 2.12);
    const rightLamp = new THREE.Mesh(lampGeo, headlightMat);
    rightLamp.position.set(0.54, 0.85, 2.12);

    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.025;

    group.add(chassis, cabin, roof, acUnit, leftLamp, rightLamp, shadow);
    group.visible = false;
    scene.add(group);

    return {
      kind: 'MOVING_CART',
      mesh: group,
      active: false,
      triggered: false,
      lane: 0,
      z: 0,
      halfWidth: 0.78,
      minY: 0,
      maxY: 2.75,
      halfDepth: 2.05,
    };
  }

  public reset(): void {
    for (const obs of this.obstacles) {
      obs.active = false;
      obs.triggered = false;
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
    for (const pu of this.powerups) {
      pu.active = false;
      pu.mesh.visible = false;
    }
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].active = false;
      this.dummyPos.set(0, -50, 0);
      this.dummyScale.set(0, 0, 0);
      this.dummyMatrix.compose(this.dummyPos, this.dummyQuat, this.dummyScale);
      this.particleMesh.setMatrixAt(i, this.dummyMatrix);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    this.nextSpawnZ = -36;
    this.waveCounter = 0;
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

  public update(
    dt: number,
    runnerZ: number,
    worldSpeed: number,
    runnerX = 0,
    runnerY = 0,
    magnetActive = false,
  ): void {
    const cullZ = runnerZ + 12;
    for (const obs of this.obstacles) {
      if (!obs.active) continue;
      if (obs.kind === 'MOVING_CART' && worldSpeed > 0) {
        if (!obs.triggered && Math.abs(obs.z - runnerZ) <= GAME_CONSTANTS.MOVING_CART_TRIGGER_DIST) {
          obs.triggered = true;
        }
        if (obs.triggered) {
          obs.z += GAME_CONSTANTS.MOVING_CART_SPEED * dt;
          obs.mesh.position.z = obs.z;
        }
      }
      if (obs.z > cullZ) {
        obs.active = false;
        obs.triggered = false;
        obs.mesh.visible = false;
      }
    }

    const attractLerp = 1 - Math.exp(-12 * dt);
    for (const coin of this.coins) {
      if (!coin.active) continue;
      if (coin.z > cullZ) {
        coin.active = false;
        coin.mesh.visible = false;
      } else {
        if (magnetActive) {
          const dz = coin.z - runnerZ;
          const dx = coin.x - runnerX;
          if (Math.abs(dz) < 8.5 && Math.abs(dx) < 6.0) {
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

    const spawnHorizonZ = runnerZ - 115;
    while (this.nextSpawnZ > spawnHorizonZ) {
      this.spawnNextWave(worldSpeed);
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
  }

  private spawnNextWave(worldSpeed: number): void {
    const z = this.nextSpawnZ;
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

    const roll = Math.random();

    if (this.waveCounter <= 2 || roll < 0.22) {
      const kind: ObstacleKind =
        roll < 0.08 ? 'LOW_BARRIER' : roll < 0.15 ? 'HIGH_BEAM' : 'FULL_PILLAR';
      this.activateObstacle(kind, laneB, z);
      this.spawnCoinLine(openLane, z + 4, 5, 2.2, 1.0);
    } else if (roll < 0.44) {
      this.activateObstacle('FULL_PILLAR', laneB, z);
      if (difficulty > 0.18 || Math.random() < 0.65) {
        this.activateObstacle(Math.random() < 0.5 ? 'FULL_PILLAR' : 'LOW_BARRIER', laneC, z);
      }
      this.spawnCoinLine(openLane, z + 2, 4, 2.2, 1.0);
    } else if (roll < 0.64) {
      this.activateObstacle('LOW_BARRIER', openLane, z);
      this.activateObstacle('FULL_PILLAR', laneB, z);
      if (difficulty > 0.3) {
        this.activateObstacle('HIGH_BEAM', laneC, z);
      }
      this.spawnCoinArc(openLane, z);
    } else if (roll < 0.8) {
      this.activateObstacle('HIGH_BEAM', openLane, z);
      this.activateObstacle('FULL_PILLAR', laneB, z);
      if (difficulty > 0.25) {
        this.activateObstacle('LOW_BARRIER', laneC, z);
      }
      this.spawnCoinLine(openLane, z + 3.2, 4, 2.1, 0.52);
    } else {
      this.activateObstacle('MOVING_CART', laneB, z - 4);
      if (difficulty > 0.2) {
        this.activateObstacle(Math.random() < 0.5 ? 'LOW_BARRIER' : 'HIGH_BEAM', laneC, z);
      }
      this.spawnCoinLine(openLane, z + 3.5, 5, 2.2, 1.0);
    }

    // Periodically place Sakura Token or In-Run Power-Up on open lane!
    if (this.waveCounter % 3 === 0) {
      this.activateSakuraToken(openLane * GAME_CONSTANTS.LANE_WIDTH, 1.15, z - 6.5);
    } else if (this.waveCounter % 7 === 0) {
      const kind: PowerupKind = this.waveCounter % 14 === 0 ? 'SHIELD' : 'MAGNET';
      this.activatePowerup(kind, openLane * GAME_CONSTANTS.LANE_WIDTH, 1.15, z - 6.5);
    }

    const minGap = 16.5 + worldSpeed * 0.45 - difficulty * 2.2;
    const maxGap = minGap + 6.5;
    this.nextSpawnZ -= minGap + Math.random() * (maxGap - minGap);
  }

  private activateObstacle(kind: ObstacleKind, lane: LaneIndex, z: number): void {
    const item = this.obstacles.find((o) => !o.active && o.kind === kind);
    if (!item) return;
    item.active = true;
    item.triggered = false;
    item.lane = lane;
    item.z = z;
    item.mesh.position.set(lane * GAME_CONSTANTS.LANE_WIDTH, 0, z);
    item.mesh.visible = true;
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

  public checkCollisions(
    runnerX: number,
    runnerY: number,
    isSliding: boolean,
    runnerZ: number,
    isChangingLane: boolean,
    canTakeBump: boolean,
  ): {
    hitKind: ObstacleHitKind;
    coinsCollected: number;
    sakuraCollected: number;
    pickedPowerup: PowerupKind | null;
  } {
    const runnerBox = getRunnerAabb(runnerX, runnerY, runnerZ, isSliding);

    let hitKind: ObstacleHitKind = 'NONE';
    for (const obs of this.obstacles) {
      if (!obs.active) continue;
      const obsX = obs.lane * GAME_CONSTANTS.LANE_WIDTH;
      const obsBox = {
        minX: obsX - obs.halfWidth,
        maxX: obsX + obs.halfWidth,
        minY: obs.minY,
        maxY: obs.maxY,
        minZ: obs.z - obs.halfDepth,
        maxZ: obs.z + obs.halfDepth,
      };
      if (boxesOverlap(runnerBox, obsBox)) {
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
    }

    let coinsCollected = 0;
    const coinPickupRadiusXZ = 0.92;
    const coinPickupRadiusY = 0.95;
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
        Math.abs(tok.z - runnerZ) < 0.95 &&
        Math.abs(tok.x - runnerX) < 0.95 &&
        Math.abs(tok.y - runnerCenterY) < 1.0
      ) {
        tok.active = false;
        tok.mesh.visible = false;
        sakuraCollected++;
        this.emitBurst(tok.x, tok.y, tok.z, 12, 0xf472b6);
      }
    }

    let pickedPowerup: PowerupKind | null = null;
    for (const pu of this.powerups) {
      if (!pu.active) continue;
      if (
        Math.abs(pu.z - runnerZ) < 0.95 &&
        Math.abs(pu.x - runnerX) < 0.95 &&
        Math.abs(pu.y - runnerCenterY) < 1.0
      ) {
        pu.active = false;
        pu.mesh.visible = false;
        pickedPowerup = pu.kind;
        this.emitBurst(pu.x, pu.y, pu.z, 14, pu.kind === 'MAGNET' ? 0x38bdf8 : 0x22c55e);
      }
    }

    return { hitKind, coinsCollected, sakuraCollected, pickedPowerup };
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
