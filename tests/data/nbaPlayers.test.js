import { test, expect } from 'vitest';
import { NBA_PLAYERS } from '../../src/data/nbaPlayers.js';
import { ATTRIBUTE_KEYS, ATTRIBUTE_MIN, ATTRIBUTE_MAX } from '../../src/data/player.js';
import { POSITIONS } from '../../src/data/draft.js';

test('player database has unique ids and valid ratings', () => {
  const ids = NBA_PLAYERS.map((p) => p.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const p of NBA_PLAYERS) {
    expect(p.pos.length).toBeGreaterThan(0);
    p.pos.forEach((pos) => expect(POSITIONS).toContain(pos));
    expect(p.ovr).toBeGreaterThanOrEqual(ATTRIBUTE_MIN);
    expect(p.ovr).toBeLessThanOrEqual(ATTRIBUTE_MAX);
    ATTRIBUTE_KEYS.forEach((k) => {
      expect(p.attrs[k]).toBeGreaterThanOrEqual(ATTRIBUTE_MIN);
      expect(p.attrs[k]).toBeLessThanOrEqual(ATTRIBUTE_MAX);
    });
  }
});

test('every position has enough players for a four-card pack across five picks', () => {
  for (const pos of POSITIONS) {
    expect(NBA_PLAYERS.filter((p) => p.pos.includes(pos)).length).toBeGreaterThanOrEqual(20);
  }
});

test('known strengths are reflected in the ratings', () => {
  const byId = (id) => NBA_PLAYERS.find((p) => p.id === id);
  expect(byId('stephen-curry').attrs.shooting).toBeGreaterThanOrEqual(97);
  expect(byId('dennis-rodman').attrs.rebounding).toBeGreaterThanOrEqual(97);
  expect(byId('john-stockton').attrs.passing).toBeGreaterThanOrEqual(97);
  expect(byId('bill-russell').attrs.defense).toBeGreaterThanOrEqual(97);
});
