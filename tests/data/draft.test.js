import { test, expect } from 'vitest';
import {
  TIERS,
  tierOf,
  spinPlayer,
  dailySeed,
  createDraft,
  assignSlot,
  isDraftComplete,
  filledSlotCount,
  draftAttributes,
  draftOverall,
  archetypeFor,
  buildPlayerFromDraft,
  dreamPack,
  POSITIONS,
} from '../../src/data/draft.js';
import { NBA_PLAYERS } from '../../src/data/nbaPlayers.js';
import { ATTRIBUTE_KEYS } from '../../src/data/player.js';

const curry = NBA_PLAYERS.find((p) => p.id === 'stephen-curry');

test('tierOf maps overall to the right rarity tier', () => {
  expect(tierOf(99).id).toBe('goat');
  expect(tierOf(95).id).toBe('goat');
  expect(tierOf(92).id).toBe('legend');
  expect(tierOf(86).id).toBe('superstar');
  expect(tierOf(80).id).toBe('allstar');
  expect(tierOf(60).id).toBe('starter');
  expect(TIERS.map((t) => t.min)).toEqual([...TIERS.map((t) => t.min)].sort((a, b) => b - a));
});

test('spinPlayer is deterministic for a seed and index', () => {
  expect(spinPlayer(20261013, 0).id).toBe(spinPlayer(20261013, 0).id);
  expect(spinPlayer(20261013, 3, ['michael-jordan']).id).toBe(spinPlayer(20261013, 3, ['michael-jordan']).id);
});

test('spinPlayer never returns an excluded player', () => {
  const excluded = NBA_PLAYERS.slice(0, NBA_PLAYERS.length - 1).map((p) => p.id);
  expect(spinPlayer(5, 0, excluded).id).toBe(NBA_PLAYERS[NBA_PLAYERS.length - 1].id);
  expect(() => spinPlayer(5, 0, NBA_PLAYERS.map((p) => p.id))).toThrow('POOL_EXHAUSTED');
});

test('rarer tiers show up less often across many spins', () => {
  const counts = { goat: 0, starter: 0 };
  for (let seed = 1; seed <= 600; seed += 1) {
    const tier = tierOf(spinPlayer(seed, 0).ovr).id;
    if (tier in counts) counts[tier] += 1;
  }
  expect(counts.goat).toBeGreaterThan(0);
  expect(counts.starter).toBeGreaterThan(counts.goat);
});

test('dailySeed encodes the local date', () => {
  expect(dailySeed(new Date(2026, 9, 13))).toBe(20261013);
});

test('assigning a pro bolts that pro rating onto the chosen slot', () => {
  const draft = assignSlot(createDraft(), 'shooting', curry);
  expect(draft.slots.shooting.value).toBe(curry.attrs.shooting);
  expect(draft.slots.shooting.proName).toBe('Stephen Curry');
  expect(filledSlotCount(draft)).toBe(1);
});

test('assignSlot does not mutate the original draft and rejects filled or unknown slots', () => {
  const empty = createDraft();
  const next = assignSlot(empty, 'speed', curry);
  expect(empty.slots.speed).toBeNull();
  expect(() => assignSlot(next, 'speed', curry)).toThrow('SLOT_FILLED');
  expect(() => assignSlot(empty, 'vertical', curry)).toThrow('UNKNOWN_SLOT');
});

function fullDraft() {
  let draft = createDraft();
  ATTRIBUTE_KEYS.forEach((k, i) => {
    draft = assignSlot(draft, k, NBA_PLAYERS[i]);
  });
  return draft;
}

test('a full draft builds a valid player and overall', () => {
  const draft = fullDraft();
  expect(isDraftComplete(draft)).toBe(true);
  const attrs = draftAttributes(draft);
  const expected = Math.round(ATTRIBUTE_KEYS.reduce((s, k) => s + attrs[k], 0) / ATTRIBUTE_KEYS.length);
  expect(draftOverall(draft)).toBe(expected);

  const player = buildPlayerFromDraft(draft, { name: '  Connor  ', position: 'PG' });
  expect(player.name).toBe('Connor');
  expect(player.position).toBe('PG');
  expect(player.attributes).toEqual(attrs);
  expect(player.age).toBe(19);
});

test('buildPlayerFromDraft refuses an incomplete draft and defaults a blank name', () => {
  expect(() => buildPlayerFromDraft(createDraft(), { name: 'x', position: 'PG' })).toThrow('DRAFT_INCOMPLETE');
  expect(buildPlayerFromDraft(fullDraft(), { name: '   ', position: 'C' }).name).toBe('The GOAT');
});

test('archetype follows the top attribute', () => {
  expect(archetypeFor({ shooting: 90, speed: 50, dunking: 50, defense: 50, passing: 50, rebounding: 50 })).toBe('SHARPSHOOTER');
  expect(archetypeFor({ shooting: 40, speed: 50, dunking: 50, defense: 90, passing: 50, rebounding: 50 })).toBe('LOCKDOWN_DEFENDER');
  expect(archetypeFor({ shooting: 40, speed: 50, dunking: 50, defense: 50, passing: 50, rebounding: 90 })).toBe('REBOUNDER');
});

test('dreamPack returns four distinct eligible players, best first, skipping taken ones', () => {
  const pack = dreamPack(42, 0, 'PG');
  expect(pack).toHaveLength(4);
  expect(new Set(pack.map((p) => p.id)).size).toBe(4);
  pack.forEach((p) => expect(p.pos).toContain('PG'));
  expect(pack.map((p) => p.ovr)).toEqual([...pack.map((p) => p.ovr)].sort((a, b) => b - a));

  const again = dreamPack(42, 0, 'PG', [pack[0].id]);
  expect(again.map((p) => p.id)).not.toContain(pack[0].id);
});

test('five dream picks across positions never repeat a player, even with multi-position players', () => {
  const taken = [];
  POSITIONS.forEach((pos, i) => {
    const pick = dreamPack(7, i, pos, taken)[0];
    expect(taken).not.toContain(pick.id);
    taken.push(pick.id);
  });
  expect(new Set(taken).size).toBe(5);
});
