import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CAPSULE_DOJO_COSTS,
  CAPSULE_DOJO_ODDS,
  CAR_CATALOG,
  COMPANION_CATALOG,
  DAILY_LOGIN_REWARDS,
  HERO_CATALOG,
  MISSIONS_CATALOG,
  SEASON_TIERS,
  UPGRADE_CATALOG,
  getCarById,
  getCompanionById,
  getHeroById,
  getUpgradeNextCost,
} from '../src/config/catalog.ts';

test('roster contains at least 20 playable heroes including 8 canonical and Miss Maia', () => {
  assert.ok(HERO_CATALOG.length >= 20, `Expected >= 20 heroes, got ${HERO_CATALOG.length}`);

  const ids = new Set(HERO_CATALOG.map((hero) => hero.id));
  assert.equal(ids.size, HERO_CATALOG.length, 'Hero IDs must all be unique');

  const expectedCanonical = [
    'Sigma',
    'Mondesir',
    'Ulysse',
    'Manus',
    'James',
    'Raphaël',
    'Dragnir',
    'Kaël',
  ];
  const heroNames = new Set(HERO_CATALOG.map((hero) => hero.name));
  for (const name of expectedCanonical) {
    assert.ok(heroNames.has(name), `Missing canonical hero: ${name}`);
  }

  const missMaia = HERO_CATALOG.find((hero) => hero.id === 'miss_maia');
  assert.ok(missMaia, 'Miss Maia must be present in the hero roster');
  assert.equal(missMaia.useMissMaiaModel, true);
});

test('every hero defines valid passive and rechargeable active power definitions', () => {
  for (const hero of HERO_CATALOG) {
    assert.ok(hero.power.passiveLabel.length > 0, `Hero ${hero.id} missing passiveLabel`);
    assert.ok(hero.power.activeName.length > 0, `Hero ${hero.id} missing activeName`);
    assert.ok(hero.power.activeDescription.length > 0, `Hero ${hero.id} missing activeDescription`);
    assert.ok(hero.power.chargeCostSec >= 8, `Hero ${hero.id} chargeCostSec too low`);
    assert.ok(hero.power.passiveValue > 0, `Hero ${hero.id} passiveValue must be > 0`);
    assert.equal(getHeroById(hero.id).id, hero.id);
  }
});

test('hero rarity pricing scales from Rare ~5000 coins up to 100000 coins and 250 gems cap', () => {
  const paidRareCoinHeroes = HERO_CATALOG.filter(
    (h) => h.rarity === 'Rare' && h.currency === 'coins' && h.cost > 0,
  );
  const rareAvg =
    paidRareCoinHeroes.reduce((sum, h) => sum + h.cost, 0) / paidRareCoinHeroes.length;
  assert.equal(rareAvg, 5000, `Expected Rare coin hero average to be 5000, got ${rareAvg}`);

  const maxCoinCost = Math.max(
    ...HERO_CATALOG.filter((h) => h.currency === 'coins').map((h) => h.cost),
  );
  const maxGemCost = Math.max(
    ...HERO_CATALOG.filter((h) => h.currency === 'gems').map((h) => h.cost),
  );
  assert.equal(maxCoinCost, 100000);
  assert.equal(maxGemCost, 250);
});

test('convertible car catalog includes at least 15 models with unique IDs and valid perks', () => {
  assert.ok(CAR_CATALOG.length >= 15, `Expected >= 15 convertible cars, got ${CAR_CATALOG.length}`);

  const carIds = new Set(CAR_CATALOG.map((car) => car.id));
  assert.equal(carIds.size, CAR_CATALOG.length, 'Car IDs must all be unique');

  const defaultCar = getCarById('yellow_cab_gt');
  assert.equal(defaultCar.id, 'yellow_cab_gt');
  assert.equal(defaultCar.cost, 0);
  assert.equal(getCarById('unknown_car_id').id, 'yellow_cab_gt');

  for (const car of CAR_CATALOG) {
    assert.ok(car.name.length > 0, `Car ${car.id} missing name`);
    assert.ok(car.perkLabel.length > 0, `Car ${car.id} missing perkLabel`);
    assert.ok(car.extraDurationSec >= 0);
    assert.ok(car.turboSpeedBonus >= 0);
  }
});

