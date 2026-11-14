import * as THREE from 'three';

export type RunnerAnimState = 'TITLE' | 'RUNNING' | 'JUMPING' | 'SLIDING' | 'CRASHED';

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
  private readonly scarfSegments: THREE.Mesh[] = [];

  private runPhase = 0;
  private landSquash = 0;

  constructor(shadowTexture: THREE.Texture) {
    // Palette aligned with the Anime Rush key art shinobi
    const jacketMat = new THREE.MeshStandardMaterial({
      color: 0x161c2e,
      roughness: 0.65,
      metalness: 0.15,
    });
    const crimsonMat = new THREE.MeshStandardMaterial({
      color: 0xd92626,
      roughness: 0.45,
      metalness: 0.1,
      emissive: 0x3b0606,
      emissiveIntensity: 0.35,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xf6d4be,
      roughness: 0.75,
      metalness: 0.02,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x0e1320,
      roughness: 0.55,
      metalness: 0.25,
    });
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.25,
      metalness: 0.85,
    });
    const chakraGlowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });

    this.root.add(this.bodyPivot);

    // Torso (Haori coat + belt + back dream crest accent)
    this.torsoGroup.position.set(0, 1.02, 0);
    this.bodyPivot.add(this.torsoGroup);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.68, 0.34), jacketMat);
    chest.position.y = 0.12;
    chest.castShadow = true;
    this.torsoGroup.add(chest);

    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.38), crimsonMat);
    collar.position.set(0, 0.42, 0.01);
    collar.castShadow = true;
    this.torsoGroup.add(collar);

    const backCrest = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.04), crimsonMat);
    backCrest.position.set(0, 0.15, 0.18);
    this.torsoGroup.add(backCrest);

    const sash = new THREE.Mesh(new THREE.BoxGeometry(0.61, 0.12, 0.37), crimsonMat);
    sash.position.set(0, -0.18, 0);
    this.torsoGroup.add(sash);

    const beltGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), chakraGlowMat);
    beltGem.position.set(0, -0.18, -0.2);
    this.torsoGroup.add(beltGem);

    // Coat tails
    const coatTail = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.32, 0.36), jacketMat);
    coatTail.position.set(0, -0.34, 0.03);
    coatTail.rotation.x = 0.14;
    coatTail.castShadow = true;
    this.torsoGroup.add(coatTail);

    // Head + stylized spiky anime hair + headband
    this.headGroup.position.set(0, 0.56, -0.02);
    this.torsoGroup.add(this.headGroup);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 14), skinMat);
    head.position.y = 0.18;
    head.castShadow = true;
    this.headGroup.add(head);

    const hairCrown = new THREE.Mesh(new THREE.SphereGeometry(0.255, 14, 12), hairMat);
    hairCrown.position.set(0, 0.23, 0.03);
    hairCrown.scale.set(1.02, 0.96, 1.06);
    this.headGroup.add(hairCrown);

    // Anime hair spikes
    const spikeGeo = new THREE.ConeGeometry(0.095, 0.32, 5);
    const spikeConfigs: Array<[number, number, number, number, number, number]> = [
      [0, 0.48, 0.08, -0.55, 0, 0],
      [-0.14, 0.42, 0.1, -0.45, 0, 0.55],
      [0.14, 0.42, 0.1, -0.45, 0, -0.55],
      [-0.2, 0.28, 0.14, -0.25, 0, 0.95],
      [0.2, 0.28, 0.14, -0.25, 0, -0.95],
      [0, 0.32, 0.24, -1.1, 0, 0],
      [-0.12, 0.36, -0.14, 0.45, 0, 0.35],
      [0.12, 0.36, -0.14, 0.45, 0, -0.35],
    ];
    for (const [x, y, z, rx, ry, rz] of spikeConfigs) {
      const spike = new THREE.Mesh(spikeGeo, hairMat);
      spike.position.set(x, y, z);
      spike.rotation.set(rx, ry, rz);
      spike.castShadow = true;
      this.headGroup.add(spike);
    }

    // Shinobi headband + metallic front plate
    const headband = new THREE.Mesh(new THREE.CylinderGeometry(0.258, 0.258, 0.085, 16), crimsonMat);
    headband.position.set(0, 0.27, 0.01);
    this.headGroup.add(headband);

    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.05), metalMat);
    plate.position.set(0, 0.27, -0.24);
    this.headGroup.add(plate);

    // Arms (pivoted at shoulders)
    const armUpperGeo = new THREE.BoxGeometry(0.16, 0.38, 0.16);
    const armForeGeo = new THREE.BoxGeometry(0.14, 0.32, 0.14);
    const gloveGeo = new THREE.BoxGeometry(0.15, 0.14, 0.15);

    const buildArm = (pivot: THREE.Group, xOffset: number) => {
      pivot.position.set(xOffset, 0.36, 0);
      const upper = new THREE.Mesh(armUpperGeo, jacketMat);
      upper.position.y = -0.16;
      upper.castShadow = true;
      const fore = new THREE.Mesh(armForeGeo, jacketMat);
      fore.position.set(0, -0.44, -0.05);
      fore.rotation.x = -0.35;
      fore.castShadow = true;
      const glove = new THREE.Mesh(gloveGeo, crimsonMat);
      glove.position.set(0, -0.6, -0.11);
      pivot.add(upper, fore, glove);
      this.torsoGroup.add(pivot);
    };
    buildArm(this.leftArmPivot, -0.38);
    buildArm(this.rightArmPivot, 0.38);

    // Legs (pivoted at hips)
    const legUpperGeo = new THREE.BoxGeometry(0.21, 0.44, 0.22);
    const legShinGeo = new THREE.BoxGeometry(0.18, 0.42, 0.19);
    const bootGeo = new THREE.BoxGeometry(0.2, 0.15, 0.31);

    const buildLeg = (pivot: THREE.Group, xOffset: number) => {
      pivot.position.set(xOffset, -0.24, 0);
      const thigh = new THREE.Mesh(legUpperGeo, jacketMat);
      thigh.position.y = -0.2;
      thigh.castShadow = true;
      const shin = new THREE.Mesh(legShinGeo, hairMat);
      shin.position.y = -0.56;
      shin.castShadow = true;
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.21), crimsonMat);
      band.position.y = -0.46;
      const boot = new THREE.Mesh(bootGeo, crimsonMat);
      boot.position.set(0, -0.76, -0.05);
      boot.castShadow = true;
      pivot.add(thigh, shin, band, boot);
      this.torsoGroup.add(pivot);
    };
    buildLeg(this.leftLegPivot, -0.16);
    buildLeg(this.rightLegPivot, 0.16);

    // Flowing segmented Red Scarf trailing backward (+Z is behind runner since runner runs toward -Z)
    const scarfSegGeo = new THREE.BoxGeometry(0.2, 0.055, 0.34);
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Mesh(scarfSegGeo, crimsonMat);
      seg.position.set(0, 0.44 - i * 0.04, 0.28 + i * 0.28);
      seg.scale.set(1 - i * 0.08, 1, 1);
      seg.castShadow = true;
      this.torsoGroup.add(seg);
      this.scarfSegments.push(seg);
    }

    // Soft radial contact shadow under runner
    const shadowGeo = new THREE.PlaneGeometry(1.5, 1.5);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.75,
    });
    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.03;
    this.root.add(this.shadowMesh);
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
    // Decay squash-and-stretch
    this.landSquash = Math.max(0, this.landSquash - dt * 6.5);
    const squashY = 1 - this.landSquash * 0.16;
    const squashXZ = 1 + this.landSquash * 0.12;

    // Update ground contact shadow independent of runner elevation
    this.shadowMesh.position.y = -heightAboveGround + 0.03;
    const shadowScale = Math.max(0.35, 1 - heightAboveGround * 0.2);
    this.shadowMesh.scale.set(shadowScale, shadowScale, 1);
    (this.shadowMesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
      0.18,
      0.75 - heightAboveGround * 0.16,
    );

    const bankAngle = THREE.MathUtils.clamp(-lateralDelta * 0.16, -0.35, 0.35);

    if (animState === 'TITLE') {
      this.runPhase += dt * 3.2;
      this.bodyPivot.position.set(0, Math.sin(this.runPhase) * 0.04, 0);
      this.bodyPivot.rotation.set(0, Math.PI, 0); // Face forward toward camera on Title!
      this.bodyPivot.scale.set(1, 1, 1);
      this.torsoGroup.rotation.set(0.08, 0, 0);
      this.headGroup.rotation.set(-0.04, Math.sin(this.runPhase * 0.5) * 0.1, 0);
      this.leftArmPivot.rotation.set(0.25, 0, 0.12);
      this.rightArmPivot.rotation.set(-0.2, 0, -0.12);
      this.leftLegPivot.rotation.set(-0.15, 0, 0);
      this.rightLegPivot.rotation.set(0.15, 0, 0);
      this.animateScarf(dt, 6.5);
      return;
    }

    if (animState === 'CRASHED') {
      this.bodyPivot.rotation.set(0.45, 0, 0.22);
      this.bodyPivot.position.set(0, -0.18, 0);
      this.bodyPivot.scale.set(1, 1, 1);
      this.leftArmPivot.rotation.set(-1.1, 0, 0.5);
      this.rightArmPivot.rotation.set(-0.8, 0, -0.5);
      this.leftLegPivot.rotation.set(0.5, 0, 0);
      this.rightLegPivot.rotation.set(-0.3, 0, 0);
      this.animateScarf(dt, 4);
      return;
    }

    if (animState === 'SLIDING') {
      this.bodyPivot.position.set(0, -0.52, 0);
      this.bodyPivot.rotation.set(1.08, 0, bankAngle * 0.5);
      this.bodyPivot.scale.set(1.06, 0.86, 1.06);
      this.torsoGroup.rotation.set(0.12, 0, 0);
      this.headGroup.rotation.set(-0.82, 0, 0);
      this.leftArmPivot.rotation.set(-0.7, 0, 0.35);
      this.rightArmPivot.rotation.set(0.6, 0, -0.35);
      this.leftLegPivot.rotation.set(-0.2, 0, 0);
      this.rightLegPivot.rotation.set(0.85, 0, 0);
      this.animateScarf(dt, worldSpeed * 1.15);
      return;
    }

    if (animState === 'JUMPING') {
      this.bodyPivot.position.set(0, 0, 0);
      this.bodyPivot.rotation.set(-0.12, 0, bankAngle);
      this.bodyPivot.scale.set(0.95, 1.08, 0.95);
      this.torsoGroup.rotation.set(0.24, 0, 0);
      this.headGroup.rotation.set(-0.12, 0, 0);
      this.leftArmPivot.rotation.set(-1.15, 0, 0.24);
      this.rightArmPivot.rotation.set(0.85, 0, -0.24);
      this.leftLegPivot.rotation.set(-0.95, 0, 0);
      this.rightLegPivot.rotation.set(0.55, 0, 0);
      this.animateScarf(dt, worldSpeed * 1.1);
      return;
    }

    // RUNNING state
    const strideFreq = 0.68 * worldSpeed;
    this.runPhase += dt * strideFreq;
    const swing = Math.sin(this.runPhase);
    const bob = Math.abs(Math.cos(this.runPhase)) * 0.085;

    this.bodyPivot.position.set(0, bob, 0);
    this.bodyPivot.rotation.set(0, 0, bankAngle);
    this.bodyPivot.scale.set(squashXZ, squashY, squashXZ);

    // Dynamic anime shinobi forward lean
    this.torsoGroup.rotation.set(0.28, swing * 0.08, 0);
    this.headGroup.rotation.set(-0.2, -swing * 0.04, 0);

    // Arms pump energetically
    this.leftArmPivot.rotation.set(swing * 1.15 + 0.2, 0, 0.14);
    this.rightArmPivot.rotation.set(-swing * 1.15 + 0.2, 0, -0.14);

    // Legs stride sharply
    this.leftLegPivot.rotation.set(-swing * 1.05, 0, 0);
    this.rightLegPivot.rotation.set(swing * 1.05, 0, 0);

    this.animateScarf(dt, worldSpeed);
  }

  private animateScarf(dt: number, speedFactor: number): void {
    const waveTime = performance.now() * 0.001 * (4 + speedFactor * 0.35);
    for (let i = 0; i < this.scarfSegments.length; i++) {
      const seg = this.scarfSegments[i];
      const phase = waveTime - i * 0.72;
      const amp = 0.04 + i * 0.03;
      seg.position.y = 0.46 - i * 0.025 + Math.sin(phase) * amp;
      seg.position.x = Math.cos(phase * 0.85) * amp * 0.8;
      seg.rotation.x = Math.cos(phase) * 0.25;
      seg.rotation.y = Math.sin(phase * 0.8) * 0.18;
      // Avoid unused dt lint if needed
      void dt;
    }
  }
}
