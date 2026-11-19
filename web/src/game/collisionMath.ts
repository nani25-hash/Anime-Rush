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

/**
 * Computes the vertical support floor height (0..trainRoofY) provided by a train roof
 * or an attached front incline ramp. Allows running up ramps and across train roofs.
 */
export function getTrainSupportY(
  runnerX: number,
  runnerY: number,
  runnerZ: number,
  trainX: number,
  trainZ: number,
  halfWidth: number,
  halfDepth: number,
  trainRoofY = 2.8,
  hasRamp = false,
  rampLength = 3.0,
): number {
  if (Math.abs(runnerX - trainX) > halfWidth + 0.24) {
    return 0;
  }

  // Riding on top of the train roof deck
  if (
    runnerZ >= trainZ - halfDepth - 0.18 &&
    runnerZ <= trainZ + halfDepth + 0.18 &&
    runnerY >= trainRoofY - 0.55
  ) {
    return trainRoofY;
  }

  // Climbing up or descending along the sloped front ramp (+Z side)
  if (hasRamp && rampLength > 0.1) {
    const rampTopZ = trainZ + halfDepth;
    const rampBottomZ = rampTopZ + rampLength;
    if (runnerZ >= rampTopZ - 0.12 && runnerZ <= rampBottomZ + 0.15) {
      const progress = Math.min(1, Math.max(0, (rampBottomZ - runnerZ) / rampLength));
      const rampSurfaceY = progress * trainRoofY;
      if (runnerY >= rampSurfaceY - 0.65) {
        return rampSurfaceY;
      }
    }
  }

  return 0;
}

/**
 * Detects a close-call "frôlement" dodge when passing an obstacle cleanly in an adjacent lane
 * or clearing cleanly above a low barrier.
 */
export function isNearMissDodge(
  runnerX: number,
  runnerY: number,
  runnerZ: number,
  obsX: number,
  obsZ: number,
  obsHalfWidth: number,
  obsMaxY: number,
  obsHalfDepth: number,
  laneWidth: number,
): boolean {
  if (Math.abs(runnerZ - obsZ) > obsHalfDepth + 0.5) {
    return false;
  }
  const dx = Math.abs(runnerX - obsX);
  // Adjacent lane close shave while running beside barrier/train
  if (dx > obsHalfWidth + 0.12 && dx <= laneWidth + 0.32 && runnerY < obsMaxY + 0.35) {
    return true;
  }
  // Tight jump vault just over a low barrier
  if (obsMaxY <= 1.25 && dx <= obsHalfWidth + 0.25 && runnerY >= obsMaxY + 0.05 && runnerY <= obsMaxY + 1.3) {
    return true;
  }
  return false;
}

export const SPAWN_THRESHOLDS = {
  OBSTACLE_START_Z: 45,
  FUEL_MIN_DIST: 60,
  FUEL_COOLDOWN_DIST: 24,
  TRAIN_MIN_DIST: 95,
  TRAIN_COOLDOWN_DIST: 22,
  SAKURA_MIN_DIST: 110,
  SAKURA_COOLDOWN_DIST: 34,
  RAMP_TRAIN_MIN_DIST: 120,
  MAGNET_MIN_DIST: 150,
  MAGNET_COOLDOWN_DIST: 55,
  WALL_GATE_MIN_DIST: 160,
  WALL_GATE_COOLDOWN_DIST: 56,
  SHIELD_MIN_DIST: 210,
  SHIELD_COOLDOWN_DIST: 68,
  DOUBLE_TRAIN_MIN_DIST: 220,
} as const;

export type CollectibleSpawnKind = 'FUEL' | 'SAKURA' | 'MAGNET' | 'SHIELD';

export interface SpawnContext {
  fuelPct: number;
  carActive: boolean;
  hasShield: boolean;
  magnetActive: boolean;
}

/**
 * Enforces minimum distance thresholds, cooldown spacing, and contextual coherence
 * so power-ups and collectibles never spawn prematurely or redundantly.
 */
export function shouldSpawnCollectibleAtDistance(
  kind: CollectibleSpawnKind,
  absZ: number,
  lastSpawnAbsZ: number,
  ctx: SpawnContext,
): boolean {
  if (absZ < SPAWN_THRESHOLDS.OBSTACLE_START_Z) return false;

  switch (kind) {
    case 'FUEL':
      if (ctx.carActive || ctx.fuelPct >= 100) return false;
      return (
        absZ >= SPAWN_THRESHOLDS.FUEL_MIN_DIST &&
        absZ - lastSpawnAbsZ >= SPAWN_THRESHOLDS.FUEL_COOLDOWN_DIST
      );
    case 'SAKURA':
      return (
        absZ >= SPAWN_THRESHOLDS.SAKURA_MIN_DIST &&
        absZ - lastSpawnAbsZ >= SPAWN_THRESHOLDS.SAKURA_COOLDOWN_DIST
      );
    case 'MAGNET':
      if (ctx.magnetActive) return false;
      return (
        absZ >= SPAWN_THRESHOLDS.MAGNET_MIN_DIST &&
        absZ - lastSpawnAbsZ >= SPAWN_THRESHOLDS.MAGNET_COOLDOWN_DIST
      );
    case 'SHIELD':
      if (ctx.hasShield) return false;
      return (
        absZ >= SPAWN_THRESHOLDS.SHIELD_MIN_DIST &&
        absZ - lastSpawnAbsZ >= SPAWN_THRESHOLDS.SHIELD_COOLDOWN_DIST
      );
  }
}

export const RUSH_LETTERS = ['R', 'U', 'S', 'H'] as const;
export type RushLetter = (typeof RUSH_LETTERS)[number];

export const RUSH_LETTER_BITS: Record<RushLetter, number> = {
  R: 1,
  U: 2,
  S: 4,
  H: 8,
};

export function getMissingRushLetters(mask: number): RushLetter[] {
  return RUSH_LETTERS.filter((letter) => (mask & RUSH_LETTER_BITS[letter]) === 0);
}

export interface NearMissComboResult {
  nextCombo: number;
  nextTimerSec: number;
  addedBonusScore: number;
  extraChargeRatio: number;
}

export function computeNearMissCombo(
  currentCombo: number,
  comboRemainingSec: number,
  addedNearMisses: number,
): NearMissComboResult {
  if (addedNearMisses <= 0) {
    return {
      nextCombo: comboRemainingSec > 0 ? currentCombo : 0,
      nextTimerSec: Math.max(0, comboRemainingSec),
      addedBonusScore: 0,
      extraChargeRatio: 0,
    };
  }
  const baseCombo = comboRemainingSec > 0 ? currentCombo : 0;
  const nextCombo = Math.min(8, baseCombo + addedNearMisses);
  return {
    nextCombo,
    nextTimerSec: 3.8,
    addedBonusScore: 150 * nextCombo * addedNearMisses,
    extraChargeRatio: Math.min(0.25, 0.08 * nextCombo) * addedNearMisses,
  };
}

