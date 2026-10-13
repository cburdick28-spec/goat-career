import { test, expect } from 'vitest';
import { generateOpponentTeam, computeTeamRating, assembleUserTeam } from '../../src/data/team.js';
import { createPlayer, ATTRIBUTE_KEYS, ATTRIBUTE_MIN } from '../../src/data/player.js';

test('generateOpponentTeam produces exactly 5 players with valid attributes', () => {
  const team = generateOpponentTeam(1);
  expect(team.players).toHaveLength(5);
  team.players.forEach((p) => ATTRIBUTE_KEYS.forEach((k) => expect(p.attributes[k]).toBeGreaterThanOrEqual(ATTRIBUTE_MIN)));
});

test('generateOpponentTeam is deterministic for a given seed', () => {
  expect(generateOpponentTeam(7)).toEqual(generateOpponentTeam(7));
});

test('computeTeamRating averages all players attributes', () => {
  const team = {
    id: 't',
    name: 'Test',
    players: Array.from({ length: 5 }, () => ({ attributes: Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, 50])) })),
  };
  expect(computeTeamRating(team)).toBe(50);
});

test('assembleUserTeam includes the given player plus 4 generated teammates', () => {
  const player = createPlayer({
    name: 'Me',
    position: 'PG',
    archetype: 'PLAYMAKER',
    attributes: { shooting: 60, speed: 60, dunking: 60, defense: 60, passing: 60, rebounding: 60 },
    mode: 'normal',
  });
  const team = assembleUserTeam(player, 3);
  expect(team.players).toHaveLength(5);
  expect(team.players).toContainEqual(player);
});
