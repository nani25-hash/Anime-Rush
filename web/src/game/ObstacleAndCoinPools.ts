import * as THREE from 'three';
import { GAME_CONSTANTS, LaneIndex, ObstacleKind } from '../types/game';
import { boxesOverlap, getRunnerAabb } from './collisionMath';

export interface PooledObstacle {
  kind: ObstacleKind;
  mesh: THREE.Group;
  active: boolean;
  lane: LaneIndex;
  z: number;
  halfWidth: number;
  minY: number;
  maxY: number;
  halfDepth: number;
}

export interface PooledCoin {
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
  private readonly particles: Particle[] = [];
  private readonly particleMesh: THREE.InstancedMesh;

  private readonly dummyMatrix = new THREE.Matrix4();
  private readonly dummyPos = new THREE.Vector3();
  private readonly dummyQuat = new THREE.Quaternion();
  private readonly dummyScale = new THREE.Vector3();

  private readonly sharedDisposables: Array<{ dispose: () => void }> = [];
  private nextSpawnZ = -38;
  private waveCounter = 0;

  constructor(scene: THREE.Scene, shadowTexture: THREE.Texture) {
    const redLacquerMat = new THREE.MeshStandardMaterial({
      color: 0xd92626,
      roughness: 0.35,
      metalness: 0.2,
    });
    const darkTimberMat = new THREE.MeshStandardMaterial({
      color: 0x1c192b,
      roughness: 0.72,
      metalness: 0.12,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xb45309,
      emissiveIntensity: 0.75,
      roughness: 0.25,
      metalness: 0.85,
    });
    const cyanRuneMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });
    const talismanMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.5,
      roughness: 0.5,
    });
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    });

    this.sharedDisposables.push(
      redLacquerMat,
      darkTimberMat,
      goldMat,
      cyanRuneMat,
      talismanMat,
      shadowMat,
    );

    // Pre-allocate 10 of each obstacle type (30 total pooled obstacles)
    for (let i = 0; i < 10; i++) {
      this.obstacles.push(
        this.createLowBarrier(scene, redLacquerMat, darkTimberMat, goldMat, talismanMat, shadowMat),
      );
      this.obstacles.push(
        this.createHighBeam(scene, redLacquerMat, darkTimberMat, cyanRuneMat, talismanMat, shadowMat),
      );
      this.obstacles.push(
        this.createFullPillar(scene, darkTimberMat, redLacquerMat, cyanRuneMat, goldMat, shadowMat),
      );
    }

    // Pre-allocate 60 spinning Shuriken-Ryo coins
    const coinRingGeo = new THREE.TorusGeometry(0.32, 0.08, 8, 16);
    const coinCoreGeo = new THREE.OctahedronGeometry(0.18, 0);
    const coinShadowGeo = new THREE.PlaneGeometry(0.75, 0.75);
    this.sharedDisposables.push(coinRingGeo, coinCoreGeo, coinShadowGeo);

    for (let i = 0; i < 60; i++) {
      const group = new THREE.Group();
      const ring = new THREE.Mesh(coinRingGeo, goldMat);
      const core = new THREE.Mesh(coinCoreGeo, cyanRuneMat);
      core.scale.set(1, 1, 0.4);
      const shadow = new THREE.Mesh(coinShadowGeo, shadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -0.85;
      group.add(ring, core);
      group.visible = false;
      scene.add(group);
      this.coins.push({
        mesh: group,
        active: false,
        x: 0,
        y: 1.0,
        z: 0,
        phase: i * 0.45,
      });
    }

    // Pre-allocate 72 pooled particle instances
    const pGeo = new THREE.OctahedronGeometry(0.12, 0);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
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
    redMat: THREE.Material,
    darkMat: THREE.Material,
    goldMat: THREE.Material,
    talismanMat: THREE.Material,
    shadowMat: THREE.Material,
  ): PooledObstacle {
    const group = new THREE.Group();
    const postGeo = new THREE.BoxGeometry(0.24, 1.0, 0.28);
    const barGeo = new THREE.BoxGeometry(1.9, 0.26, 0.24);
    const capGeo = new THREE.BoxGeometry(1.96, 0.1, 0.28);
    const talismanGeo = new THREE.BoxGeometry(0.18, 0.34, 0.04);
    const shadowGeo = new THREE.PlaneGeometry(2.1, 1.1);
    this.sharedDisposables.push(postGeo, barGeo, capGeo, talismanGeo, shadowGeo);

    const leftPost = new THREE.Mesh(postGeo, darkMat);
    leftPost.position.set(-0.78, 0.5, 0);
    leftPost.castShadow = true;
    const rightPost = new THREE.Mesh(postGeo, darkMat);
    rightPost.position.set(0.78, 0.5, 0);
    rightPost.castShadow = true;

    const upperBar = new THREE.Mesh(barGeo, redMat);
    upperBar.position.set(0, 0.86, 0);
    upperBar.castShadow = true;

    const goldTrim = new THREE.Mesh(capGeo, goldMat);
    goldTrim.position.set(0, 1.02, 0);

    const lowerBar = new THREE.Mesh(barGeo, darkMat);
    lowerBar.position.set(0, 0.42, 0);

    for (const tx of [-0.42, 0, 0.42]) {
      const talisman = new THREE.Mesh(talismanGeo, talismanMat);
      talisman.position.set(tx, 0.66, 0.14);
      group.add(talisman);
    }

    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.025;

    group.add(leftPost, rightPost, upperBar, goldTrim, lowerBar, shadow);
    group.visible = false;
    scene.add(group);

    return {
      kind: 'LOW_BARRIER',
      mesh: group,
      active: false,
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
    redMat: THREE.Material,
    darkMat: THREE.Material,
    cyanMat: THREE.Material,
    talismanMat: THREE.Material,
    shadowMat: THREE.Material,
  ): PooledObstacle {
    const group = new THREE.Group();
    const legGeo = new THREE.CylinderGeometry(0.12, 0.14, 2.75, 8);
    const beamGeo = new THREE.BoxGeometry(2.15, 0.65, 0.42);
    const trimGeo = new THREE.BoxGeometry(2.2, 0.1, 0.46);
    const bannerGeo = new THREE.BoxGeometry(0.28, 0.48, 0.08);
    const shadowGeo = new THREE.PlaneGeometry(2.2, 1.0);
    this.sharedDisposables.push(legGeo, beamGeo, trimGeo, bannerGeo, shadowGeo);

    const leftLeg = new THREE.Mesh(legGeo, darkMat);
    leftLeg.position.set(-0.94, 1.38, 0);
    leftLeg.castShadow = true;
    const rightLeg = new THREE.Mesh(legGeo, darkMat);
    rightLeg.position.set(0.94, 1.38, 0);
    rightLeg.castShadow = true;

    const beam = new THREE.Mesh(beamGeo, redMat);
    beam.position.set(0, 1.95, 0);
    beam.castShadow = true;

    const topCap = new THREE.Mesh(trimGeo, darkMat);
    topCap.position.set(0, 2.34, 0);

    const bottomGlow = new THREE.Mesh(trimGeo, cyanMat);
    bottomGlow.position.set(0, 1.6, 0);

    for (const bx of [-0.55, 0, 0.55]) {
      const banner = new THREE.Mesh(bannerGeo, talismanMat);
      banner.position.set(bx, 1.34, 0);
      group.add(banner);
    }

    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.025;

    group.add(leftLeg, rightLeg, beam, topCap, bottomGlow, shadow);
    group.visible = false;
    scene.add(group);

    return {
      kind: 'HIGH_BEAM',
      mesh: group,
      active: false,
      lane: 0,
      z: 0,
      halfWidth: 0.78,
      minY: 1.05,
      maxY: 2.5,
      halfDepth: 0.28,
    };
  }

  private createFullPillar(
    scene: THREE.Scene,
    darkMat: THREE.Material,
    redMat: THREE.Material,
    cyanMat: THREE.Material,
    goldMat: THREE.Material,
    shadowMat: THREE.Material,
  ): PooledObstacle {
    const group = new THREE.Group();
    const plinthGeo = new THREE.BoxGeometry(1.75, 0.45, 1.55);
    const bodyGeo = new THREE.BoxGeometry(1.48, 2.25, 1.28);
    const roofGeo = new THREE.ConeGeometry(1.25, 0.75, 4);
    const runeGeo = new THREE.BoxGeometry(0.45, 1.25, 1.34);
    const collarGeo = new THREE.BoxGeometry(1.62, 0.16, 1.42);
    const shadowGeo = new THREE.PlaneGeometry(2.1, 2.0);
    this.sharedDisposables.push(plinthGeo, bodyGeo, roofGeo, runeGeo, collarGeo, shadowGeo);

    const plinth = new THREE.Mesh(plinthGeo, darkMat);
    plinth.position.y = 0.22;
    plinth.castShadow = true;

    const body = new THREE.Mesh(bodyGeo, redMat);
    body.position.y = 1.55;
    body.castShadow = true;

    const rune = new THREE.Mesh(runeGeo, cyanMat);
    rune.position.y = 1.55;

    const collar = new THREE.Mesh(collarGeo, goldMat);
    collar.position.y = 2.7;

    const roof = new THREE.Mesh(roofGeo, darkMat);
    roof.position.y = 3.12;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;

    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.025;

    group.add(plinth, body, rune, collar, roof, shadow);
    group.visible = false;
    scene.add(group);

    return {
      kind: 'FULL_PILLAR',
      mesh: group,
      active: false,
      lane: 0,
      z: 0,
      halfWidth: 0.74,
      minY: 0,
      maxY: 3.1,
      halfDepth: 0.65,
    };
  }

  public reset(): void {
    for (const obs of this.obstacles) {
      obs.active = false;
      obs.mesh.visible = false;
    }
    for (const coin of this.coins) {
      coin.active = false;
      coin.mesh.visible = false;
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

  public update(dt: number, runnerZ: number, worldSpeed: number): void {
    // Recycle passed obstacles and coins
    const cullZ = runnerZ + 9;
    for (const obs of this.obstacles) {
      if (obs.active && obs.z > cullZ) {
        obs.active = false;
        obs.mesh.visible = false;
      }
    }
    for (const coin of this.coins) {
      if (coin.active) {
        if (coin.z > cullZ) {
          coin.active = false;
          coin.mesh.visible = false;
        } else {
          coin.phase += dt * 4.2;
          coin.mesh.rotation.y = coin.phase;
          coin.mesh.position.y = coin.y + Math.sin(coin.phase * 1.3) * 0.1;
        }
      }
    }

    // Spawn waves well ahead of runner
    const spawnHorizonZ = runnerZ - 115;
    while (this.nextSpawnZ > spawnHorizonZ) {
      this.spawnNextWave(worldSpeed);
    }

    // Update particles
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
    // Shuffle lanes deterministically-randomly
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

    if (this.waveCounter <= 2 || roll < 0.24) {
      // Single obstacle + coin line on open lane
      const kind: ObstacleKind =
        roll < 0.08 ? 'LOW_BARRIER' : roll < 0.16 ? 'HIGH_BEAM' : 'FULL_PILLAR';
      this.activateObstacle(kind, laneB, z);
      this.spawnCoinLine(openLane, z + 4, 5, 2.2, 1.0);
    } else if (roll < 0.5) {
      // Double pillars leaving 1 guaranteed clear lane with coins
      this.activateObstacle('FULL_PILLAR', laneB, z);
      if (difficulty > 0.18 || Math.random() < 0.65) {
        this.activateObstacle(Math.random() < 0.5 ? 'FULL_PILLAR' : 'LOW_BARRIER', laneC, z);
      }
      this.spawnCoinLine(openLane, z + 2, 4, 2.2, 1.0);
    } else if (roll < 0.76) {
      // Jumpable barrier with coin arc + side pillar
      this.activateObstacle('LOW_BARRIER', openLane, z);
      this.activateObstacle('FULL_PILLAR', laneB, z);
      if (difficulty > 0.3) {
        this.activateObstacle('HIGH_BEAM', laneC, z);
      }
      this.spawnCoinArc(openLane, z);
    } else {
      // Slideable high beam with low coin trail + side pillar
      this.activateObstacle('HIGH_BEAM', openLane, z);
      this.activateObstacle('FULL_PILLAR', laneB, z);
      if (difficulty > 0.25) {
        this.activateObstacle('LOW_BARRIER', laneC, z);
      }
      this.spawnCoinLine(openLane, z + 3.2, 4, 2.1, 0.52);
    }

    // Dynamic spacing scales with speed so player always has reaction window
    const minGap = 15.5 + worldSpeed * 0.45 - difficulty * 2.5;
    const maxGap = minGap + 6.5;
    this.nextSpawnZ -= minGap + Math.random() * (maxGap - minGap);
  }

  private activateObstacle(kind: ObstacleKind, lane: LaneIndex, z: number): void {
    const item = this.obstacles.find((o) => !o.active && o.kind === kind);
    if (!item) return;
    item.active = true;
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

  public checkCollisions(
    runnerX: number,
    runnerY: number,
    isSliding: boolean,
    runnerZ: number,
  ): { hitObstacle: boolean; coinsCollected: number } {
    const runnerBox = getRunnerAabb(runnerX, runnerY, runnerZ, isSliding);

    let hitObstacle = false;
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
        hitObstacle = true;
        this.emitBurst(runnerX, (runnerBox.minY + runnerBox.maxY) * 0.5, runnerZ, 22, 0xff4444);
        break;
      }
    }

    let coinsCollected = 0;
    const coinPickupRadiusXZ = 0.85;
    const coinPickupRadiusY = 0.9;
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

    return { hitObstacle, coinsCollected };
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
