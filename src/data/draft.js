import { createRng } from '../sim/rng.js';
import { NBA_PLAYERS } from './nbaPlayers.js';
import { ATTRIBUTE_KEYS, createPlayer } from './player.js';

export const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];

// Rarity tiers. Higher tiers are rarer in spins and packs, which is what makes
// landing a GOAT feel like an event.
export const TIERS = [
  { id: 'goat', label: 'GOAT', min: 95, weight: 1 },
  { id: 'legend', label: 'Legend', min: 90, weight: 3 },
  { id: 'superstar', label: 'Superstar', min: 85, weight: 7 },
  { id: 'allstar', label: 'All-Star', min: 78, weight: 14 },
  { id: 'starter', label: 'Starter', min: 0, weight: 20 },
];

export function tierOf(ovr) {
  return TIERS.find((t) => ovr >= t.min);
}

export function weightedPick(rng, candidates) {
  const weights = candidates.map((p) => tierOf(p.ovr).weight);
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < candidates.length; i += 1) {
    roll -= weights[i];
    if (roll < 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

function rngFor(seed, index) {
  const rng = createRng(Math.imul(seed >>> 0, 2654435761) + index * 7919 + 1);
  rng(); // discard the first value: nearby seeds correlate on the first draw
  return rng;
}

// Everyone who plays the daily challenge gets the same cards for a given date.
export function dailySeed(date = new Date()) {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

export function dailyKey(date = new Date()) {
  return String(dailySeed(date));
}

// One reel spin: deterministic for (seed, index), never repeats a player.
export function spinPlayer(seed, index, excludeIds = [], pool = NBA_PLAYERS) {
  const taken = new Set(excludeIds);
  const available = pool.filter((p) => !taken.has(p.id));
  if (available.length === 0) throw new Error('POOL_EXHAUSTED');
  return weightedPick(rngFor(seed, index), available);
}

// ---- Spin & Draft: bolt pros' ratings onto the attribute slots of one player ----

export function createDraft() {
  return { slots: Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, null])) };
}

export function assignSlot(draft, key, pro) {
  if (!ATTRIBUTE_KEYS.includes(key)) throw new Error('UNKNOWN_SLOT');
  if (draft.slots[key]) throw new Error('SLOT_FILLED');
  return {
    slots: { ...draft.slots, [key]: { proId: pro.id, proName: pro.name, value: pro.attrs[key] } },
  };
}

export function filledSlotCount(draft) {
  return ATTRIBUTE_KEYS.filter((k) => draft.slots[k]).length;
}

export function isDraftComplete(draft) {
  return filledSlotCount(draft) === ATTRIBUTE_KEYS.length;
}

export function draftAttributes(draft) {
  return Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, draft.slots[k] ? draft.slots[k].value : 0]));
}

export function draftOverall(draft) {
  const filled = ATTRIBUTE_KEYS.filter((k) => draft.slots[k]);
  if (filled.length === 0) return 0;
  return Math.round(filled.reduce((sum, k) => sum + draft.slots[k].value, 0) / filled.length);
}

const ARCHETYPE_BY_TOP_ATTRIBUTE = {
  shooting: 'SHARPSHOOTER',
  speed: 'SLASHER',
  dunking: 'SLASHER',
  defense: 'LOCKDOWN_DEFENDER',
  passing: 'PLAYMAKER',
  rebounding: 'REBOUNDER',
};

export function archetypeFor(attributes) {
  const top = ATTRIBUTE_KEYS.reduce((best, k) => (attributes[k] > attributes[best] ? k : best), ATTRIBUTE_KEYS[0]);
  return ARCHETYPE_BY_TOP_ATTRIBUTE[top];
}

export function buildPlayerFromDraft(draft, { name, position }) {
  if (!isDraftComplete(draft)) throw new Error('DRAFT_INCOMPLETE');
  const attributes = draftAttributes(draft);
  return createPlayer({
    name: name && name.trim() ? name.trim() : 'The GOAT',
    position,
    archetype: archetypeFor(attributes),
    attributes,
    // Ratings come from drafted pros, not a point-buy budget.
    mode: 'draft',
  });
}

// ---- Dream Team: draft five all-time players, one per position ----

export function dreamPack(seed, slotIndex, position, takenIds = [], size = 4, pool = NBA_PLAYERS) {
  const taken = new Set(takenIds);
  let eligible = pool.filter((p) => p.pos.includes(position) && !taken.has(p.id));
  const rng = rngFor(seed, slotIndex + 100);
  const pack = [];
  while (pack.length < size && eligible.length > 0) {
    const pick = weightedPick(rng, eligible);
    pack.push(pick);
    eligible = eligible.filter((p) => p.id !== pick.id);
  }
  // Best first, so the pack reads like a reveal.
  return pack.sort((a, b) => b.ovr - a.ovr);
}
