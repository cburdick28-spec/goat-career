import { test, expect } from 'vitest';
import { renderSeasonRecap, playoffHeadline } from '../../src/ui/recap.js';
import { currentStreak, headToHead } from '../../src/ui/dashboard.js';

const champEntry = {
  year: 3,
  teamName: 'Boston Celtics',
  age: 21,
  record: { wins: 64, losses: 18 },
  awards: { mvp: true },
  averages: { points: 27.5, rebounds: 7.1, assists: 5.2 },
  changes: { shooting: 3, speed: 0, dunking: -1, defense: 2, passing: 1, rebounding: 4 },
  playoffs: {
    made: true,
    champion: true,
    eliminatedIn: null,
    rounds: [
      { round: 'First Round', opponentName: 'Miami Heat', wins: 4, losses: 1, won: true },
      { round: 'NBA Finals', opponentName: 'Denver Nuggets', wins: 4, losses: 3, won: true },
    ],
  },
};

test('playoffHeadline covers champion, eliminated and missed', () => {
  expect(playoffHeadline(champEntry.playoffs)).toContain('CHAMPIONS');
  expect(playoffHeadline({ made: true, champion: false, eliminatedIn: 'Conference Finals' })).toContain('Conference Finals');
  expect(playoffHeadline({ made: false })).toBe('Missed the playoffs');
});

test('recap shows record, playoff run, awards and attribute changes, and continues on click', () => {
  const root = document.createElement('div');
  let continued = false;
  renderSeasonRecap(root, champEntry, { retired: false }, () => (continued = true));
  expect(root.querySelector('#recap-record').textContent).toBe('64-18');
  expect(root.querySelector('#recap-playoffs').textContent).toContain('CHAMPIONS');
  expect(root.textContent).toContain('Boston Celtics');
  expect(root.textContent).toContain('League MVP');
  expect(root.querySelector('#recap-series').textContent).toContain('Denver Nuggets');
  expect(root.querySelector('#recap-changes').textContent).toContain('+4');
  expect(root.querySelector('#recap-continue').textContent).toBe('Start Season 4');
  root.querySelector('#recap-continue').click();
  expect(continued).toBe(true);
});

test('recap flags a perfect season and a retirement', () => {
  const root = document.createElement('div');
  renderSeasonRecap(root, { ...champEntry, record: { wins: 82, losses: 0 } }, { retired: true }, () => {});
  expect(root.textContent).toContain('PERFECT 82-0 SEASON');
  expect(root.querySelector('#recap-continue').textContent).toBe('See career summary');
});

test('recap escapes team names', () => {
  const root = document.createElement('div');
  renderSeasonRecap(root, { ...champEntry, teamName: '<img src=x onerror=alert(1)>' }, { retired: false }, () => {});
  expect(root.querySelector('img')).toBeNull();
});

const game = (opp, won) => ({ opponentTeamId: opp, opponentName: opp, userTeamId: 'me', winnerId: won ? 'me' : opp });

test('currentStreak counts the trailing run of results', () => {
  expect(currentStreak([])).toBeNull();
  expect(currentStreak([game('a', false), game('b', true), game('c', true), game('d', true)])).toEqual({ type: 'W', count: 3 });
  expect(currentStreak([game('a', true), game('b', false)])).toEqual({ type: 'L', count: 1 });
});

test('headToHead tallies your record against each opponent', () => {
  const rows = headToHead([game('Lakers', true), game('Lakers', false), game('Heat', true)]);
  expect(rows).toEqual([
    { name: 'Lakers', wins: 1, losses: 1 },
    { name: 'Heat', wins: 1, losses: 0 },
  ]);
});

test('dashboard renders a season history line when averages only have three stats', async () => {
  const { renderDashboard } = await import('../../src/ui/dashboard.js');
  const { simGames } = await import('../../src/sim/simControl.js');
  const { createPlayer } = await import('../../src/data/player.js');
  const { assembleUserTeam } = await import('../../src/data/team.js');
  const { findFranchise } = await import('../../src/data/nbaTeams.js');
  const { generateSeason } = await import('../../src/sim/schedule.js');
  const { createCareerState } = await import('../../src/data/career.js');
  const player = createPlayer({
    name: 'Me', position: 'PG', archetype: 'PLAYMAKER', mode: 'draft',
    attributes: { shooting: 70, speed: 70, dunking: 70, defense: 70, passing: 70, rebounding: 70 },
  });
  const team = assembleUserTeam(player, 1, findFranchise('miami-heat'));
  const { state } = simGames(createCareerState(player, team, generateSeason(team, 1)), 82, 3);
  const el = document.createElement('div');
  expect(() => renderDashboard(el, state)).not.toThrow();
  expect(el.textContent).toContain('Season 1');
});
