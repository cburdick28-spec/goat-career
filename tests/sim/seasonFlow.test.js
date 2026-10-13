import { test, expect } from 'vitest';
import { advanceSeason } from '../../src/sim/seasonFlow.js';
import { createPlayer } from '../../src/data/player.js';
import { assembleUserTeam } from '../../src/data/team.js';
import { generateSeason } from '../../src/sim/schedule.js';
import { createCareerState } from '../../src/data/career.js';

function freshState() {
  const player = createPlayer({
    name: 'Me',
    position: 'PG',
    archetype: 'PLAYMAKER',
    attributes: { shooting: 60, speed: 60, dunking: 60, defense: 60, passing: 60, rebounding: 60 },
    mode: 'normal',
  });
  const team = assembleUserTeam(player, 42);
  const season = generateSeason(team, 42);
  return createCareerState(player, team, season);
}

function resultFor(state, win) {
  const opponentId = state.season.schedule[state.season.completedGames.length].opponentTeamId;
  const userScore = win ? 100 : 80;
  const opponentScore = win ? 80 : 100;
  return {
    teamAScore: userScore,
    teamBScore: opponentScore,
    winnerId: win ? state.team.id : opponentId,
    boxScore: {
      [state.team.id]: state.team.players.map((p) => ({ playerId: p.id, points: 20, rebounds: 4, assists: 3, steals: 1, blocks: 0 })),
      [opponentId]: [],
    },
  };
}

test('advanceSeason records a win and keeps the perfect season alive', () => {
  const state = freshState();
  const next = advanceSeason(state, resultFor(state, true));
  expect(next.season.record.wins).toBe(1);
  expect(next.season.perfectSeasonAlive).toBe(true);
});

test('advanceSeason flips perfectSeasonAlive to false on the first loss and it stays false after a later win', () => {
  let state = freshState();
  state = advanceSeason(state, resultFor(state, false));
  expect(state.season.perfectSeasonAlive).toBe(false);
  state = advanceSeason(state, resultFor(state, true));
  expect(state.season.perfectSeasonAlive).toBe(false);
});

test('advanceSeason triggers offseason processing and starts a new season after 82 games', () => {
  let state = freshState();
  for (let i = 0; i < 81; i++) {
    state = advanceSeason(state, resultFor(state, true));
  }
  expect(state.season.completedGames).toHaveLength(81);
  const next = advanceSeason(state, resultFor(state, true));
  expect(next.careerHistory).toHaveLength(1);
  if (!next.retired) {
    expect(next.season.completedGames).toHaveLength(0);
    expect(next.season.year).toBe(state.season.year + 1);
  }
});
