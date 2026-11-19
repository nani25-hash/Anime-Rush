import * as THREE from 'three';
import { getCompanionById } from '../config/catalog';
import { RunnerAnimState } from './RunnerCharacter';

export class ShibaCompanion {
  public readonly root = new THREE.Group();
  private readonly bodyPivot = new THREE.Group();
  private readonly headGroup = new THREE.Group();
  private readonly tailGroup = new THREE.Group();
  private readonly legs: THREE.Group[] = [];
  private readonly scarfTails: THREE.Mesh[] = [];
  private readonly shadowMesh: THREE.Mesh;
  private readonly powerAuraMesh: THREE.Mesh;
  private readonly powerAuraMat: THREE.MeshBasicMaterial;

  private readonly coatMat: THREE.MeshStandardMaterial;
  private readonly creamMat: THREE.MeshStandardMaterial;
  private readonly bandanaMat: THREE.MeshStandardMaterial;
  private readonly disposables: Array<{ dispose: () => void }> = [];

  private runPhase = 0.8;
  private currentX = 1.05;
  private currentY = 0;
  private powerAuraActive = false;

  constructor(shadowTexture: THREE.Texture, initialCompanionId = 'shiba_classic') {
    const skin = getCompanionById(initialCompanionId);

    this.coatMat = new THREE.MeshStandardMaterial({
      color: skin.coatHex,
      roughness: 0.62,
      metalness: 0.04,
    });
    this.creamMat = new THREE.MeshStandardMaterial({
      color: skin.creamHex,
      roughness: 0.72,
      metalness: 0.02,
    });
    this.bandanaMat = new THREE.MeshStandardMaterial({
      color: skin.bandanaHex,
      roughness: 0.55,
      metalness: 0.08,
    });
    const darkEyeMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.2,
      metalness: 0.25,
    });
    const pinkMat = new THREE.MeshStandardMaterial({
      color: 0xf9a8d4,
      roughness: 0.7,
    });
    const goldBellMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0x92400e,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.85,
    });

    this.disposables.push(
      this.coatMat,
      this.creamMat,
      this.bandanaMat,
      darkEyeMat,
      pinkMat,
      goldBellMat,
    );

    this.root.add(this.bodyPivot);

    // Plump athletic Shiba torso
    const torsoGeo = new THREE.CapsuleGeometry(0.18, 0.36, 8, 14);
    const torso = new THREE.Mesh(torsoGeo, this.coatMat);
    torso.rotation.x = Math.PI / 2;
    torso.position.set(0, 0.42, 0);
    torso.castShadow = true;

    const bellyGeo = new THREE.CapsuleGeometry(0.145, 0.3, 6, 12);
    const belly = new THREE.Mesh(bellyGeo, this.creamMat);
    belly.rotation.x = Math.PI / 2;
    belly.position.set(0, 0.36, -0.02);

    const chestFluffGeo = new THREE.SphereGeometry(0.165, 12, 10);
    const chestFluff = new THREE.Mesh(chestFluffGeo, this.creamMat);
    chestFluff.position.set(0, 0.41, -0.22);
    chestFluff.scale.set(1.0, 0.95, 0.85);

    this.disposables.push(torsoGeo, bellyGeo, chestFluffGeo);
    this.bodyPivot.add(torso, belly, chestFluff);

    // Ninja neck bandana ("忍") + fluttering back tails
    const bandanaGeo = new THREE.TorusGeometry(0.155, 0.048, 8, 16);
    const bandana = new THREE.Mesh(bandanaGeo, this.bandanaMat);
    bandana.rotation.x = Math.PI / 2 - 0.32;
    bandana.position.set(0, 0.5, -0.22);
    bandana.castShadow = true;

    const emblemGeo = new THREE.BoxGeometry(0.11, 0.09, 0.03);
    const emblem = new THREE.Mesh(emblemGeo, goldBellMat);
    emblem.position.set(0, 0.44, -0.35);

    const tailRibbonGeo = new THREE.BoxGeometry(0.055, 0.024, 0.2);
    for (let i = 0; i < 2; i++) {
      const rib = new THREE.Mesh(tailRibbonGeo, this.bandanaMat);
      rib.position.set(i === 0 ? -0.06 : 0.06, 0.56, -0.06);
      this.bodyPivot.add(rib);
      this.scarfTails.push(rib);
    }

    this.disposables.push(bandanaGeo, emblemGeo, tailRibbonGeo);
    this.bodyPivot.add(bandana, emblem);

    // Expressive Shiba head
    this.headGroup.position.set(0, 0.62, -0.32);
    this.bodyPivot.add(this.headGroup);

    const skullGeo = new THREE.SphereGeometry(0.205, 16, 14);
    const skull = new THREE.Mesh(skullGeo, this.coatMat);
    skull.scale.set(1.06, 0.96, 1.0);
    skull.castShadow = true;

    const cheekGeo = new THREE.SphereGeometry(0.155, 12, 10);
    const cheekMask = new THREE.Mesh(cheekGeo, this.creamMat);
    cheekMask.position.set(0, -0.04, -0.08);
    cheekMask.scale.set(1.22, 0.72, 0.85);

    const snoutGeo = new THREE.CapsuleGeometry(0.075, 0.09, 6, 10);
    const snout = new THREE.Mesh(snoutGeo, this.creamMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.045, -0.2);

    const noseGeo = new THREE.SphereGeometry(0.032, 8, 8);
    const nose = new THREE.Mesh(noseGeo, darkEyeMat);
    nose.position.set(0, -0.02, -0.275);

    const eyeGeo = new THREE.SphereGeometry(0.026, 8, 8);
    const leftEye = new THREE.Mesh(eyeGeo, darkEyeMat);
    leftEye.position.set(-0.082, 0.045, -0.185);
    const rightEye = new THREE.Mesh(eyeGeo, darkEyeMat);
    rightEye.position.set(0.082, 0.045, -0.185);

    // Cute cream Shiba eyebrows
    const browGeo = new THREE.SphereGeometry(0.024, 6, 6);
    const leftBrow = new THREE.Mesh(browGeo, this.creamMat);
    leftBrow.position.set(-0.078, 0.1, -0.175);
    const rightBrow = new THREE.Mesh(browGeo, this.creamMat);
    rightBrow.position.set(0.078, 0.1, -0.175);

    // Pointy Shiba ears
    const earGeo = new THREE.ConeGeometry(0.072, 0.17, 4);
    const earInnerGeo = new THREE.ConeGeometry(0.042, 0.11, 4);
    for (const side of [-1, 1] as const) {
      const ear = new THREE.Mesh(earGeo, this.coatMat);
      ear.position.set(side * 0.135, 0.21, 0.02);
      ear.rotation.set(0.18, side * 0.35, -side * 0.28);
      ear.castShadow = true;

      const inner = new THREE.Mesh(earInnerGeo, pinkMat);
      inner.position.set(side * 0.132, 0.2, -0.01);
      inner.rotation.copy(ear.rotation);
      this.headGroup.add(ear, inner);
    }

    this.disposables.push(skullGeo, cheekGeo, snoutGeo, noseGeo, eyeGeo, browGeo, earGeo, earInnerGeo);
    this.headGroup.add(skull, cheekMask, snout, nose, leftEye, rightEye, leftBrow, rightBrow);

    // Curled Shiba tail at the rear (+Z)
    this.tailGroup.position.set(0, 0.52, 0.28);
    this.bodyPivot.add(this.tailGroup);

    const tailBaseGeo = new THREE.CapsuleGeometry(0.065, 0.18, 6, 10);
    const tailBase = new THREE.Mesh(tailBaseGeo, this.coatMat);
    tailBase.position.set(0, 0.09, 0.05);
    tailBase.rotation.x = -0.65;

    const tailTipGeo = new THREE.SphereGeometry(0.078, 10, 10);
    const tailTip = new THREE.Mesh(tailTipGeo, this.creamMat);
    tailTip.position.set(0, 0.18, -0.01);

    this.disposables.push(tailBaseGeo, tailTipGeo);
    this.tailGroup.add(tailBase, tailTip);

    // 4 Agile Shiba legs
    const legUpperGeo = new THREE.CapsuleGeometry(0.045, 0.14, 6, 8);
    const pawGeo = new THREE.SphereGeometry(0.048, 8, 8);
    this.disposables.push(legUpperGeo, pawGeo);

    const legOffsets: Array<[number, number, number]> = [
      [-0.105, 0.3, -0.18], // Front Left
      [0.105, 0.3, -0.18],  // Front Right
      [-0.105, 0.3, 0.18],  // Back Left
      [0.105, 0.3, 0.18],   // Back Right
    ];
    for (const [lx, ly, lz] of legOffsets) {
      const legPivot = new THREE.Group();
      legPivot.position.set(lx, ly, lz);
      const legMesh = new THREE.Mesh(legUpperGeo, this.coatMat);
      legMesh.position.y = -0.11;
      legMesh.castShadow = true;
      const paw = new THREE.Mesh(pawGeo, this.creamMat);
      paw.position.set(0, -0.23, -0.015);
      paw.scale.set(1, 0.72, 1.25);
      legPivot.add(legMesh, paw);
      this.bodyPivot.add(legPivot);
      this.legs.push(legPivot);
    }

    // Ground contact shadow
    const shadowGeo = new THREE.PlaneGeometry(0.92, 1.05);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.68,
    });
    this.disposables.push(shadowGeo, shadowMat);
    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.03;
    this.root.add(this.shadowMesh);

    const auraGeo = new THREE.TorusGeometry(0.46, 0.045, 8, 24);
    this.powerAuraMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.88,
    });
    this.powerAuraMesh = new THREE.Mesh(auraGeo, this.powerAuraMat);
    this.powerAuraMesh.rotation.x = Math.PI / 2;
    this.powerAuraMesh.position.y = 0.24;
    this.powerAuraMesh.visible = false;
    this.disposables.push(auraGeo, this.powerAuraMat);
    this.root.add(this.powerAuraMesh);
  }

  public setSkin(companionId: string): void {
    const skin = getCompanionById(companionId);
    this.coatMat.color.setHex(skin.coatHex);
    this.creamMat.color.setHex(skin.creamHex);
    this.bandanaMat.color.setHex(skin.bandanaHex);
  }

  public setPowerAuraActive(active: boolean, colorHex = 0xfacc15): void {
    this.powerAuraActive = active;
    this.powerAuraMesh.visible = active;
    this.powerAuraMat.color.setHex(colorHex);
  }

  public reset(x = 1.0, z = 0): void {
    this.currentX = x + 0.98;
    this.currentY = 0;
    this.root.position.set(this.currentX, 0, z + 0.55);
  }

  public update(
    dt: number,
    animState: RunnerAnimState,
    worldSpeed: number,
    heroX: number,
    heroY: number,
    heroZ: number,
  ): void {
    const isTitle = animState === 'TITLE';
    const isCar = animState === 'SEATED_CAR';
    const targetX = heroX + (isTitle ? 0.92 : isCar ? 1.24 : 0.96);
    const targetY = heroY * 0.92;
    const followRate = 1 - Math.exp(-12.5 * dt);
    this.currentX = THREE.MathUtils.lerp(this.currentX, targetX, followRate);
    this.currentY = THREE.MathUtils.lerp(this.currentY, targetY, followRate);

    this.root.position.set(this.currentX, this.currentY, heroZ + (isTitle ? 0.25 : 0.45));

    // Keep shadow grounded on track surface
    this.shadowMesh.position.y = -this.currentY + 0.03;
    const shadowScale = Math.max(0.4, 1 - this.currentY * 0.2);
    this.shadowMesh.scale.set(shadowScale, shadowScale, 1);

    const speedFactor = isTitle ? 12.5 : worldSpeed;
    this.runPhase += dt * speedFactor * 0.85;
    const gallop = Math.sin(this.runPhase);
    const bounce = Math.abs(Math.cos(this.runPhase)) * 0.095;

    if (animState === 'CRASHED') {
      this.bodyPivot.position.set(0, 0, 0);
      this.bodyPivot.rotation.set(-0.2, 0.4, 0.25);
      this.headGroup.rotation.set(0.2, -0.3, 0.15);
      this.tailGroup.rotation.z = 0;
      return;
    }

    if (animState === 'SLIDING') {
      this.bodyPivot.position.set(0, -0.14, 0);
      this.bodyPivot.rotation.set(0.15, 0, 0);
      this.bodyPivot.scale.set(1.08, 0.72, 1.08);
      this.headGroup.rotation.set(-0.25, 0, 0);
      this.legs[0].rotation.x = -1.1;
      this.legs[1].rotation.x = -1.1;
      this.legs[2].rotation.x = 1.05;
      this.legs[3].rotation.x = 1.05;
    } else if (animState === 'JUMPING') {
      this.bodyPivot.position.set(0, 0.05, 0);
      this.bodyPivot.rotation.set(-0.28, 0, 0);
      this.bodyPivot.scale.set(0.95, 1.08, 0.95);
      this.headGroup.rotation.set(0.18, 0, 0);
      this.legs[0].rotation.x = -0.9;
      this.legs[1].rotation.x = -0.8;
      this.legs[2].rotation.x = 0.9;
      this.legs[3].rotation.x = 0.8;
    } else {
      // Energetic bounding gallop in both TITLE & RUNNING!
      this.bodyPivot.position.set(0, bounce, 0);
      this.bodyPivot.rotation.set(gallop * 0.12, isTitle ? -0.18 : 0, 0);
      this.bodyPivot.scale.set(1, 1, 1);
      this.headGroup.rotation.set(-0.08 + bounce * 0.6, isTitle ? -0.15 : 0, Math.sin(this.runPhase * 0.5) * 0.08);

      // Bounding front-together / rear-opposite Shiba stride
      this.legs[0].rotation.x = gallop * 0.95;
      this.legs[1].rotation.x = gallop * 0.85 + 0.15;
      this.legs[2].rotation.x = -gallop * 0.95;
      this.legs[3].rotation.x = -gallop * 0.85 - 0.15;
    }

    // Happy wagging curled tail + fluttering ninja bandana ribbons
    this.tailGroup.rotation.z = Math.sin(this.runPhase * 1.4) * 0.35;
    const waveTime = performance.now() * 0.012;
    for (let i = 0; i < this.scarfTails.length; i++) {
      const rib = this.scarfTails[i];
      rib.rotation.x = 0.25 + Math.sin(waveTime + i) * 0.22;
      rib.rotation.y = (i === 0 ? -0.35 : 0.35) + Math.cos(waveTime + i) * 0.14;
    }

    if (this.powerAuraActive) {
      const pulse = 1 + Math.sin(waveTime * 0.9) * 0.12;
      this.powerAuraMesh.scale.set(pulse, pulse, 1);
      this.powerAuraMesh.rotation.z += dt * 4.2;
      this.powerAuraMat.opacity = 0.65 + Math.sin(waveTime * 1.1) * 0.25;
    }
  }

  public dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
