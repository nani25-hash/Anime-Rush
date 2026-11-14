export interface AabbBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export function getRunnerAabb(
  x: number,
  y: number,
  z: number,
  isSliding: boolean,
): AabbBox {
  const halfW = 0.34;
  const halfD = 0.34;
  const height = isSliding ? 0.88 : 1.72;
  return {
    minX: x - halfW,
    maxX: x + halfW,
    minY: y,
    maxY: y + height,
    minZ: z - halfD,
    maxZ: z + halfD,
  };
}

export function boxesOverlap(a: AabbBox, b: AabbBox, yTolerance = 0.08): boolean {
  if (a.maxZ < b.minZ || a.minZ > b.maxZ) return false;
  if (a.maxX < b.minX || a.minX > b.maxX) return false;
  return a.maxY > b.minY + yTolerance && a.minY < b.maxY - yTolerance;
}
