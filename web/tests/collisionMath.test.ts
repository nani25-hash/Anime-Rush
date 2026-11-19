import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RUSH_LETTER_BITS,
  SPAWN_THRESHOLDS,
  boxesOverlap,
  checkWallGateCollision,
  computeNearMissCombo,
  getMissingRushLetters,
  getRunnerAabb,
  getTrainSupportY,
  isNearMissDodge,
  isSideGrazeCollision,
  shouldSpawnCollectibleAtDistance,
} from '../src/game/collisionMath.ts';

test('standing runner collides with LOW_BARRIER, HIGH_BEAM, and FULL_PILLAR on same lane', () => {
  const standing = getRunnerAabb(0, 0, -20, false);

  const lowBarrier = { minX: -0.78, maxX: 0.78, minY: 0, maxY: 1.04, minZ: -20.22, maxZ: -19.78 };
  const highBeam = { minX: -0.78, maxX: 0.78, minY: 1.05, maxY: 2.5, minZ: -20.28, maxZ: -19.72 };
  const fullPillar = { minX: -0.74, maxX: 0.74, minY: 0, maxY: 3.1, minZ: -20.65, maxZ: -19.35 };

  assert.equal(boxesOverlap(standing, lowBarrier), true);
  assert.equal(boxesOverlap(standing, highBeam), true);
  assert.equal(boxesOverlap(standing, fullPillar), true);
});

test('jumping runner clears LOW_BARRIER at jump apex (v0=14.4, g=34)', () => {
  // Jump apex height = v^2 / (2g) = 14.4^2 / 68 ~= 3.05m
  const apexY = (14.4 * 14.4) / (2 * 34);
  assert.ok(apexY > 2.8);

  const jumping = getRunnerAabb(0, 1.2, -20, false);
  const lowBarrier = { minX: -0.78, maxX: 0.78, minY: 0, maxY: 1.04, minZ: -20.22, maxZ: -19.78 };
  assert.equal(boxesOverlap(jumping, lowBarrier), false);
});

test('sliding runner passes cleanly under HIGH_BEAM', () => {
  const sliding = getRunnerAabb(0, 0, -20, true);
  const highBeam = { minX: -0.78, maxX: 0.78, minY: 1.05, maxY: 2.5, minZ: -20.28, maxZ: -19.72 };
  assert.equal(boxesOverlap(sliding, highBeam), false);
});

test('lane switch dodges obstacle on adjacent lane', () => {
  const rightLaneRunner = getRunnerAabb(2.35, 0, -20, false);
  const centerPillar = { minX: -0.74, maxX: 0.74, minY: 0, maxY: 3.1, minZ: -20.65, maxZ: -19.35 };
  assert.equal(boxesOverlap(rightLaneRunner, centerPillar), false);
});

test('isSideGrazeCollision detects lateral edge graze only while switching lanes', () => {
  // Clipping outer lateral edge while changing lanes -> recoverable bump
  assert.equal(isSideGrazeCollision(0.72, 0, 0.74, true), true);
  assert.equal(isSideGrazeCollision(-0.65, 0, 0.74, true), true);

  // Dead-on center impact even while shifting -> fatal crash
  assert.equal(isSideGrazeCollision(0.1, 0, 0.74, true), false);

  // Edge hit without active lane switch -> fatal crash
  assert.equal(isSideGrazeCollision(0.72, 0, 0.74, false), false);
});

test('checkWallGateCollision allows passage through single open archway lane and blocks brick lanes/lintel', () => {
  const laneWidth = 2.35;
  const openLanes = [-1] as const;

  // Standing in left open lane passes cleanly
  const openRunner = getRunnerAabb(-2.35, 0, -30, false);
  assert.equal(checkWallGateCollision(openRunner, -30, 0.35, openLanes, laneWidth), false);

  // Standing in center or right blocked brick lanes crashes
  const centerRunner = getRunnerAabb(0, 0, -30, false);
  const rightRunner = getRunnerAabb(2.35, 0, -30, false);
  assert.equal(checkWallGateCollision(centerRunner, -30, 0.35, openLanes, laneWidth), true);
  assert.equal(checkWallGateCollision(rightRunner, -30, 0.35, openLanes, laneWidth), true);

  // Jumping too high inside the open lane hits the brick lintel (maxY = 1.1 + 1.72 = 2.82 > 2.65)
  const highJumpRunner = getRunnerAabb(-2.35, 1.1, -30, false);
  assert.equal(checkWallGateCollision(highJumpRunner, -30, 0.35, openLanes, laneWidth), true);
});

test('checkWallGateCollision allows passage across two-lane archway including center boundary', () => {
  const laneWidth = 2.35;
  const openLanes = [0, 1] as const;

  const centerRunner = getRunnerAabb(0, 0, -30, false);
  const betweenOpenLanesRunner = getRunnerAabb(1.2, 0, -30, false);
  const rightRunner = getRunnerAabb(2.35, 0, -30, false);
  const blockedLeftRunner = getRunnerAabb(-2.35, 0, -30, false);

  assert.equal(checkWallGateCollision(centerRunner, -30, 0.35, openLanes, laneWidth), false);
  assert.equal(checkWallGateCollision(betweenOpenLanesRunner, -30, 0.35, openLanes, laneWidth), false);
  assert.equal(checkWallGateCollision(rightRunner, -30, 0.35, openLanes, laneWidth), false);
  assert.equal(checkWallGateCollision(blockedLeftRunner, -30, 0.35, openLanes, laneWidth), true);
});

