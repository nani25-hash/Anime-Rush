import * as THREE from 'three';

export function createStoneRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  // Deep slate shrine stone base
  ctx.fillStyle = '#151b2e';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle flagstone grid across 3 lanes
  const rows = 8;
  const cols = 6;
  const cellW = 512 / cols;
  const cellH = 512 / rows;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (cellW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const shade = 20 + ((r * 7 + c * 13) % 10);
      ctx.fillStyle = `rgb(${shade}, ${shade + 6}, ${shade + 22})`;
      ctx.fillRect(c * cellW + offset + 2, r * cellH + 2, cellW - 4, cellH - 4);
    }
  }

  // Outer energy borders (warm gold + cyan sheen)
  const leftGrad = ctx.createLinearGradient(0, 0, 26, 0);
  leftGrad.addColorStop(0, 'rgba(250, 204, 21, 0.7)');
  leftGrad.addColorStop(1, 'rgba(250, 204, 21, 0)');
  ctx.fillStyle = leftGrad;
  ctx.fillRect(0, 0, 26, 512);

  const rightGrad = ctx.createLinearGradient(486, 0, 512, 0);
  rightGrad.addColorStop(0, 'rgba(250, 204, 21, 0)');
  rightGrad.addColorStop(1, 'rgba(250, 204, 21, 0.7)');
  ctx.fillStyle = rightGrad;
  ctx.fillRect(486, 0, 26, 512);

  // Two lane dividers at 1/3 and 2/3 width with dashed cyan chakra inlay
  const lanePositions = [512 * 0.355, 512 * 0.645];
  for (const lx of lanePositions) {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.fillRect(lx - 6, 0, 12, 512);
    ctx.fillStyle = 'rgba(125, 211, 252, 0.85)';
    for (let y = 12; y < 512; y += 64) {
      ctx.fillRect(lx - 2, y, 4, 34);
    }
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
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);
    const rows = 8;
    const cols = 6;
    const cellW = 256 / cols;
    const cellH = 256 / rows;
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (cellW * 0.5);
      for (let c = -1; c <= cols; c++) {
        const v = 135 + ((r * 11 + c * 5) % 24);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(c * cellW + offset + 2, r * cellH + 2, cellW - 4, cellH - 4);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 3);
  return tex;
}

export function createRadialShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
    grad.addColorStop(0, 'rgba(3, 5, 14, 0.72)');
    grad.addColorStop(0.55, 'rgba(3, 5, 14, 0.32)');
    grad.addColorStop(1, 'rgba(3, 5, 14, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

export function createNightSkyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#040714');
    grad.addColorStop(0.45, '#0b1230');
    grad.addColorStop(0.8, '#171d45');
    grad.addColorStop(1, '#261f47');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle crisp stars
    for (let i = 0; i < 160; i++) {
      const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const y = (Math.sin(i * 78.233) * 43758.5453) % 1;
      const px = Math.abs(x) * 512;
      const py = Math.abs(y) * 340;
      const r = 0.7 + (i % 3) * 0.55;
      ctx.fillStyle = i % 5 === 0 ? 'rgba(186, 230, 253, 0.9)' : 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
