import { test, expect } from 'vitest';
import { computeStandings, formatGameLog, computePlayerAverages } from '../../src/ui/dashboard.js';

const USER_TEAM_ID = 'user';

function result(opponentId, userScore, opponentScore) {
  return {
    userScore,
    opponentScore,
    winnerId: userScore > opponentScore ? USER_TEAM_ID : opponentId,
    opponentTeamId: opponentId,
    opponentName: `Team ${opponentId}`,
    userTeamId: USER_TEAM_ID,
    gameId: `g-${opponentId}-${userScore}-${opponentScore}`,
  };
}

test('computeStandings sorts teams by wins descending', () => {
  const teams = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const games = [
    { winnerId: 'a', teams: ['a', 'b'] },
    { winnerId: 'a', teams: ['a', 'c'] },
    { winnerId: 'b', teams: ['b', 'c'] },
    { winnerId: 'c', teams: ['b', 'c'] },
  ];
  const standings = computeStandings(teams, games);
  expect(standings.map((s) => s.teamId)).toEqual(['a', 'b', 'c']);
});

test('computePlayerAverages averages the stored per-game user stat line', () => {
  const games = [
    { userPlayerLine: { points: 20, rebounds: 4, assists: 6, steals: 1, blocks: 0 } },
    { userPlayerLine: { points: 30, rebounds: 6, assists: 4, steals: 3, blocks: 2 } },
  ];
  const averages = computePlayerAverages(games);
  expect(averages.points).toBe(25);
  expect(averages.assists).toBe(5);
});

test('computePlayerAverages returns zeroes for an empty season so far', () => {
  const averages = computePlayerAverages([]);
  expect(averages.points).toBe(0);
});

test('formatGameLog marks wins and losses correctly from the user team perspective', () => {
  const games = [result('opp1', 100, 90), result('opp2', 80, 95)];
  const log = formatGameLog(games);
  expect(log[0].result).toBe('W');
  expect(log[0].score).toBe('100-90');
  expect(log[1].result).toBe('L');
  expect(log[1].score).toBe('80-95');
});
