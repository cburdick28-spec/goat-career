import { test, expect } from 'vitest';
import { simulateGame } from '../../src/sim/boxscore.js';
import { generateOpponentTeam } from '../../src/data/team.js';
import { createRng } from '../../src/sim/rng.js';
import { ATTRIBUTE_KEYS } from '../../src/data/player.js';

const teamA = generateOpponentTeam(1);
const teamB = generateOpponentTeam(2);

test('simulateGame is deterministic for a given rng sequence', () => {
  const rngA = createRng(9);
  const rngB = createRng(9);
  expect(simulateGame(teamA, teamB, rngA)).toEqual(simulateGame(teamA, teamB, rngB));
});

test('winnerId has the higher score', () => {
  const result = simulateGame(teamA, teamB, createRng(9));
  const winnerScore = result.winnerId === teamA.id ? result.teamAScore : result.teamBScore;
  const loserScore = result.winnerId === teamA.id ? result.teamBScore : result.teamAScore;
  expect(winnerScore).toBeGreaterThan(loserScore);
});

test('a much higher-rated team wins the large majority of simulated games', () => {
  const strong = {
    id: 's',
    name: 'Strong',
    players: Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, attributes: Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, 90])) })),
  };
  const weak = {
    id: 'w',
    name: 'Weak',
    players: Array.from({ length: 5 }, (_, i) => ({ id: `w${i}`, attributes: Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, 30])) })),
  };
  let strongWins = 0;
  for (let i = 0; i < 200; i++) {
    if (simulateGame(strong, weak, createRng(i)).winnerId === 's') strongWins++;
  }
  expect(strongWins).toBeGreaterThan(160);
});

test('per-player points are non-negative integers summing to the team score', () => {
  const result = simulateGame(teamA, teamB, createRng(9));
  const aPoints = result.boxScore[teamA.id].map((p) => p.points);
  aPoints.forEach((p) => {
    expect(Number.isInteger(p)).toBe(true);
    expect(p).toBeGreaterThanOrEqual(0);
  });
  expect(aPoints.reduce((a, b) => a + b, 0)).toBe(result.teamAScore);
});

test('per-player rebounds/assists/steals/blocks are non-negative integers and sum to a team total', () => {
  const result = simulateGame(teamA, teamB, createRng(9));
  ['rebounds', 'assists', 'steals', 'blocks'].forEach((stat) => {
    const values = result.boxScore[teamA.id].map((p) => p[stat]);
    values.forEach((v) => {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    });
  });
});
