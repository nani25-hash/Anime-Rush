import type { LaneIndex } from '../types/game';

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

/**
 * Checks whether the runner hits the solid brick portions of a full-width 3-lane
 * brick wall with an archway portal opening over `openLanes`.
 */
export function checkWallGateCollision(
  runnerBox: AabbBox,
  wallZ: number,
  halfDepth: number,
  openLanes: readonly LaneIndex[],
  laneWidth: number,
  wallHeight = 3.2,
  portalClearHalfWidth = 0.92,
  portalTopY = 2.65,
): boolean {
  if (runnerBox.maxZ < wallZ - halfDepth || runnerBox.minZ > wallZ + halfDepth) {
    return false;
  }
  if (runnerBox.maxY <= 0.08 || runnerBox.minY >= wallHeight - 0.08) {
    return false;
  }

  const runnerCenterX = (runnerBox.minX + runnerBox.maxX) * 0.5;

  // Allow clean passage if inside any open portal lane and below the lintel
  for (const lane of openLanes) {
    const laneCenterX = lane * laneWidth;
    if (
      Math.abs(runnerCenterX - laneCenterX) <= portalClearHalfWidth &&
      runnerBox.maxY <= portalTopY
    ) {
      return false;
    }
  }

  // If runner spans cleanly across adjacent open lanes (for 2-lane archway)
  if (openLanes.length === 2) {
    const minPortalX = Math.min(openLanes[0], openLanes[1]) * laneWidth - portalClearHalfWidth;
    const maxPortalX = Math.max(openLanes[0], openLanes[1]) * laneWidth + portalClearHalfWidth;
    if (
      runnerCenterX >= minPortalX &&
      runnerCenterX <= maxPortalX &&
      runnerBox.maxY <= portalTopY
    ) {
      return false;
    }
  }

  return true;
}
