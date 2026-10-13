import { simulateGame } from './boxscore.js';
import { computeTeamStrength } from '../data/team.js';
import { ATTRIBUTE_KEYS } from '../data/player.js';

export const PLAYOFF_WIN_CUTOFF = 42;
export const PLAYOFF_ROUNDS = ['First Round', 'Conference Semifinals', 'Conference Finals', 'NBA Finals'];
// Where in the strength ranking (0 = weakest, 1 = strongest) each round's opponent sits.
const ROUND_OPPONENT_QUANTILE = [0.45, 0.6, 0.78, 0.93];

function seriesOpponents(leagueTeams) {
  const ranked = [...leagueTeams].sort((a, b) => computeTeamStrength(a) - computeTeamStrength(b));
  return ROUND_OPPONENT_QUANTILE.map((q) => ranked[Math.min(ranked.length - 1, Math.floor(q * ranked.length))]);
}

// Playoff opponents are tougher than the regular season: every round, the
// other team's players get a rating boost (capped at 99).
const ROUND_BOOST = [1, 3, 5, 7];

function boostTeam(team, boost) {
  return {
    ...team,
    players: team.players.map((p) => ({
      ...p,
      attributes: Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, Math.min(99, p.attributes[k] + boost)])),
    })),
  };
}

function playSeries(team, opponent, rng) {
  let wins = 0;
  let losses = 0;
  while (wins < 4 && losses < 4) {
    const result = simulateGame(team, opponent, rng);
    if (result.winnerId === team.id) wins += 1;
    else losses += 1;
  }
  return { opponentName: opponent.name, wins, losses, won: wins === 4 };
}

// Best-of-seven rounds against tougher and tougher opponents. Miss the
// win cutoff and the season ends after game 82.
export function simulatePlayoffs(team, leagueTeams, regularSeasonWins, rng) {
  if (regularSeasonWins < PLAYOFF_WIN_CUTOFF) {
    return { made: false, rounds: [], champion: false, eliminatedIn: null };
  }

  const opponents = seriesOpponents(leagueTeams);
  const rounds = [];
  for (let i = 0; i < PLAYOFF_ROUNDS.length; i += 1) {
    const series = { round: PLAYOFF_ROUNDS[i], ...playSeries(team, boostTeam(opponents[i], ROUND_BOOST[i]), rng) };
    rounds.push(series);
    if (!series.won) {
      return { made: true, rounds, champion: false, eliminatedIn: series.round };
    }
  }
  return { made: true, rounds, champion: true, eliminatedIn: null };
}
