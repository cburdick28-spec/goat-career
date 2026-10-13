import { simulateGame } from './boxscore.js';
import { advanceSeason } from './seasonFlow.js';
import { createRng } from './rng.js';

export const SEASON_GAMES = 82;

// Auto-plays up to `count` games, stopping early when the season ends (so the
// recap screen can show) or the career is over. Returns the new state and
// whether a season just finished.
export function simGames(careerState, count, baseSeed = Date.now()) {
  let state = careerState;
  let played = 0;
  let seasonEnded = false;

  while (played < count && !state.retired) {
    const gameIndex = state.season.completedGames.length;
    const scheduled = state.season.schedule[gameIndex];
    const opponent = state.season.leagueTeams.find((t) => t.id === scheduled.opponentTeamId);
    const result = simulateGame(state.team, opponent, createRng((baseSeed + gameIndex * 31 + played) % 2147483647));
    const before = state.careerHistory.length;
    state = advanceSeason(state, result);
    played += 1;
    if (state.careerHistory.length > before) {
      seasonEnded = true;
      break;
    }
  }

  return { state, played, seasonEnded };
}

export function gamesRemaining(careerState) {
  return SEASON_GAMES - careerState.season.completedGames.length;
}

const MAX_CAREER_SEASONS = 30;

// Sims every remaining game of the career until the player retires.
export function simCareer(careerState, baseSeed = Date.now()) {
  let state = careerState;
  let seasons = 0;
  while (!state.retired && seasons < MAX_CAREER_SEASONS) {
    state = simGames(state, 82, baseSeed + seasons * 7919).state;
    seasons += 1;
  }
  return state;
}