test('companion catalog exposes 10 Shibas each with passive and active power specs', () => {
  assert.equal(
    COMPANION_CATALOG.length,
    10,
    `Expected exactly 10 Shibas, got ${COMPANION_CATALOG.length}`,
  );

  const compIds = new Set(COMPANION_CATALOG.map((c) => c.id));
  assert.equal(compIds.size, 10, 'Companion IDs must all be unique');

  const classic = getCompanionById('shiba_classic');
  assert.equal(classic.cost, 0);
  assert.equal(classic.power.activeEffect, 'COIN_X2');
  assert.equal(classic.power.activeDurationSec, 10);

  for (const comp of COMPANION_CATALOG) {
    assert.ok(comp.power.passiveLabel.length > 0);
    assert.ok(comp.power.activeName.length > 0);
    assert.ok(comp.power.activeDurationSec > 0);
    assert.ok(comp.power.chargeCostSec >= 8);
  }
});

test('missions catalog supports separate daily and weekly pages with varied objectives', () => {
  const dailyMissions = MISSIONS_CATALOG.filter((m) => m.scope === 'daily');
  const weeklyMissions = MISSIONS_CATALOG.filter((m) => m.scope === 'weekly');
  assert.ok(dailyMissions.length >= 4, 'Expected at least 4 daily missions');
  assert.ok(weeklyMissions.length >= 4, 'Expected at least 4 weekly missions');

  const ids = new Set(MISSIONS_CATALOG.map((m) => m.id));
  for (const id of ['daily_nearmiss', 'daily_shiba', 'weekly_car_dist', 'weekly_train_jumps']) {
    assert.ok(ids.has(id), `Expected mission ${id}`);
  }
});

test('daily login calendar defines 7 progressive days and Capsule Dojo odds total 100%', () => {
  assert.equal(DAILY_LOGIN_REWARDS.length, 7);
  assert.deepEqual(
    DAILY_LOGIN_REWARDS.map((d) => d.day),
    [1, 2, 3, 4, 5, 6, 7],
  );
  assert.equal(DAILY_LOGIN_REWARDS[6].isGrand, true);

  assert.ok(CAPSULE_DOJO_COSTS.coins > 0);
  assert.ok(CAPSULE_DOJO_COSTS.sakura > 0);
  const totalPct = CAPSULE_DOJO_ODDS.reduce(
    (sum, odd) => sum + parseInt(odd.chanceLabel.replace('%', ''), 10),
    0,
  );
  assert.equal(totalPct, 100);
});

test('permanent upgrade catalog exposes 4 upgrades with monotonic level 1 to 5 costs', () => {
  assert.equal(UPGRADE_CATALOG.length, 4);

  const ids = new Set(UPGRADE_CATALOG.map((u) => u.id));
  assert.equal(ids.size, 4);

  for (const upg of UPGRADE_CATALOG) {
    assert.equal(upg.maxLevel, 5);
    let prevCost = 0;
    for (let lvl = 1; lvl < upg.maxLevel; lvl++) {
      const cost = getUpgradeNextCost(upg, lvl);
      assert.ok(cost > prevCost, `Cost for ${upg.id} level ${lvl} must increase`);
      prevCost = cost;
    }
    assert.ok(upg.getEffectSummary(1).length > 0);
    assert.ok(upg.getEffectSummary(5).length > 0);
  }
});

test('season pass catalog exposes exactly 10 tiers numbered 1 to 10', () => {
  assert.equal(SEASON_TIERS.length, 10);
  assert.deepEqual(
    SEASON_TIERS.map((t) => t.tier),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
});
