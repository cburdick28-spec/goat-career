import { test, expect } from 'vitest';
import { dreamTeamRating, simulateDreamSeason, winProbability, DREAM_SEASON_LENGTH } from '../../src/sim/dreamSeason.js';
import { NBA_PLAYERS } from '../../src/data/nbaPlayers.js';

const get = (id) => NBA_PLAYERS.find((p) => p.id === id);

test('dreamTeamRating rewards stars and penalizes lineups with glaring holes', () => {
  const stars = ['michael-jordan', 'magic-johnson', 'lebron-james', 'tim-duncan', 'kareem-abdul-jabbar'].map(get);
  const scrubs = ['manute-bol', 'mugsy-bogues', 'bruce-bowen', 'spud-webb', 'kyle-korver'].map(get);
  expect(dreamTeamRating(stars)).toBeGreaterThan(dreamTeamRating(scrubs));
  expect(dreamTeamRating([])).toBe(0);
});

test('winProbability rises with the rating gap and is 50% when even', () => {
  expect(winProbability(80, 80)).toBeCloseTo(0.5, 5);
  expect(winProbability(90, 80)).toBeGreaterThan(winProbability(85, 80));
  expect(winProbability(70, 90)).toBeLessThan(0.01);
});

test('simulateDreamSeason plays 82 consistent games and is deterministic per seed', () => {
  const a = simulateDreamSeason(85, 123);
  const b = simulateDreamSeason(85, 123);
  expect(a).toEqual(b);
  expect(a.games).toHaveLength(DREAM_SEASON_LENGTH);
  expect(a.wins + a.losses).toBe(DREAM_SEASON_LENGTH);
  expect(a.wins).toBe(a.games.filter((g) => g.won).length);
  if (a.losses > 0) expect(a.games[a.firstLoss - 1].won).toBe(false);
  expect(a.perfect).toBe(a.losses === 0);
});

test('a much stronger team wins more on average, and perfect seasons are rare but possible', () => {
  let weak = 0;
  let strong = 0;
  let perfect = 0;
  const runs = 300;
  for (let s = 1; s <= runs; s += 1) {
    weak += simulateDreamSeason(78, s).wins;
    const result = simulateDreamSeason(96, s);
    strong += result.wins;
    if (result.perfect) perfect += 1;
  }
  expect(strong / runs).toBeGreaterThan(weak / runs + 15);
  expect(perfect).toBeGreaterThan(0);
  expect(perfect).toBeLessThan(runs);
});
