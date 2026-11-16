import * as THREE from 'three';
import { GAME_CONSTANTS, QualityPreset } from '../types/game';
import {
  createAnimeTwilightSkyTexture,
  createMoonGlowTexture,
  createNeonSignTexture,
  createRailwayTrackTexture,
  createRoadBumpTexture,
  createWoodGrainTexture,
} from './textures';
import { WorldCurveUniforms, applyWorldCurveShader } from './worldCurve';

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
}

export class EnvironmentBuilder {
  private readonly segments: THREE.Group[] = [];
  private readonly backdropGroup = new THREE.Group();
  private readonly petalInstancedMesh: THREE.InstancedMesh;
  private readonly petalStates: PetalState[] = [];
  private readonly maxPetals = 240;
  private activePetalCount = 150;

  private readonly dummyMatrix = new THREE.Matrix4();
  private readonly dummyEuler = new THREE.Euler();
  private readonly dummyQuat = new THREE.Quaternion();
  private readonly dummyPos = new THREE.Vector3();
  private readonly dummyScale = new THREE.Vector3(1, 1, 1);

  private readonly sharedDisposables: Array<{ dispose: () => void }> = [];

  constructor(scene: THREE.Scene, curveUniforms: WorldCurveUniforms) {
    const trackTex = createRailwayTrackTexture();
    const bumpTex = createRoadBumpTexture();
    const skyTex = createAnimeTwilightSkyTexture();
    const woodTex = createWoodGrainTexture();
    const glowTex = createMoonGlowTexture();
    const signDreamTex = createNeonSignTexture('夢はまだ終わらない', 'GOOD RUNS · BETTER DAYS', '#1e1b4b', '#f472b6');
    const signRushTex = createNeonSignTexture('走 ANIME RUSH', 'TOKYO EXPRESS', '#0f172a', '#38bdf8');
    const signSakuraTex = createNeonSignTexture('桜駅 SAKURA', 'SHINKANSEN', '#3b0764', '#facc15');
    this.sharedDisposables.push(
      trackTex,
      bumpTex,
      skyTex,
      woodTex,
      glowTex,
      signDreamTex,
      signRushTex,
      signSakuraTex,
    );

    const trackMat = new THREE.MeshStandardMaterial({
      map: trackTex,
      bumpMap: bumpTex,
      bumpScale: 0.08,
      roughness: 0.7,
      metalness: 0.16,
    });
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x323954,
      roughness: 0.82,
      metalness: 0.08,
    });
    const platformEdgeMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xb45309,
      emissiveIntensity: 0.25,
      roughness: 0.5,
    });
    const buildingDarkMat = new THREE.MeshStandardMaterial({
      color: 0x1e2544,
      roughness: 0.74,
      metalness: 0.16,
    });
    const buildingSlateMat = new THREE.MeshStandardMaterial({
      color: 0x2a335a,
      roughness: 0.68,
      metalness: 0.2,
    });
    const windowGlowMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.85,
      roughness: 0.25,
    });
    const warmWindowMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.95,
      roughness: 0.3,
    });
    const steelGantryMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.45,
      metalness: 0.65,
    });
    const toriiWoodMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      color: 0xd93829,
      roughness: 0.42,
      metalness: 0.1,
    });
    const darkWoodMat = new THREE.MeshStandardMaterial({
      color: 0x1b1521,
      roughness: 0.72,
      metalness: 0.14,
    });
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0x78350f,
      emissiveIntensity: 0.35,
      roughness: 0.3,
      metalness: 0.8,
    });
    const sakuraPinkMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      emissive: 0x9d174d,
      emissiveIntensity: 0.32,
      roughness: 0.72,
    });
    const sakuraPaleMat = new THREE.MeshStandardMaterial({
      color: 0xfbcfe8,
      emissive: 0xbe185d,
      emissiveIntensity: 0.22,
      roughness: 0.68,
    });
    const signDreamMat = new THREE.MeshBasicMaterial({ map: signDreamTex });
    const signRushMat = new THREE.MeshBasicMaterial({ map: signRushTex });
    const signSakuraMat = new THREE.MeshBasicMaterial({ map: signSakuraTex });

    const curvedMaterials: THREE.Material[] = [
      trackMat,
      platformMat,
      platformEdgeMat,
      buildingDarkMat,
      buildingSlateMat,
      windowGlowMat,
      warmWindowMat,
      steelGantryMat,
      toriiWoodMat,
      darkWoodMat,
      goldTrimMat,
      sakuraPinkMat,
      sakuraPaleMat,
      signDreamMat,
      signRushMat,
      signSakuraMat,
    ];
    for (const mat of curvedMaterials) {
      applyWorldCurveShader(mat, curveUniforms);
    }
    this.sharedDisposables.push(...curvedMaterials);

    // Track & Station Platform Geometries
    const roadGeo = new THREE.PlaneGeometry(
      GAME_CONSTANTS.ROAD_WIDTH,
      GAME_CONSTANTS.SEGMENT_LENGTH,
    );
    const platformGeo = new THREE.BoxGeometry(14, 0.75, GAME_CONSTANTS.SEGMENT_LENGTH);
    const edgeLineGeo = new THREE.BoxGeometry(0.16, 0.08, GAME_CONSTANTS.SEGMENT_LENGTH);
    const buildingBodyGeo = new THREE.BoxGeometry(4.2, 11.5, 8.8);
    const buildingTallGeo = new THREE.BoxGeometry(4.8, 16.5, 9.4);
    const windowStripGeo = new THREE.BoxGeometry(4.32, 0.75, 7.6);
    const signGeo = new THREE.PlaneGeometry(4.2, 2.1);

    // Sakura Tree & Shrub Geometries
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.38, 4.4, 8);
    const branchGeo = new THREE.CylinderGeometry(0.11, 0.18, 2.4, 7);
    const blossomGeo = new THREE.IcosahedronGeometry(1.45, 1);

    // Railway Catenary Gantry Geometries
    const gantryPostGeo = new THREE.BoxGeometry(0.28, 8.0, 0.28);
    const gantryBeamGeo = new THREE.BoxGeometry(10.2, 0.3, 0.34);
    const wireGeo = new THREE.CylinderGeometry(0.028, 0.028, GAME_CONSTANTS.SEGMENT_LENGTH, 6);

    // Vermilion Torii Gate Geometries
    const toriiBaseGeo = new THREE.CylinderGeometry(0.46, 0.52, 0.65, 10);
    const toriiPillarGeo = new THREE.CylinderGeometry(0.32, 0.37, 8.2, 12);
    const toriiTopGeo = new THREE.BoxGeometry(11.0, 0.54, 0.78);
    const toriiWingGeo = new THREE.BoxGeometry(1.75, 0.48, 0.78);
    const toriiCapGeo = new THREE.BoxGeometry(11.5, 0.2, 0.86);
    const toriiSubGeo = new THREE.BoxGeometry(9.8, 0.38, 0.54);
    const toriiPlaqueGeo = new THREE.BoxGeometry(1.1, 1.2, 0.38);
    const toriiPlaqueRimGeo = new THREE.BoxGeometry(1.24, 1.34, 0.28);

    this.sharedDisposables.push(
      roadGeo,
      platformGeo,
      edgeLineGeo,
      buildingBodyGeo,
      buildingTallGeo,
      windowStripGeo,
      signGeo,
      trunkGeo,
      branchGeo,
      blossomGeo,
      gantryPostGeo,
      gantryBeamGeo,
      wireGeo,
      toriiBaseGeo,
      toriiPillarGeo,
      toriiTopGeo,
      toriiWingGeo,
      toriiCapGeo,
      toriiSubGeo,
      toriiPlaqueGeo,
      toriiPlaqueRimGeo,
    );

    const signMats = [signDreamMat, signRushMat, signSakuraMat];

    for (let i = 0; i < GAME_CONSTANTS.SEGMENT_COUNT; i++) {
      const seg = new THREE.Group();
      seg.position.z = -i * GAME_CONSTANTS.SEGMENT_LENGTH;

      const road = new THREE.Mesh(roadGeo, trackMat);
      road.rotation.x = -Math.PI / 2;
      road.receiveShadow = true;
      seg.add(road);

      // Left & Right raised Tokyo railway station platforms + buildings + sakura trees
      for (const side of [-1, 1] as const) {
        const plat = new THREE.Mesh(platformGeo, platformMat);
        plat.position.set(side * (GAME_CONSTANTS.ROAD_WIDTH * 0.5 + 7.1), -0.1, 0);
        plat.receiveShadow = true;
        seg.add(plat);

        const safetyLine = new THREE.Mesh(edgeLineGeo, platformEdgeMat);
        safetyLine.position.set(side * (GAME_CONSTANTS.ROAD_WIDTH * 0.5 + 0.22), 0.28, 0);
        seg.add(safetyLine);

        // Two Tokyo urban anime buildings per side per segment
        for (let bIdx = 0; bIdx < 2; bIdx++) {
          const zB = bIdx === 0 ? -6.2 : 6.2;
          const isTall = (i + bIdx + (side === 1 ? 1 : 0)) % 2 === 0;
          const bMesh = new THREE.Mesh(
            isTall ? buildingTallGeo : buildingBodyGeo,
            bIdx % 2 === 0 ? buildingDarkMat : buildingSlateMat,
          );
          const xB = side * (GAME_CONSTANTS.ROAD_WIDTH * 0.5 + 5.15);
          bMesh.position.set(xB, isTall ? 8.2 : 5.7, zB);
          bMesh.castShadow = true;
          seg.add(bMesh);

          // Illuminated window bands
          const levels = isTall ? [3.6, 6.2, 8.8, 11.4, 14.0] : [3.2, 5.8, 8.4];
          for (let lv = 0; lv < levels.length; lv++) {
            const win = new THREE.Mesh(
              windowStripGeo,
              (lv + i) % 2 === 0 ? windowGlowMat : warmWindowMat,
            );
            win.position.set(xB, levels[lv], zB);
            seg.add(win);
          }

          // Vertical/angled neon Tokyo street billboard facing tracks
          if ((i + bIdx) % 2 === 0) {
            const sign = new THREE.Mesh(
              signGeo,
              signMats[(i + bIdx + (side > 0 ? 1 : 0)) % signMats.length],
            );
            sign.position.set(
              side * (GAME_CONSTANTS.ROAD_WIDTH * 0.5 + 2.9),
              4.6 + bIdx * 1.4,
              zB,
            );
            sign.rotation.y = side === -1 ? Math.PI / 2 - 0.18 : -Math.PI / 2 + 0.18;
            seg.add(sign);
          }
        }

        // Overhanging Sakura trees framing the tracks
        const tree = new THREE.Group();
        const xTree = side * (GAME_CONSTANTS.ROAD_WIDTH * 0.5 + 2.15);
        const zTree = side === -1 ? 0.5 : -0.5;
        tree.position.set(xTree, 0.25, zTree);

        const trunk = new THREE.Mesh(trunkGeo, darkWoodMat);
        trunk.position.y = 2.1;
        trunk.rotation.z = side * 0.18;
        trunk.castShadow = true;
        tree.add(trunk);

        const branch = new THREE.Mesh(branchGeo, darkWoodMat);
        branch.position.set(-side * 0.85, 3.9, 0.1);
        branch.rotation.z = side * 0.72;
        tree.add(branch);

        const canopyOffsets: Array<[number, number, number, number, boolean]> = [
          [-side * 0.4, 4.65, 0, 1.35, false],
          [-side * 1.45, 4.35, 0.5, 1.08, true],
          [side * 0.7, 4.05, -0.5, 1.12, false],
          [-side * 0.8, 5.2, -0.35, 0.94, true],
        ];
        for (const [cx, cy, cz, cs, pale] of canopyOffsets) {
          const puff = new THREE.Mesh(blossomGeo, pale ? sakuraPaleMat : sakuraPinkMat);
          puff.position.set(cx, cy, cz);
          puff.scale.set(cs * 1.24, cs * 0.76, cs * 1.12);
          tree.add(puff);
        }
        seg.add(tree);
      }

      // Overhead steel catenary gantry + power wires along the railway
      const gantry = new THREE.Group();
      gantry.position.set(0, 0, 0);
      const postX = GAME_CONSTANTS.ROAD_WIDTH * 0.5 + 0.65;
      const postL = new THREE.Mesh(gantryPostGeo, steelGantryMat);
      postL.position.set(-postX, 4.0, 0);
      const postR = new THREE.Mesh(gantryPostGeo, steelGantryMat);
      postR.position.set(postX, 4.0, 0);
      const crossBeam = new THREE.Mesh(gantryBeamGeo, steelGantryMat);
      crossBeam.position.set(0, 7.75, 0);
      gantry.add(postL, postR, crossBeam);

      for (const laneOffset of [-GAME_CONSTANTS.LANE_WIDTH, 0, GAME_CONSTANTS.LANE_WIDTH]) {
        const wire = new THREE.Mesh(wireGeo, steelGantryMat);
        wire.rotation.x = Math.PI / 2;
        wire.position.set(laneOffset, 7.45, 0);
        gantry.add(wire);
      }
      seg.add(gantry);

      // Grand Vermilion Torii Gate spanning tracks every 2nd segment (matches Mount Fuji & Torii mockup!)
      if (i % 2 === 1) {
        const torii = new THREE.Group();
        torii.position.set(0, 0, -GAME_CONSTANTS.SEGMENT_LENGTH * 0.42);

        const pillarX = GAME_CONSTANTS.ROAD_WIDTH * 0.5 + 0.48;
        for (const side of [-1, 1] as const) {
          const base = new THREE.Mesh(toriiBaseGeo, darkWoodMat);
          base.position.set(side * pillarX, 0.32, 0);
          const col = new THREE.Mesh(toriiPillarGeo, toriiWoodMat);
          col.position.set(side * pillarX, 4.1, 0);
          col.castShadow = true;
          torii.add(base, col);
        }

        const kasagi = new THREE.Mesh(toriiTopGeo, toriiWoodMat);
        kasagi.position.set(0, 8.15, 0);
        const leftWing = new THREE.Mesh(toriiWingGeo, toriiWoodMat);
        leftWing.position.set(-5.85, 8.3, 0);
        leftWing.rotation.z = -0.18;
        const rightWing = new THREE.Mesh(toriiWingGeo, toriiWoodMat);
        rightWing.position.set(5.85, 8.3, 0);
        rightWing.rotation.z = 0.18;

        const cap = new THREE.Mesh(toriiCapGeo, darkWoodMat);
        cap.position.set(0, 8.45, 0);
        const nuki = new THREE.Mesh(toriiSubGeo, toriiWoodMat);
        nuki.position.set(0, 6.85, 0);

        const plaqueRim = new THREE.Mesh(toriiPlaqueRimGeo, goldTrimMat);
        plaqueRim.position.set(0, 7.46, 0);
        const plaque = new THREE.Mesh(toriiPlaqueGeo, darkWoodMat);
        plaque.position.set(0, 7.46, 0);

        torii.add(kasagi, leftWing, rightWing, cap, nuki, plaqueRim, plaque);
        seg.add(torii);
      }

      scene.add(seg);
      this.segments.push(seg);
    }

    // Build Horizon: Anime Twilight Sky + Snow-Capped Mount Fuji + Tokyo Skyline
    this.buildHorizonBackdrop(scene, skyTex, glowTex, buildingDarkMat, warmWindowMat);

    // Drifting Sakura Petals (InstancedMesh)
    const petalGeo = new THREE.PlaneGeometry(0.2, 0.13);
    const petalMat = new THREE.MeshBasicMaterial({
      color: 0xffb8d9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
    });
    applyWorldCurveShader(petalMat, curveUniforms);
    this.sharedDisposables.push(petalGeo, petalMat);

    this.petalInstancedMesh = new THREE.InstancedMesh(petalGeo, petalMat, this.maxPetals);
    this.petalInstancedMesh.frustumCulled = false;
    for (let i = 0; i < this.maxPetals; i++) {
      this.petalStates.push({
        x: (Math.random() - 0.5) * 18,
        y: 1 + Math.random() * 8,
        z: -Math.random() * 55,
        vx: -0.65 - Math.random() * 0.95,
        vy: -0.75 - Math.random() * 0.85,
        vz: 1.5 + Math.random() * 2.5,
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
        rz: Math.random() * Math.PI,
        spin: 1.5 + Math.random() * 2.5,
      });
    }
    scene.add(this.petalInstancedMesh);
  }

  private buildHorizonBackdrop(
    scene: THREE.Scene,
    skyTex: THREE.CanvasTexture,
    glowTex: THREE.CanvasTexture,
    cityMat: THREE.Material,
    glowMat: THREE.Material,
  ): void {
    const skyGeo = new THREE.PlaneGeometry(340, 175);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, fog: false });
    this.sharedDisposables.push(skyGeo, skyMat);

    const skyCard = new THREE.Mesh(skyGeo, skyMat);
    skyCard.position.set(0, 56, -165);
    this.backdropGroup.add(skyCard);

    // Warm sunset/sakura aura glow behind Mount Fuji
    const haloGeo = new THREE.PlaneGeometry(130, 110);
    const haloMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.sharedDisposables.push(haloGeo, haloMat);
    const fujiGlow = new THREE.Mesh(haloGeo, haloMat);
    fujiGlow.position.set(0, 24, -158);
    this.backdropGroup.add(fujiGlow);

    // Iconic 3D Snow-Capped Mount Fuji centered down the railway horizon!
    const fujiBaseGeo = new THREE.ConeGeometry(64, 38, 32, 1, false);
    const fujiBaseMat = new THREE.MeshBasicMaterial({ color: 0x26326b, fog: false });
    const fujiSnowGeo = new THREE.ConeGeometry(23.5, 14.0, 24, 1, false);
    const fujiSnowMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, fog: false });
    this.sharedDisposables.push(fujiBaseGeo, fujiBaseMat, fujiSnowGeo, fujiSnowMat);

    const fuji = new THREE.Group();
    fuji.position.set(0, 0, -148);
    const mountainBody = new THREE.Mesh(fujiBaseGeo, fujiBaseMat);
    mountainBody.position.y = 19;
    mountainBody.scale.set(1.25, 1.0, 0.75);

    const snowCap = new THREE.Mesh(fujiSnowGeo, fujiSnowMat);
    snowCap.position.set(0, 31.0, 0.4);
    snowCap.scale.set(1.25, 1.0, 0.75);
    fuji.add(mountainBody, snowCap);
    this.backdropGroup.add(fuji);

    // Distant Tokyo skyline towers flanking Mount Fuji
    const towerGeo = new THREE.BoxGeometry(8, 30, 8);
    const towerLightGeo = new THREE.BoxGeometry(8.2, 2.2, 8.2);
    this.sharedDisposables.push(towerGeo, towerLightGeo);

    const skylinePositions: Array<[number, number, number]> = [
      [-58, 14, -130],
      [-44, 19, -134],
      [-32, 11, -126],
      [34, 13, -128],
      [48, 22, -135],
      [62, 15, -130],
    ];
    for (const [tx, th, tz] of skylinePositions) {
      const tMesh = new THREE.Mesh(towerGeo, cityMat);
      tMesh.position.set(tx, th * 0.5, tz);
      tMesh.scale.y = th / 30;
      const topBeacon = new THREE.Mesh(towerLightGeo, glowMat);
      topBeacon.position.set(tx, th - 2, tz);
      this.backdropGroup.add(tMesh, topBeacon);
    }

    scene.add(this.backdropGroup);
  }

  public applyQuality(preset: QualityPreset): void {
    this.activePetalCount = Math.min(this.maxPetals, preset.petalCount);
    this.petalInstancedMesh.count = this.activePetalCount;
  }

  public reset(): void {
    for (let i = 0; i < this.segments.length; i++) {
      this.segments[i].position.z = -i * GAME_CONSTANTS.SEGMENT_LENGTH;
    }
    this.backdropGroup.position.z = 0;
  }

  public update(dt: number, runnerZ: number, worldSpeed: number): void {
    this.backdropGroup.position.z = runnerZ;

    const recycleThreshold = runnerZ + GAME_CONSTANTS.SEGMENT_LENGTH * 1.25;
    const totalLength = GAME_CONSTANTS.SEGMENT_COUNT * GAME_CONSTANTS.SEGMENT_LENGTH;
    for (const seg of this.segments) {
      if (seg.position.z > recycleThreshold) {
        seg.position.z -= totalLength;
      }
    }

    for (let i = 0; i < this.activePetalCount; i++) {
      const p = this.petalStates[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += (p.vz + worldSpeed * 0.35) * dt;
      p.rx += p.spin * dt;
      p.ry += p.spin * 0.7 * dt;

      if (p.y < 0.2 || p.z > runnerZ + 6) {
        p.x = (Math.random() - 0.5) * 18;
        p.y = 4.5 + Math.random() * 6.5;
        p.z = runnerZ - 18 - Math.random() * 44;
      }

      this.dummyPos.set(p.x, p.y, p.z);
      this.dummyEuler.set(p.rx, p.ry, p.rz);
      this.dummyQuat.setFromEuler(this.dummyEuler);
      this.dummyMatrix.compose(this.dummyPos, this.dummyQuat, this.dummyScale);
      this.petalInstancedMesh.setMatrixAt(i, this.dummyMatrix);
    }
    this.petalInstancedMesh.instanceMatrix.needsUpdate = true;
  }

  public dispose(): void {
    for (const item of this.sharedDisposables) {
      item.dispose();
    }
  }
}
