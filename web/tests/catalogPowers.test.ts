import assert from 'node:assert/strict';
import test from 'node:test';
import { HERO_CATALOG, getHeroById } from '../src/config/catalog.ts';

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
