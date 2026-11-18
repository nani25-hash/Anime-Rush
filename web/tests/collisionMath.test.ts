import assert from 'node:assert/strict';
import test from 'node:test';
import {
  boxesOverlap,
  checkWallGateCollision,
  getRunnerAabb,
  isSideGrazeCollision,
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
