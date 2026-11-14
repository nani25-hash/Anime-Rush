import * as THREE from 'three';
import { GAME_CONSTANTS, QualityPreset } from '../types/game';
import { createNightSkyTexture, createRoadBumpTexture, createStoneRoadTexture } from './textures';

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
  private activePetalCount = 140;

  private readonly dummyMatrix = new THREE.Matrix4();
  private readonly dummyEuler = new THREE.Euler();
  private readonly dummyQuat = new THREE.Quaternion();
  private readonly dummyPos = new THREE.Vector3();
  private readonly dummyScale = new THREE.Vector3(1, 1, 1);

  private readonly sharedDisposables: Array<{ dispose: () => void }> = [];

  constructor(scene: THREE.Scene) {
    const roadTex = createStoneRoadTexture();
    const bumpTex = createRoadBumpTexture();
    const skyTex = createNightSkyTexture();
    this.sharedDisposables.push(roadTex, bumpTex, skyTex);

    // Shared Materials
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      bumpMap: bumpTex,
      bumpScale: 0.04,
      roughness: 0.72,
      metalness: 0.12,
    });
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0x262e4a,
      roughness: 0.65,
      metalness: 0.2,
    });
    const toriiRedMat = new THREE.MeshStandardMaterial({
      color: 0xd92b2b,
      roughness: 0.38,
      metalness: 0.18,
    });
    const darkWoodMat = new THREE.MeshStandardMaterial({
      color: 0x1a1523,
      roughness: 0.8,
      metalness: 0.1,
    });
    const lanternGlowMat = new THREE.MeshStandardMaterial({
      color: 0xffd180,
      emissive: 0xff9800,
      emissiveIntensity: 1.8,
      roughness: 0.3,
    });
    const sakuraLeafMat = new THREE.MeshStandardMaterial({
      color: 0xff8fbd,
      emissive: 0x6b1d45,
      emissiveIntensity: 0.45,
      roughness: 0.75,
    });
    const chakraTrimMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.2,
      roughness: 0.3,
    });
    const groundAbyssMat = new THREE.MeshStandardMaterial({
      color: 0x090d1e,
      roughness: 0.95,
    });

    this.sharedDisposables.push(
      roadMat,
      curbMat,
      toriiRedMat,
      darkWoodMat,
      lanternGlowMat,
      sakuraLeafMat,
      chakraTrimMat,
      groundAbyssMat,
    );

    // Shared Geometries
    const roadGeo = new THREE.PlaneGeometry(
      GAME_CONSTANTS.ROAD_WIDTH,
      GAME_CONSTANTS.SEGMENT_LENGTH,
    );
    const sideDeckGeo = new THREE.BoxGeometry(14, 0.8, GAME_CONSTANTS.SEGMENT_LENGTH);
    const curbGeo = new THREE.BoxGeometry(0.45, 0.42, GAME_CONSTANTS.SEGMENT_LENGTH);
    const trimStripGeo = new THREE.BoxGeometry(0.1, 0.08, GAME_CONSTANTS.SEGMENT_LENGTH);
    const lanternBaseGeo = new THREE.BoxGeometry(0.6, 1.8, 0.6);
    const lanternLampGeo = new THREE.BoxGeometry(0.5, 0.45, 0.5);
    const lanternRoofGeo = new THREE.ConeGeometry(0.62, 0.45, 4);
    const trunkGeo = new THREE.CylinderGeometry(0.24, 0.38, 4.0, 7);
    const blossomGeo = new THREE.IcosahedronGeometry(1.7, 1);
    const toriiPillarGeo = new THREE.CylinderGeometry(0.32, 0.36, 7.6, 10);
    const toriiTopGeo = new THREE.BoxGeometry(10.6, 0.55, 0.75);
    const toriiSubGeo = new THREE.BoxGeometry(9.2, 0.36, 0.55);

    this.sharedDisposables.push(
      roadGeo,
      sideDeckGeo,
      curbGeo,
      trimStripGeo,
      lanternBaseGeo,
      lanternLampGeo,
      lanternRoofGeo,
      trunkGeo,
      blossomGeo,
      toriiPillarGeo,
      toriiTopGeo,
      toriiSubGeo,
    );

    // Build reusable track segment pool
    for (let i = 0; i < GAME_CONSTANTS.SEGMENT_COUNT; i++) {
      const seg = new THREE.Group();
      seg.position.z = -i * GAME_CONSTANTS.SEGMENT_LENGTH;

      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.receiveShadow = true;
      seg.add(road);

      // Left & right abyss decks + curbs + glowing chakra strips
      for (const side of [-1, 1] as const) {
        const deck = new THREE.Mesh(sideDeckGeo, groundAbyssMat);
        deck.position.set(side * (GAME_CONSTANTS.ROAD_WIDTH * 0.5 + 7.2), -0.42, 0);
        seg.add(deck);

        const curb = new THREE.Mesh(curbGeo, curbMat);
        curb.position.set(side * (GAME_CONSTANTS.ROAD_WIDTH * 0.5 + 0.22), 0.18, 0);
        curb.receiveShadow = true;
        seg.add(curb);

        const strip = new THREE.Mesh(trimStripGeo, chakraTrimMat);
        strip.position.set(side * (GAME_CONSTANTS.ROAD_WIDTH * 0.5 + 0.02), 0.38, 0);
        seg.add(strip);
      }

      // Stone lanterns (Toro) on both sides
      for (const zLocal of [-6, 6]) {
        for (const side of [-1, 1] as const) {
          const xPos = side * (GAME_CONSTANTS.ROAD_WIDTH * 0.5 + 1.05);
          const lantern = new THREE.Group();
          lantern.position.set(xPos, 0, zLocal);

          const post = new THREE.Mesh(lanternBaseGeo, curbMat);
          post.position.y = 0.9;
          const lamp = new THREE.Mesh(lanternLampGeo, lanternGlowMat);
          lamp.position.y = 2.02;
          const roof = new THREE.Mesh(lanternRoofGeo, darkWoodMat);
          roof.position.y = 2.45;
          roof.rotation.y = Math.PI / 4;

          lantern.add(post, lamp, roof);
          seg.add(lantern);
        }
      }

      // Sakura trees along shrine outer promenade
      for (const side of [-1, 1] as const) {
        const tree = new THREE.Group();
        const xTree = side * (GAME_CONSTANTS.ROAD_WIDTH * 0.5 + 3.6);
        const zTree = side === -1 ? -3 : 4;
        tree.position.set(xTree, 0, zTree);

        const trunk = new THREE.Mesh(trunkGeo, darkWoodMat);
        trunk.position.y = 2.0;
        trunk.rotation.z = side * 0.08;
        tree.add(trunk);

        const canopyA = new THREE.Mesh(blossomGeo, sakuraLeafMat);
        canopyA.position.set(-side * 0.4, 4.3, 0);
        canopyA.scale.set(1.25, 0.78, 1.15);
        const canopyB = new THREE.Mesh(blossomGeo, sakuraLeafMat);
        canopyB.position.set(side * 0.7, 3.85, 0.5);
        canopyB.scale.set(0.9, 0.65, 0.9);

        tree.add(canopyA, canopyB);
        seg.add(tree);
      }

      // Towering Torii gate spanning across the 3 lanes on every 2nd segment
      if (i % 2 === 0) {
        const torii = new THREE.Group();
        torii.position.set(0, 0, -GAME_CONSTANTS.SEGMENT_LENGTH * 0.45);

        const leftCol = new THREE.Mesh(toriiPillarGeo, toriiRedMat);
        leftCol.position.set(-GAME_CONSTANTS.ROAD_WIDTH * 0.5 - 0.35, 3.8, 0);
        const rightCol = new THREE.Mesh(toriiPillarGeo, toriiRedMat);
        rightCol.position.set(GAME_CONSTANTS.ROAD_WIDTH * 0.5 + 0.35, 3.8, 0);

        const kasagi = new THREE.Mesh(toriiTopGeo, toriiRedMat);
        kasagi.position.set(0, 7.65, 0);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(11.1, 0.24, 0.85), darkWoodMat);
        cap.position.set(0, 8.0, 0);
        const nuki = new THREE.Mesh(toriiSubGeo, toriiRedMat);
        nuki.position.set(0, 6.45, 0);

        torii.add(leftCol, rightCol, kasagi, cap, nuki);
        seg.add(torii);
      }

      scene.add(seg);
      this.segments.push(seg);
    }

    // Build distant Moon + Pagoda + Sky backdrop (follows runner Z so horizon never closes in)
    this.buildHorizonBackdrop(scene, skyTex, darkWoodMat, lanternGlowMat, toriiRedMat);

    // Build InstancedMesh for drifting Sakura Petals
    const petalGeo = new THREE.PlaneGeometry(0.18, 0.12);
    const petalMat = new THREE.MeshBasicMaterial({
      color: 0xffb3d1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88,
    });
    this.sharedDisposables.push(petalGeo, petalMat);

    this.petalInstancedMesh = new THREE.InstancedMesh(petalGeo, petalMat, this.maxPetals);
    this.petalInstancedMesh.frustumCulled = false;
    for (let i = 0; i < this.maxPetals; i++) {
      this.petalStates.push({
        x: (Math.random() - 0.5) * 18,
        y: 1 + Math.random() * 8,
        z: -Math.random() * 55,
        vx: -0.6 - Math.random() * 0.9,
        vy: -0.8 - Math.random() * 0.9,
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
    darkWoodMat: THREE.Material,
    glowMat: THREE.Material,
    toriiRedMat: THREE.Material,
  ): void {
    // Large sky card behind horizon
    const skyGeo = new THREE.PlaneGeometry(260, 140);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, fog: false });
    this.sharedDisposables.push(skyGeo, skyMat);

    const skyCard = new THREE.Mesh(skyGeo, skyMat);
    skyCard.position.set(0, 44, -145);
    this.backdropGroup.add(skyCard);

    // Luminous Full Moon
    const moonGeo = new THREE.CircleGeometry(18, 32);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xf1f5ff, fog: false });
    this.sharedDisposables.push(moonGeo, moonMat);
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(4, 34, -142);
    this.backdropGroup.add(moon);

    // Distant illuminated 3-tier Japanese Pagoda on the right skyline (matches key art)
    const pagoda = new THREE.Group();
    pagoda.position.set(34, 0, -110);
    for (let tier = 0; tier < 3; tier++) {
      const w = 10 - tier * 2.2;
      const y = 6 + tier * 6.5;
      const body = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, 4.5, w * 0.62), darkWoodMat);
      body.position.y = y;
      const windowBand = new THREE.Mesh(new THREE.BoxGeometry(w * 0.65, 1.5, w * 0.65), glowMat);
      windowBand.position.y = y + 0.4;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.85, 2.4, 4), darkWoodMat);
      roof.position.y = y + 3.2;
      roof.rotation.y = Math.PI / 4;
      pagoda.add(body, windowBand, roof);
    }
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.35, 6, 6), glowMat);
    spire.position.y = 26;
    pagoda.add(spire);
    this.backdropGroup.add(pagoda);

    // Distant Shrine Torii silhouette on the left skyline
    const farTorii = new THREE.Group();
    farTorii.position.set(-28, 0, -100);
    const pL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 14, 1.1), toriiRedMat);
    pL.position.set(-5, 7, 0);
    const pR = new THREE.Mesh(new THREE.BoxGeometry(1.1, 14, 1.1), toriiRedMat);
    pR.position.set(5, 7, 0);
    const top = new THREE.Mesh(new THREE.BoxGeometry(15, 1.2, 1.4), toriiRedMat);
    top.position.set(0, 14.2, 0);
    farTorii.add(pL, pR, top);
    this.backdropGroup.add(farTorii);

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
    // Keep horizon backdrop anchored relative to runner Z
    this.backdropGroup.position.z = runnerZ;

    // Recycle passed track segments forward
    const recycleThreshold = runnerZ + GAME_CONSTANTS.SEGMENT_LENGTH * 1.25;
    const totalLength = GAME_CONSTANTS.SEGMENT_COUNT * GAME_CONSTANTS.SEGMENT_LENGTH;
    for (const seg of this.segments) {
      if (seg.position.z > recycleThreshold) {
        seg.position.z -= totalLength;
      }
    }

    // Update drifting sakura petals around runner
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
        p.z = runnerZ - 18 - Math.random() * 42;
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
