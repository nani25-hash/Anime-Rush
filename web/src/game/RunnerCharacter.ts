import * as THREE from 'three';
import { getHeroById } from '../config/catalog';

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
  private readonly headbandTails: THREE.Mesh[] = [];
  private readonly scarfSegments: THREE.Mesh[] = [];
  private readonly shieldBubble: THREE.Mesh;

  private readonly hoodieMat: THREE.MeshStandardMaterial;
  private readonly trouserMat: THREE.MeshStandardMaterial;
  private readonly accentMat: THREE.MeshStandardMaterial;
  private readonly trimMat: THREE.MeshStandardMaterial;
  private readonly hairMat: THREE.MeshStandardMaterial;
  private readonly hairTipMat: THREE.MeshStandardMaterial;
  private readonly shieldMat: THREE.MeshBasicMaterial;
  private readonly disposables: Array<{ dispose: () => void }> = [];

  private runPhase = 0;
  private landSquash = 0;

  constructor(shadowTexture: THREE.Texture, initialHeroId = 'ryu') {
    const hero = getHeroById(initialHeroId);

    this.hoodieMat = new THREE.MeshStandardMaterial({
      color: hero.primaryHex,
      roughness: 0.65,
      metalness: 0.08,
    });
    this.trouserMat = new THREE.MeshStandardMaterial({
      color: 0x161924,
      roughness: 0.78,
      metalness: 0.05,
    });
    this.accentMat = new THREE.MeshStandardMaterial({
      color: hero.accentHex,
      roughness: 0.45,
      metalness: 0.12,
      emissive: hero.accentHex,
      emissiveIntensity: 0.18,
    });
    this.trimMat = new THREE.MeshStandardMaterial({
      color: hero.trimHex,
      roughness: 0.45,
      metalness: 0.1,
    });
    this.hairMat = new THREE.MeshStandardMaterial({
      color: hero.hairHex,
      roughness: 0.48,
      metalness: 0.18,
    });
    this.hairTipMat = new THREE.MeshStandardMaterial({
      color: hero.hairTipHex,
      roughness: 0.42,
      metalness: 0.22,
      emissive: hero.hairTipHex,
      emissiveIntensity: 0.2,
    });

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xf6cfb4,
      roughness: 0.66,
      metalness: 0.02,
    });
    const gloveMat = new THREE.MeshStandardMaterial({
      color: 0x1f2430,
      roughness: 0.75,
      metalness: 0.12,
    });
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.28,
      metalness: 0.85,
    });

    this.disposables.push(
      this.hoodieMat,
      this.trouserMat,
      this.accentMat,
      this.trimMat,
      this.hairMat,
      this.hairTipMat,
      skinMat,
      gloveMat,
      metalMat,
    );

    this.root.add(this.bodyPivot);

    // Street-Anime Ninja Hoodie Torso + Hood Collar + Belt Trim
    this.torsoGroup.position.set(0, 1.0, 0);
    this.bodyPivot.add(this.torsoGroup);

    const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.255, 0.35, 8, 16), this.hoodieMat);
    chest.position.y = 0.14;
    chest.scale.set(1.16, 1.0, 0.82);
    chest.castShadow = true;
    this.torsoGroup.add(chest);

    // Vibrant hoodie chest accent panels & front zipper trim (matches mockup)
    const jacketAccentL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.06), this.accentMat);
    jacketAccentL.position.set(-0.15, 0.15, -0.19);
    const jacketAccentR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.06), this.accentMat);
    jacketAccentR.position.set(0.15, 0.15, -0.19);
    const centerZip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.44, 0.05), this.trimMat);
    centerZip.position.set(0, 0.14, -0.2);

    const hoodieHem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.285, 0.315, 0.18, 16),
      this.accentMat,
    );
    hoodieHem.position.y = -0.19;
    hoodieHem.scale.set(1.06, 1, 0.82);
    hoodieHem.castShadow = true;

    // Thick sporty hoodie cowl / folded hood behind neck
    const hoodCowl = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.085, 10, 18), this.accentMat);
    hoodCowl.rotation.x = Math.PI / 2 - 0.18;
    hoodCowl.position.set(0, 0.44, 0.04);
    hoodCowl.castShadow = true;

    const hoodBack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.16), this.accentMat);
    hoodBack.position.set(0, 0.36, 0.21);
    hoodBack.rotation.x = 0.28;

    const trimStripe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.05), this.trimMat);
    trimStripe.position.set(0, 0.38, 0.29);

    this.torsoGroup.add(jacketAccentL, jacketAccentR, centerZip, hoodieHem, hoodCowl, hoodBack, trimStripe);

    // Head + tousled spiky anime hair with crimson/theme tips + ninja ribbon
    this.headGroup.position.set(0, 0.54, -0.01);
    this.torsoGroup.add(this.headGroup);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.255, 20, 18), skinMat);
    head.position.y = 0.22;
    head.scale.set(1.02, 0.96, 1.0);
    head.castShadow = true;
    this.headGroup.add(head);

    const earGeo = new THREE.SphereGeometry(0.058, 10, 10);
    const leftEar = new THREE.Mesh(earGeo, skinMat);
    leftEar.position.set(-0.255, 0.2, 0.02);
    leftEar.scale.set(0.55, 1.05, 0.8);
    const rightEar = new THREE.Mesh(earGeo, skinMat);
    rightEar.position.set(0.255, 0.2, 0.02);
    rightEar.scale.set(0.55, 1.05, 0.8);
    this.headGroup.add(leftEar, rightEar);

    const hairCrown = new THREE.Mesh(new THREE.SphereGeometry(0.268, 18, 14), this.hairMat);
    hairCrown.position.set(0, 0.26, 0.025);
    hairCrown.scale.set(1.05, 0.98, 1.06);
    this.headGroup.add(hairCrown);

    // Dynamic anime hair spikes (base dark + glowing/crimson tips matching mockup Ryu!)
    const spikeGeo = new THREE.ConeGeometry(0.095, 0.28, 6);
    const tipSpikeGeo = new THREE.ConeGeometry(0.065, 0.2, 6);
    const spikeConfigs: Array<[number, number, number, number, number, number, boolean]> = [
      [0, 0.54, 0.02, -0.22, 0, 0, true],
      [-0.14, 0.5, 0.04, -0.2, 0, 0.48, false],
      [0.14, 0.5, 0.04, -0.2, 0, -0.48, true],
      [-0.24, 0.36, 0.05, -0.1, 0, 0.95, true],
      [0.24, 0.36, 0.05, -0.1, 0, -0.95, false],
      [0, 0.45, 0.21, -0.82, 0, 0, false],
      [-0.15, 0.38, 0.21, -0.78, 0, 0.38, true],
      [0.15, 0.38, 0.21, -0.78, 0, -0.38, false],
      [-0.16, 0.44, -0.14, 0.42, 0, 0.34, false],
      [0.16, 0.44, -0.14, 0.42, 0, -0.34, true],
      [0, 0.46, -0.18, 0.55, 0, 0, true],
    ];
    for (const [x, y, z, rx, ry, rz, isTip] of spikeConfigs) {
      const spike = new THREE.Mesh(spikeGeo, isTip ? this.hairTipMat : this.hairMat);
      spike.position.set(x, y, z);
      spike.rotation.set(rx, ry, rz);
      spike.castShadow = true;
      this.headGroup.add(spike);

      if (isTip) {
        const extra = new THREE.Mesh(tipSpikeGeo, this.hairTipMat);
        extra.position.set(x * 1.08, y + 0.04, z * 1.08);
        extra.rotation.set(rx, ry, rz);
        this.headGroup.add(extra);
      }
    }

    // Sporty anime headband + metallic insignia
    const headband = new THREE.Mesh(
      new THREE.CylinderGeometry(0.272, 0.272, 0.082, 20),
      this.accentMat,
    );
    headband.position.set(0, 0.295, 0.015);
    this.headGroup.add(headband);

    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.068, 0.04), metalMat);
    plate.position.set(0, 0.295, -0.26);
    this.headGroup.add(plate);

    const hachiTailGeo = new THREE.BoxGeometry(0.055, 0.025, 0.24);
    for (let i = 0; i < 2; i++) {
      const tail = new THREE.Mesh(hachiTailGeo, this.accentMat);
      tail.position.set(i === 0 ? -0.05 : 0.05, 0.24, 0.37);
      tail.rotation.set(-0.35, i === 0 ? -0.25 : 0.25, 0);
      this.headGroup.add(tail);
      this.headbandTails.push(tail);
    }

    // Arms: Hoodie sleeves + white stripe cuff + fingerless ninja gloves
    const sleeveGeo = new THREE.CapsuleGeometry(0.095, 0.18, 6, 12);
    const cuffGeo = new THREE.CylinderGeometry(0.086, 0.088, 0.075, 10);
    const foreGeo = new THREE.CapsuleGeometry(0.068, 0.16, 6, 10);
    const handGeo = new THREE.SphereGeometry(0.074, 10, 10);

    const buildArm = (pivot: THREE.Group, xOffset: number) => {
      pivot.position.set(xOffset, 0.33, 0);
      const sleeve = new THREE.Mesh(sleeveGeo, this.hoodieMat);
      sleeve.position.y = -0.14;
      sleeve.castShadow = true;

      const cuff = new THREE.Mesh(cuffGeo, this.trimMat);
      cuff.position.y = -0.24;

      const band = new THREE.Mesh(cuffGeo, this.accentMat);
      band.position.y = -0.17;

      const fore = new THREE.Mesh(foreGeo, skinMat);
      fore.position.set(0, -0.37, -0.03);
      fore.rotation.x = -0.22;
      fore.castShadow = true;

      const glove = new THREE.Mesh(handGeo, gloveMat);
      glove.position.set(0, -0.5, -0.065);
      glove.scale.set(1.06, 1.0, 1.08);
      glove.castShadow = true;

      pivot.add(sleeve, cuff, band, fore, glove);
      this.torsoGroup.add(pivot);
    };
    buildArm(this.leftArmPivot, -0.35);
    buildArm(this.rightArmPivot, 0.35);

    // Legs: Athletic cargo shorts/joggers + vibrant high-top anime sneakers!
    const thighGeo = new THREE.CapsuleGeometry(0.118, 0.22, 6, 12);
    const shinGeo = new THREE.CylinderGeometry(0.084, 0.074, 0.32, 10);
    const shoeUpperGeo = new THREE.BoxGeometry(0.17, 0.12, 0.29);
    const shoeSoleGeo = new THREE.BoxGeometry(0.185, 0.055, 0.31);
    const shoeAccentGeo = new THREE.BoxGeometry(0.176, 0.05, 0.14);

    const buildLeg = (pivot: THREE.Group, xOffset: number) => {
      pivot.position.set(xOffset, -0.24, 0);
      const thigh = new THREE.Mesh(thighGeo, this.trouserMat);
      thigh.position.y = -0.19;
      thigh.castShadow = true;

      const kneePad = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.14), this.accentMat);
      kneePad.position.set(0, -0.34, -0.03);

      const shin = new THREE.Mesh(shinGeo, skinMat);
      shin.position.y = -0.49;

      const shoeUpper = new THREE.Mesh(shoeUpperGeo, this.accentMat);
      shoeUpper.position.set(0, -0.68, -0.045);
      shoeUpper.castShadow = true;

      const shoeSole = new THREE.Mesh(shoeSoleGeo, this.trimMat);
      shoeSole.position.set(0, -0.75, -0.045);

      const shoeStripe = new THREE.Mesh(shoeAccentGeo, this.hoodieMat);
      shoeStripe.position.set(0, -0.68, -0.08);

      pivot.add(thigh, kneePad, shin, shoeUpper, shoeSole, shoeStripe);
      this.torsoGroup.add(pivot);
    };
    buildLeg(this.leftLegPivot, -0.155);
    buildLeg(this.rightLegPivot, 0.155);

    // Flowing hoodie/scarf ribbons trailing dynamically behind (+Z)
    const scarfSegGeo = new THREE.BoxGeometry(0.15, 0.042, 0.28);
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Mesh(scarfSegGeo, this.accentMat);
      seg.position.set(0, 0.42 - i * 0.03, 0.24 + i * 0.23);
      seg.scale.set(1 - i * 0.09, 1, 1);
      seg.castShadow = true;
      this.torsoGroup.add(seg);
      this.scarfSegments.push(seg);
    }

    // Translucent cyan energy shield bubble (visible when Shield power-up active)
    const shieldGeo = new THREE.SphereGeometry(1.05, 18, 16);
    this.shieldMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.26,
      wireframe: true,
    });
    this.shieldBubble = new THREE.Mesh(shieldGeo, this.shieldMat);
    this.shieldBubble.position.set(0, 1.0, 0);
    this.shieldBubble.visible = false;
    this.root.add(this.shieldBubble);
    this.disposables.push(shieldGeo, this.shieldMat);

    // Soft radial contact shadow under runner
    const shadowGeo = new THREE.PlaneGeometry(1.55, 1.55);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.78,
    });
    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.03;
    this.root.add(this.shadowMesh);
    this.disposables.push(shadowGeo, shadowMat);
  }

  public setSkin(heroId: string): void {
    const hero = getHeroById(heroId);
    this.hoodieMat.color.setHex(hero.primaryHex);
    this.accentMat.color.setHex(hero.accentHex);
    this.accentMat.emissive.setHex(hero.accentHex);
    this.trimMat.color.setHex(hero.trimHex);
    this.hairMat.color.setHex(hero.hairHex);
    this.hairTipMat.color.setHex(hero.hairTipHex);
    this.hairTipMat.emissive.setHex(hero.hairTipHex);
  }

  public setShieldActive(active: boolean): void {
    this.shieldBubble.visible = active;
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
    this.landSquash = Math.max(0, this.landSquash - dt * 6.5);
    const squashY = 1 - this.landSquash * 0.16;
    const squashXZ = 1 + this.landSquash * 0.12;

    if (this.shieldBubble.visible) {
      this.shieldBubble.rotation.y += dt * 1.6;
      this.shieldBubble.rotation.z += dt * 0.7;
    }

    // Ground contact shadow stays anchored to y=0.03
    this.shadowMesh.position.y = -heightAboveGround + 0.03;
    const shadowScale = Math.max(0.35, 1 - heightAboveGround * 0.2);
    this.shadowMesh.scale.set(shadowScale, shadowScale, 1);
    (this.shadowMesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
      0.18,
      0.78 - heightAboveGround * 0.16,
    );

    const bankAngle = THREE.MathUtils.clamp(-lateralDelta * 0.16, -0.35, 0.35);

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

    // Both TITLE (energetic lobby sprint matching mockup center stage!) and RUNNING share crisp sprint cycle
    const effectiveSpeed = animState === 'TITLE' ? 12.2 : worldSpeed;
    const strideFreq = 0.68 * effectiveSpeed;
    this.runPhase += dt * strideFreq;
    const swing = Math.sin(this.runPhase);
    const bob = Math.abs(Math.cos(this.runPhase)) * 0.085;

    this.bodyPivot.position.set(0, bob, 0);
    this.bodyPivot.rotation.set(0, animState === 'TITLE' ? -0.14 : 0, bankAngle);
    this.bodyPivot.scale.set(squashXZ, squashY, squashXZ);

    this.torsoGroup.rotation.set(animState === 'TITLE' ? 0.22 : 0.28, swing * 0.08, 0);
    this.headGroup.rotation.set(animState === 'TITLE' ? -0.1 : -0.2, -swing * 0.04, 0);

    this.leftArmPivot.rotation.set(swing * 1.15 + 0.2, 0, 0.14);
    this.rightArmPivot.rotation.set(-swing * 1.15 + 0.2, 0, -0.14);

    this.leftLegPivot.rotation.set(-swing * 1.05, 0, 0);
    this.rightLegPivot.rotation.set(swing * 1.05, 0, 0);

    this.animateScarf(dt, effectiveSpeed);
  }

  private animateScarf(dt: number, speedFactor: number): void {
    const waveTime = performance.now() * 0.001 * (4 + speedFactor * 0.35);
    for (let i = 0; i < this.scarfSegments.length; i++) {
      const seg = this.scarfSegments[i];
      const phase = waveTime - i * 0.72;
      const amp = 0.03 + i * 0.025;
      seg.position.y = 0.43 - i * 0.02 + Math.sin(phase) * amp;
      seg.position.x = Math.cos(phase * 0.85) * amp * 0.75;
      seg.rotation.x = Math.cos(phase) * 0.22;
      seg.rotation.y = Math.sin(phase * 0.8) * 0.16;
    }
    for (let i = 0; i < this.headbandTails.length; i++) {
      const tail = this.headbandTails[i];
      const phase = waveTime * 1.15 + i * 1.4;
      tail.rotation.x = -0.32 + Math.sin(phase) * 0.18;
      tail.rotation.y = (i === 0 ? -0.25 : 0.25) + Math.cos(phase) * 0.12;
    }
    void dt;
  }

  public dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
