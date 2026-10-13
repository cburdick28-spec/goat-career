import { test, expect } from 'vitest';
import { simGames, gamesRemaining, SEASON_GAMES } from '../../src/sim/simControl.js';
import { createPlayer } from '../../src/data/player.js';
import { assembleUserTeam } from '../../src/data/team.js';
import { findFranchise } from '../../src/data/nbaTeams.js';
import { generateSeason } from '../../src/sim/schedule.js';
import { createCareerState } from '../../src/data/career.js';

function freshState() {
  const player = createPlayer({
    name: 'Me',
    position: 'PG',
    archetype: 'PLAYMAKER',
    attributes: { shooting: 70, speed: 70, dunking: 70, defense: 70, passing: 70, rebounding: 70 },
    mode: 'draft',
  });
  const team = assembleUserTeam(player, 42, findFranchise('miami-heat'));
  return createCareerState(player, team, generateSeason(team, 42));
}

test('simGames plays exactly the requested number of games and tracks the record', () => {
  const { state, played, seasonEnded } = simGames(freshState(), 10, 123);
  expect(played).toBe(10);
  expect(seasonEnded).toBe(false);
  expect(state.season.completedGames).toHaveLength(10);
  expect(state.season.record.wins + state.season.record.losses).toBe(10);
  expect(gamesRemaining(state)).toBe(SEASON_GAMES - 10);
});

test('simGames is deterministic for a base seed', () => {
  expect(simGames(freshState(), 20, 77).state.season.record).toEqual(simGames(freshState(), 20, 77).state.season.record);
});

test('simming a whole season stops at the offseason with a recap entry', () => {
  const { state, played, seasonEnded } = simGames(freshState(), 82, 5);
  expect(played).toBe(82);
  expect(seasonEnded).toBe(true);
  expect(state.careerHistory).toHaveLength(1);
  const entry = state.careerHistory[0];
  expect(entry.record.wins + entry.record.losses).toBe(82);
  expect(entry.teamName).toBe('Miami Heat');
  expect(entry.playoffs).toHaveProperty('made');
  expect(Object.keys(entry.changes)).toHaveLength(6);
  if (!state.retired) expect(state.season.completedGames).toHaveLength(0);
});

test('simGames stops early when the season ends mid-batch', () => {
  const start = simGames(freshState(), 80, 9).state;
  const { played, seasonEnded } = simGames(start, 10, 11);
  expect(played).toBe(2);
  expect(seasonEnded).toBe(true);
});

test('a retired career does not keep simming', () => {
  const { state } = simGames({ ...freshState(), retired: true }, 10, 1);
  expect(state.season.completedGames).toHaveLength(0);
});

test('simCareer plays until the player retires', async () => {
  const { simCareer } = await import('../../src/sim/simControl.js');
  const end = simCareer(freshState(), 99);
  expect(end.retired).toBe(true);
  expect(end.careerHistory.length).toBeGreaterThan(3);
});
