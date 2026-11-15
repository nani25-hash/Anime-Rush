import * as THREE from 'three';

export function createRailwayTrackTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  // Warm-lit anime gravel ballast bed
  ctx.fillStyle = '#2d293e';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle gravel speckles across entire roadbed
  for (let i = 0; i < 1600; i++) {
    const seed = (i * 7919 + 104729) & 0xffff;
    const x = seed % 512;
    const y = (seed * 13) % 512;
    const bright = 46 + (seed % 34);
    ctx.fillStyle = `rgb(${bright + 6}, ${bright}, ${bright + 14})`;
    ctx.fillRect(x, y, 3, 2);
  }

  // Three distinct track beds centered on the 3 lanes
  // ROAD_WIDTH = 8.4, LANE_WIDTH = 2.35 -> lanes at -2.35 (0.220), 0 (0.500), +2.35 (0.780)
  const laneCenters = [512 * 0.22, 512 * 0.5, 512 * 0.78];

  for (const cx of laneCenters) {
    // Deeper ballast trough under each track
    const bedGrad = ctx.createLinearGradient(cx - 64, 0, cx + 64, 0);
    bedGrad.addColorStop(0, 'rgba(18, 16, 28, 0)');
    bedGrad.addColorStop(0.18, 'rgba(18, 16, 28, 0.52)');
    bedGrad.addColorStop(0.82, 'rgba(18, 16, 28, 0.52)');
    bedGrad.addColorStop(1, 'rgba(18, 16, 28, 0)');
    ctx.fillStyle = bedGrad;
    ctx.fillRect(cx - 64, 0, 128, 512);

    // Wooden railway sleepers (cross-ties)
    for (let y = 8; y < 512; y += 32) {
      ctx.fillStyle = '#3e2723';
      ctx.fillRect(cx - 50, y, 100, 12);
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(cx - 48, y + 1, 96, 5);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(cx - 50, y + 11, 100, 3);
    }

    // Twin metallic steel rails with bright specular highlight
    for (const offset of [-32, 32]) {
      const rx = cx + offset;
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(rx - 5, 0, 10, 512);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(rx - 3, 0, 6, 512);
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(rx - 1, 0, 2, 512);
    }
  }

  // Subtle pink-lavender edge trim
  ctx.fillStyle = 'rgba(244, 114, 182, 0.22)';
  ctx.fillRect(0, 0, 10, 512);
  ctx.fillRect(502, 0, 10, 512);

  // Scattered sakura petals resting on tracks
  for (let i = 0; i < 42; i++) {
    const px = ((i * 67 + 19) % 484) + 14;
    const py = (i * 43 + 7) % 506;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(249, 168, 212, 0.85)' : 'rgba(253, 224, 239, 0.78)';
    ctx.fillRect(px, py, 5, 3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function createRoadBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#666666';
    ctx.fillRect(0, 0, 256, 256);
    const laneCenters = [256 * 0.22, 256 * 0.5, 256 * 0.78];
    for (const cx of laneCenters) {
      for (let y = 4; y < 256; y += 16) {
        ctx.fillStyle = '#b4b4b4';
        ctx.fillRect(cx - 25, y, 50, 6);
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 17, 0, 4, 256);
      ctx.fillRect(cx + 13, 0, 4, 256);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 3);
  return tex;
}

export function createWoodGrainTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#c93326';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 4) {
      const alpha = 0.06 + ((y * 7) % 10) * 0.012;
      ctx.fillStyle = y % 8 === 0 ? `rgba(50, 12, 8, ${alpha})` : `rgba(255, 200, 165, ${alpha * 0.6})`;
      ctx.fillRect(0, y, 256, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createRadialShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
    grad.addColorStop(0, 'rgba(8, 10, 20, 0.78)');
    grad.addColorStop(0.55, 'rgba(8, 10, 20, 0.36)');
    grad.addColorStop(1, 'rgba(8, 10, 20, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(canvas);
}

export function createMoonGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 14, 128, 128, 126);
    grad.addColorStop(0, 'rgba(255, 240, 224, 0.95)');
    grad.addColorStop(0.35, 'rgba(249, 168, 212, 0.5)');
    grad.addColorStop(0.7, 'rgba(56, 189, 248, 0.18)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createAnimeTwilightSkyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Rich Makoto Shinkai / Tokyo twilight anime gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#0b1033');
    grad.addColorStop(0.28, '#1d3674');
    grad.addColorStop(0.58, '#4f65b5');
    grad.addColorStop(0.8, '#c084ac');
    grad.addColorStop(1, '#fda4af');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Warm sunset / sakura cloud bands
    const cloudColors = [
      'rgba(255, 228, 230, 0.35)',
      'rgba(251, 207, 232, 0.28)',
      'rgba(191, 219, 254, 0.25)',
    ];
    for (let i = 0; i < 14; i++) {
      const cx = ((i * 89 + 40) % 470) + 21;
      const cy = 220 + ((i * 37) % 165);
      const r = 42 + (i % 4) * 18;
      const rg = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
      rg.addColorStop(0, cloudColors[i % cloudColors.length]);
      rg.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = rg;
      ctx.fillRect(cx - r, cy - r * 0.55, r * 2, r * 1.1);
    }

    // Crisp upper twilight stars
    for (let i = 0; i < 110; i++) {
      const x = Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1) * 512;
      const y = Math.abs((Math.sin(i * 78.233) * 43758.5453) % 1) * 230;
      const r = 0.65 + (i % 3) * 0.45;
      ctx.fillStyle = i % 4 === 0 ? 'rgba(254, 240, 138, 0.9)' : 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createNeonSignTexture(
  mainText: string,
  subText: string,
  bgHex: string,
  borderHex: string,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = borderHex;
    ctx.lineWidth = 6;
    ctx.strokeRect(5, 5, 246, 118);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mainText, 128, 48);

    ctx.fillStyle = borderHex;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(subText, 128, 92);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createRushTrainSideTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Crisp silver commuter body + crimson RUSH express stripe (matches mockup!)
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, 512, 256);

    // Lower bold crimson RUSH stripe
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 146, 512, 76);

    // Dark undercarriage skirt
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 222, 512, 34);

    // Top crimson accent bar
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(0, 0, 512, 24);

    // Lit commuter windows
    for (let x = 22; x <= 430; x += 98) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x, 42, 74, 78);
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(x + 5, 47, 64, 66);
      // Warm interior silhouette sheen
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(x + 10, 52, 16, 54);
    }

    // Bold stylized "RUSH" graffiti emblem across the side
    ctx.save();
    ctx.translate(256, 184);
    ctx.rotate(-0.04);
    ctx.font = '900 italic 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#0f172a';
    ctx.strokeText('RUSH', 0, 0);
    ctx.fillStyle = '#fef08a';
    ctx.fillText('RUSH', 0, 0);
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createRushTrainFrontTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 140, 256, 86);

    // Panoramic driver windshield
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(22, 30, 212, 92);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(30, 38, 90, 74);
    ctx.fillRect(136, 38, 90, 74);

    // Destination LED sign
    ctx.fillStyle = '#090d16';
    ctx.fillRect(68, 8, 120, 18);
    ctx.fillStyle = '#fb7185';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('桜 EXPRESS', 128, 21);

    // Front RUSH emblem
    ctx.font = '900 italic 38px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 5;
    ctx.strokeText('RUSH', 128, 184);
    ctx.fillText('RUSH', 128, 184);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createNekoCoinTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 54, 8, 64, 64, 62);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.65, '#facc15');
    grad.addColorStop(1, '#d97706');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#fef9c3';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.stroke();

    // Cute cat silhouette emblem (Neko Coin from mockup!)
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.arc(64, 70, 22, 0, Math.PI * 2);
    ctx.fill();
    // Cat ears
    ctx.beginPath();
    ctx.moveTo(44, 58);
    ctx.lineTo(44, 34);
    ctx.lineTo(60, 50);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(84, 58);
    ctx.lineTo(84, 34);
    ctx.lineTo(68, 50);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