test('getTrainSupportY lifts runner along front ramp and sustains running on train roof', () => {
  // Train at Z=-30, halfDepth=2.1 (front edge at Z=-27.9), rampLength=3.0 (ramp bottom at Z=-24.9)
  const halfDepth = 2.1;
  const halfWidth = 0.78;
  const midRampY = getTrainSupportY(0, 1.0, -26.4, 0, -30, halfWidth, halfDepth, 2.8, true, 3.0);
  assert.ok(midRampY > 1.2 && midRampY < 1.6);

  const roofY = getTrainSupportY(0, 2.8, -30, 0, -30, halfWidth, halfDepth, 2.8, true, 3.0);
  assert.equal(roofY, 2.8);

  // Runner on ground at train side without jumping onto roof gets 0 support
  const groundY = getTrainSupportY(0, 0, -30, 0, -30, halfWidth, halfDepth, 2.8, false, 3.0);
  assert.equal(groundY, 0);
});

test('isNearMissDodge detects adjacent-lane train shave and tight barrier vault', () => {
  // Adjacent lane shave beside train
  assert.equal(isNearMissDodge(2.35, 0, -30, 0, -30, 0.78, 2.8, 2.1, 2.35), true);
  // Vault cleanly above a low barrier
  assert.equal(isNearMissDodge(0, 1.4, -20, 0, -20, 0.78, 1.04, 0.22, 2.35), true);
  // Too far away in Z -> false
  assert.equal(isNearMissDodge(2.35, 0, -10, 0, -30, 0.78, 2.8, 2.1, 2.35), false);
});

test('SPAWN_THRESHOLDS order ensures progressive introduction of trains and wall gates', () => {
  assert.equal(SPAWN_THRESHOLDS.OBSTACLE_START_Z, 45);
  assert.equal(SPAWN_THRESHOLDS.TRAIN_MIN_DIST, 95);
  assert.ok(SPAWN_THRESHOLDS.WALL_GATE_MIN_DIST > SPAWN_THRESHOLDS.TRAIN_MIN_DIST);
  assert.ok(SPAWN_THRESHOLDS.DOUBLE_TRAIN_MIN_DIST > SPAWN_THRESHOLDS.WALL_GATE_MIN_DIST);
});

test('shouldSpawnCollectibleAtDistance enforces distance thresholds, cooldowns, and contextual state', () => {
  const baseCtx = {
    fuelPct: 40,
    carActive: false,
    hasShield: false,
    magnetActive: false,
  };

  // Before OBSTACLE_START_Z everything is blocked
  assert.equal(shouldSpawnCollectibleAtDistance('FUEL', 30, 0, baseCtx), false);

  // Fuel spawns after FUEL_MIN_DIST when tank < 100% and car is inactive
  assert.equal(shouldSpawnCollectibleAtDistance('FUEL', 59, 0, baseCtx), false);
  assert.equal(shouldSpawnCollectibleAtDistance('FUEL', 65, 0, baseCtx), true);

  // Fuel suppressed when tank is full, car is active, or within cooldown
  assert.equal(shouldSpawnCollectibleAtDistance('FUEL', 80, 0, { ...baseCtx, fuelPct: 100 }), false);
  assert.equal(shouldSpawnCollectibleAtDistance('FUEL', 80, 0, { ...baseCtx, carActive: true }), false);
  assert.equal(shouldSpawnCollectibleAtDistance('FUEL', 80, 65, baseCtx), false);

  // Shield & Magnet suppressed when already active
  assert.equal(shouldSpawnCollectibleAtDistance('SHIELD', 230, 0, baseCtx), true);
  assert.equal(
    shouldSpawnCollectibleAtDistance('SHIELD', 230, 0, { ...baseCtx, hasShield: true }),
    false,
  );
  assert.equal(shouldSpawnCollectibleAtDistance('MAGNET', 170, 0, baseCtx), true);
  assert.equal(
    shouldSpawnCollectibleAtDistance('MAGNET', 170, 0, { ...baseCtx, magnetActive: true }),
    false,
  );

  // Sakura spawns cleanly after 110m outside cooldown
  assert.equal(shouldSpawnCollectibleAtDistance('SAKURA', 105, 0, baseCtx), false);
  assert.equal(shouldSpawnCollectibleAtDistance('SAKURA', 115, 0, baseCtx), true);
  assert.equal(shouldSpawnCollectibleAtDistance('SAKURA', 130, 115, baseCtx), false);
});

test('getMissingRushLetters tracks R-U-S-H bitmask progress accurately', () => {
  assert.deepEqual(getMissingRushLetters(0), ['R', 'U', 'S', 'H']);
  const maskRU = RUSH_LETTER_BITS.R | RUSH_LETTER_BITS.U;
  assert.deepEqual(getMissingRushLetters(maskRU), ['S', 'H']);
  assert.deepEqual(getMissingRushLetters(0x0f), []);
});

test('computeNearMissCombo chains streaks up to x8 and resets when expired', () => {
  const first = computeNearMissCombo(0, 0, 1);
  assert.equal(first.nextCombo, 1);
  assert.equal(first.addedBonusScore, 150);
  assert.equal(first.nextTimerSec, 3.8);

  const chained = computeNearMissCombo(first.nextCombo, 2.0, 1);
  assert.equal(chained.nextCombo, 2);
  assert.equal(chained.addedBonusScore, 300);
  assert.ok(chained.extraChargeRatio > first.extraChargeRatio);

  const reset = computeNearMissCombo(4, 0, 1);
  assert.equal(reset.nextCombo, 1);
  assert.equal(reset.addedBonusScore, 150);

  const capped = computeNearMissCombo(7, 1.5, 3);
  assert.equal(capped.nextCombo, 8);
});
