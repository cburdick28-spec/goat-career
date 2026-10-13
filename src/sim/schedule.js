import { createRng } from './rng.js';
import { generateOpponentTeam } from '../data/team.js';

import { NBA_TEAMS } from '../data/nbaTeams.js';

// Everyone except the franchise you play for.
export const LEAGUE_SIZE = NBA_TEAMS.length - 1;
const SEASON_LENGTH = 82;

export function generateSeason(userTeam, seed) {
  const opponents = NBA_TEAMS.filter((t) => t.franchiseId !== userTeam.franchiseId).slice(0, LEAGUE_SIZE);
  const leagueTeams = opponents.map((franchise, i) => ({
    ...generateOpponentTeam(seed * 1000 + i),
    name: franchise.name,
    franchiseId: franchise.franchiseId,
  }));

  const rng = createRng(seed);
  const schedule = Array.from({ length: SEASON_LENGTH }, (_, i) => {
    const opponentTeamId = leagueTeams[Math.floor(rng() * LEAGUE_SIZE)].id;
    return { id: `game-${seed}-${i}`, opponentTeamId, played: false };
  });

  return { year: 1, leagueTeams, schedule };
}
