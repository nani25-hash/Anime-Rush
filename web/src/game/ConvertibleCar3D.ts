import * as THREE from 'three';
import { createRadialShadowTexture, loadAtlasCropTexture } from './textures';

/**
 * Sleek Open-Top Convertible Sports Car ("Voiture à toit ouvert") inspired by
 * the user's reference models and YellowCabBoard_tex checkered accents.
 * The hero remains clearly visible seated inside the open cockpit.
 */
export class ConvertibleCar3D {
  public readonly root = new THREE.Group();

  private readonly bodyGroup = new THREE.Group();
  private readonly wheels: THREE.Group[] = [];
  private readonly exhaustFlames: THREE.Mesh[] = [];
  private readonly underglowMesh: THREE.Mesh;
  private readonly disposables: Array<{ dispose: () => void }> = [];

  private wheelAngle = 0;
  private time = 0;

  constructor(shadowTex?: THREE.Texture) {
    const paintTex = loadAtlasCropTexture(
      './assets/textures/yellowcab_tex.png',
      0,
      0,
      1,
      0.32,
      (ctx, size) => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, size, size);
        const sq = size / 8;
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 8; c++) {
            ctx.fillStyle = (r + c) % 2 === 0 ? '#f8fafc' : '#111827';
            ctx.fillRect(c * sq, r * sq, sq, sq);
          }
        }
      },
      true,
    );
    paintTex.repeat.set(3, 1);

    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.25,
      metalness: 0.45,
    });
    const hoodAccentMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.28,
      metalness: 0.4,
    });
    const taxiStripeMat = new THREE.MeshStandardMaterial({
      map: paintTex,
      roughness: 0.4,
      metalness: 0.3,
    });
    const darkCarbonMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.55,
      metalness: 0.5,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.18,
      metalness: 0.9,
    });
    const windshieldMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      metalness: 0.8,
      side: THREE.DoubleSide,
    });
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const neonTrimMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.85,
    });
    const underglowMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });

    this.disposables.push(
      paintTex,
      chassisMat,
      hoodAccentMat,
      taxiStripeMat,
      darkCarbonMat,
      chromeMat,
      windshieldMat,
      headlightMat,
      neonTrimMat,
      flameMat,
      underglowMat,
    );

    this.root.add(this.bodyGroup);

    // Low slung sports body: lower floor + side doors + wide front hood + rear deck
    // Kept open in the middle so the hero's upper torso, arms, head & scarf show clearly!
    const floorGeo = new THREE.BoxGeometry(1.48, 0.2, 3.05);
    const frontHoodGeo = new THREE.BoxGeometry(1.44, 0.44, 1.05);
    const noseSlopeGeo = new THREE.BoxGeometry(1.38, 0.26, 0.45);
    const sideDoorGeo = new THREE.BoxGeometry(0.16, 0.44, 1.15);
    const rearDeckGeo = new THREE.BoxGeometry(1.44, 0.52, 0.88);
    const seatBackGeo = new THREE.BoxGeometry(0.68, 0.62, 0.14);
    const windshieldGeo = new THREE.PlaneGeometry(1.24, 0.42);
    const wingPostGeo = new THREE.BoxGeometry(0.08, 0.26, 0.16);
    const wingBladeGeo = new THREE.BoxGeometry(1.52, 0.08, 0.34);
    const stripeGeo = new THREE.BoxGeometry(1.5, 0.11, 1.2);
    const rollBarGeo = new THREE.TorusGeometry(0.42, 0.055, 8, 18, Math.PI);
    const wheelRimGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.24, 16);
    wheelRimGeo.rotateZ(Math.PI / 2);
    const hubCapGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.26, 12);
    hubCapGeo.rotateZ(Math.PI / 2);
    const steeringWheelGeo = new THREE.TorusGeometry(0.18, 0.03, 8, 16);
    const headlightGeo = new THREE.BoxGeometry(0.28, 0.12, 0.08);
    const flameGeo = new THREE.ConeGeometry(0.12, 0.52, 8);
    flameGeo.rotateX(Math.PI / 2);
    const underglowGeo = new THREE.PlaneGeometry(1.85, 3.35);

    this.disposables.push(
      floorGeo,
      frontHoodGeo,
      noseSlopeGeo,
      sideDoorGeo,
      rearDeckGeo,
      seatBackGeo,
      windshieldGeo,
      wingPostGeo,
      wingBladeGeo,
      stripeGeo,
      rollBarGeo,
      wheelRimGeo,
      hubCapGeo,
      steeringWheelGeo,
      headlightGeo,
      flameGeo,
      underglowGeo,
    );

    const floor = new THREE.Mesh(floorGeo, darkCarbonMat);
    floor.position.set(0, 0.3, 0);
    floor.castShadow = true;

    const hood = new THREE.Mesh(frontHoodGeo, chassisMat);
    hood.position.set(0, 0.52, -0.95);
    hood.castShadow = true;

    const nose = new THREE.Mesh(noseSlopeGeo, hoodAccentMat);
    nose.position.set(0, 0.43, -1.55);
    nose.rotation.x = 0.28;

    const taxiStripe = new THREE.Mesh(stripeGeo, taxiStripeMat);
    taxiStripe.position.set(0, 0.52, 0);

    const leftDoor = new THREE.Mesh(sideDoorGeo, chassisMat);
    leftDoor.position.set(-0.68, 0.54, 0.06);
    leftDoor.castShadow = true;

    const rightDoor = new THREE.Mesh(sideDoorGeo, chassisMat);
    rightDoor.position.set(0.68, 0.54, 0.06);
    rightDoor.castShadow = true;

    const rearDeck = new THREE.Mesh(rearDeckGeo, chassisMat);
    rearDeck.position.set(0, 0.58, 1.02);
    rearDeck.castShadow = true;

    const seatBack = new THREE.Mesh(seatBackGeo, darkCarbonMat);
    seatBack.position.set(0, 0.72, 0.52);
    seatBack.rotation.x = -0.22;

    const rollBar = new THREE.Mesh(rollBarGeo, chromeMat);
    rollBar.position.set(0, 0.84, 0.6);

    const windshield = new THREE.Mesh(windshieldGeo, windshieldMat);
    windshield.position.set(0, 0.88, -0.48);
    windshield.rotation.x = -0.58;

    const steeringWheel = new THREE.Mesh(steeringWheelGeo, darkCarbonMat);
    steeringWheel.position.set(0, 0.82, -0.34);
    steeringWheel.rotation.x = 0.45;

    // Rear sport spoiler
    for (const sx of [-0.46, 0.46]) {
      const post = new THREE.Mesh(wingPostGeo, darkCarbonMat);
      post.position.set(sx, 0.94, 1.32);
      this.bodyGroup.add(post);
    }
    const wingBlade = new THREE.Mesh(wingBladeGeo, hoodAccentMat);
    wingBlade.position.set(0, 1.08, 1.35);
    wingBlade.rotation.x = -0.14;

    // Headlights & neon bumper trim
    for (const sx of [-0.48, 0.48]) {
      const lamp = new THREE.Mesh(headlightGeo, headlightMat);
      lamp.position.set(sx, 0.5, -1.68);
      this.bodyGroup.add(lamp);

      const tailPipe = new THREE.Mesh(flameGeo, flameMat);
      tailPipe.position.set(sx * 0.72, 0.38, 1.65);
      this.bodyGroup.add(tailPipe);
      this.exhaustFlames.push(tailPipe);
    }

    const neonBarGeo = new THREE.BoxGeometry(1.36, 0.06, 0.06);
    this.disposables.push(neonBarGeo);
    const frontNeon = new THREE.Mesh(neonBarGeo, neonTrimMat);
    frontNeon.position.set(0, 0.25, -1.68);

    // Wheels
    const wheelOffsets: Array<[number, number]> = [
      [-0.76, -0.98],
      [0.76, -0.98],
      [-0.76, 0.96],
      [0.76, 0.96],
    ];
    for (const [wx, wz] of wheelOffsets) {
      const wg = new THREE.Group();
      wg.position.set(wx, 0.32, wz);
      const tire = new THREE.Mesh(wheelRimGeo, darkCarbonMat);
      const hub = new THREE.Mesh(hubCapGeo, chromeMat);
      wg.add(tire, hub);
      this.bodyGroup.add(wg);
      this.wheels.push(wg);
    }

    this.underglowMesh = new THREE.Mesh(underglowGeo, underglowMat);
    this.underglowMesh.rotation.x = -Math.PI / 2;
    this.underglowMesh.position.set(0, 0.04, 0);

    if (shadowTex) {
      const sGeo = new THREE.PlaneGeometry(2.2, 3.6);
      const sMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      });
      this.disposables.push(sGeo, sMat);
      const shadow = new THREE.Mesh(sGeo, sMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.025;
      this.root.add(shadow);
    } else {
      const fallbackTex = createRadialShadowTexture();
      this.disposables.push(fallbackTex);
    }

    this.bodyGroup.add(
      floor,
      hood,
      nose,
      taxiStripe,
      leftDoor,
      rightDoor,
      rearDeck,
      seatBack,
      rollBar,
      windshield,
      steeringWheel,
      wingBlade,
      frontNeon,
    );
    this.root.add(this.underglowMesh);
    this.root.visible = false;
  }

  public setVisible(visible: boolean): void {
    this.root.visible = visible;
  }

  public update(dt: number, speed: number, lateralDelta: number): void {
    if (!this.root.visible) return;
    this.time += dt;
    this.wheelAngle -= speed * dt * 2.4;
    for (const w of this.wheels) {
      w.rotation.x = this.wheelAngle;
    }

    // Subtle suspension bounce + banking
    this.bodyGroup.position.y = Math.sin(this.time * 24) * 0.015;
    this.bodyGroup.rotation.z = THREE.MathUtils.clamp(-lateralDelta * 0.025, -0.18, 0.18);
    this.bodyGroup.rotation.y = THREE.MathUtils.clamp(-lateralDelta * 0.012, -0.12, 0.12);

    const flameScale = 0.85 + Math.sin(this.time * 38) * 0.28;
    for (const flame of this.exhaustFlames) {
      flame.scale.set(1, 1, flameScale);
    }

    const glowMat = this.underglowMesh.material as THREE.MeshBasicMaterial;
    glowMat.opacity = 0.34 + Math.sin(this.time * 12) * 0.1;
  }

  public dispose(): void {
    for (const d of this.disposables) d.dispose();
  }
}
