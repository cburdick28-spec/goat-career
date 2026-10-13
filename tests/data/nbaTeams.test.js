import { test, expect } from 'vitest';
import { NBA_TEAMS, findFranchise } from '../../src/data/nbaTeams.js';
import { assembleUserTeam, generateOpponentTeam } from '../../src/data/team.js';
import { generateSeason, LEAGUE_SIZE } from '../../src/sim/schedule.js';
import { createPlayer } from '../../src/data/player.js';

const player = createPlayer({
  name: 'Me',
  position: 'PG',
  archetype: 'PLAYMAKER',
  attributes: { shooting: 60, speed: 60, dunking: 60, defense: 60, passing: 60, rebounding: 60 },
  mode: 'normal',
});

test('there are 30 distinct real franchises', () => {
  expect(NBA_TEAMS).toHaveLength(30);
  expect(new Set(NBA_TEAMS.map((t) => t.franchiseId)).size).toBe(30);
  expect(findFranchise('los-angeles-lakers').name).toBe('Los Angeles Lakers');
  expect(findFranchise('nope')).toBeNull();
});

test('the user team takes the chosen franchise name and is left out of the league', () => {
  const team = assembleUserTeam(player, 5, findFranchise('boston-celtics'));
  expect(team.name).toBe('Boston Celtics');
  const season = generateSeason(team, 5);
  expect(season.leagueTeams).toHaveLength(LEAGUE_SIZE);
  expect(season.leagueTeams.map((t) => t.name)).not.toContain('Boston Celtics');
  expect(season.leagueTeams.map((t) => t.name)).toContain('Los Angeles Lakers');
});

test('without a franchise the team is still playable and the league has 29 real teams', () => {
  const team = assembleUserTeam(player, 5);
  expect(team.name).toBe('Your Team');
  const season = generateSeason(team, 5);
  expect(season.leagueTeams).toHaveLength(29);
  expect(new Set(season.leagueTeams.map((t) => t.name)).size).toBe(29);
});

test('opponent players get readable made-up names, not "Player <seed>"', () => {
  const team = generateOpponentTeam(321);
  team.players.forEach((p) => {
    expect(p.name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  });
});
