import { test, expect } from 'vitest';
import { generateSeason, LEAGUE_SIZE } from '../../src/sim/schedule.js';
import { assembleUserTeam } from '../../src/data/team.js';
import { createPlayer } from '../../src/data/player.js';

const player = createPlayer({
  name: 'Me',
  position: 'PG',
  archetype: 'PLAYMAKER',
  attributes: { shooting: 60, speed: 60, dunking: 60, defense: 60, passing: 60, rebounding: 60 },
  mode: 'normal',
});
const userTeam = assembleUserTeam(player, 999);

test('generateSeason produces exactly 82 games', () => {
  const season = generateSeason(userTeam, 11);
  expect(season.schedule).toHaveLength(82);
});

test('generateSeason produces LEAGUE_SIZE opponent teams, all distinct ids', () => {
  const season = generateSeason(userTeam, 11);
  expect(season.leagueTeams).toHaveLength(LEAGUE_SIZE);
  expect(new Set(season.leagueTeams.map((t) => t.id)).size).toBe(LEAGUE_SIZE);
});

test('every scheduled game references a real opponent team id', () => {
  const season = generateSeason(userTeam, 11);
  const ids = new Set(season.leagueTeams.map((t) => t.id));
  season.schedule.forEach((g) => expect(ids.has(g.opponentTeamId)).toBe(true));
});

test('generateSeason is deterministic for a given seed', () => {
  expect(generateSeason(userTeam, 5)).toEqual(generateSeason(userTeam, 5));
});
