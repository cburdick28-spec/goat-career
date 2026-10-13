import { test, expect } from 'vitest';
import { simulatePlayoffs, PLAYOFF_ROUNDS, PLAYOFF_WIN_CUTOFF } from '../../src/sim/playoffs.js';
import { generateOpponentTeam, computeTeamStrength } from '../../src/data/team.js';
import { createRng } from '../../src/sim/rng.js';

function league() {
  return Array.from({ length: 29 }, (_, i) => ({ ...generateOpponentTeam(1000 + i), name: `Team ${i}` }));
}
function strongTeam() {
  const t = generateOpponentTeam(5);
  return {
    ...t,
    id: 'user',
    players: t.players.map((p) => ({ ...p, attributes: Object.fromEntries(Object.keys(p.attributes).map((k) => [k, 99])) })),
  };
}

test('missing the win cutoff means no playoffs', () => {
  const result = simulatePlayoffs(generateOpponentTeam(5), league(), PLAYOFF_WIN_CUTOFF - 1, createRng(1));
  expect(result).toEqual({ made: false, rounds: [], champion: false, eliminatedIn: null });
});

test('every series is best-of-seven and a loss ends the run', () => {
  for (let seed = 1; seed <= 40; seed += 1) {
    const result = simulatePlayoffs(generateOpponentTeam(7), league(), 50, createRng(seed));
    expect(result.made).toBe(true);
    result.rounds.forEach((r) => {
      expect(Math.max(r.wins, r.losses)).toBe(4);
      expect(r.won).toBe(r.wins === 4);
    });
    if (result.champion) expect(result.rounds).toHaveLength(PLAYOFF_ROUNDS.length);
    else {
      expect(result.rounds[result.rounds.length - 1].won).toBe(false);
      expect(result.eliminatedIn).toBe(result.rounds[result.rounds.length - 1].round);
    }
  }
});

test('a stacked team wins titles far more often than an average one', () => {
  const teams = league();
  const average = generateOpponentTeam(9);
  let strongTitles = 0;
  let averageTitles = 0;
  for (let seed = 1; seed <= 200; seed += 1) {
    if (simulatePlayoffs(strongTeam(), teams, 60, createRng(seed)).champion) strongTitles += 1;
    if (simulatePlayoffs(average, teams, 60, createRng(seed)).champion) averageTitles += 1;
  }
  expect(strongTitles).toBeGreaterThan(averageTitles * 3);
});

test('computeTeamStrength is top-heavy: one star beats the same total spread evenly', () => {
  const mk = (avgs) => ({
    players: avgs.map((a) => ({ attributes: { shooting: a, speed: a, dunking: a, defense: a, passing: a, rebounding: a } })),
  });
  expect(computeTeamStrength(mk([90, 50, 50, 50, 50]))).toBeGreaterThan(computeTeamStrength(mk([58, 58, 58, 58, 58])));
});
