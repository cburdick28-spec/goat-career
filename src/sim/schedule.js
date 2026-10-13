import { createRng } from './rng.js';
import { generateOpponentTeam } from '../data/team.js';

export const LEAGUE_SIZE = 15;
const SEASON_LENGTH = 82;

export function generateSeason(userTeam, seed) {
  const leagueTeams = Array.from({ length: LEAGUE_SIZE }, (_, i) => generateOpponentTeam(seed * 1000 + i));

  const rng = createRng(seed);
  const schedule = Array.from({ length: SEASON_LENGTH }, (_, i) => {
    const opponentTeamId = leagueTeams[Math.floor(rng() * LEAGUE_SIZE)].id;
    return { id: `game-${seed}-${i}`, opponentTeamId, played: false };
  });

  return { year: 1, leagueTeams, schedule };
}
