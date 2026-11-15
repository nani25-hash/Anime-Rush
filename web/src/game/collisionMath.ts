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

/**
 * Classifies an obstacle collision as a recoverable side-graze ("bump")
 * when the runner is switching lanes and clips the lateral edge rather than
 * hitting the front face dead-on (inspired by Subway Surfers / PlayerController.cs).
 */
export function isSideGrazeCollision(
  runnerX: number,
  obstacleCenterX: number,
  obstacleHalfWidth: number,
  isChangingLane: boolean,
): boolean {
  if (!isChangingLane) return false;
  const lateralOffset = Math.abs(runnerX - obstacleCenterX);
  return lateralOffset >= obstacleHalfWidth * 0.55;
}
