import { createRng } from './rng.js';
import { generateOpponentTeam } from '../data/team.js';

export const LEAGUE_SIZE = 15;
const SEASON_LENGTH = 82;

// Final-review fix: team names were `Team <huge seed-derived number>`,
// which looked broken in the dashboard/standings. Names are assigned by
// league slot (0-14), not by the seed, so they stay readable at any seed.
const LEAGUE_TEAM_NAMES = [
  'Comets', 'Thunderbolts', 'Ironclads', 'Ravens', 'Wildcats',
  'Scorchers', 'Nighthawks', 'Vipers', 'Granite', 'Blaze',
  'Monarchs', 'Outlaws', 'Tremors', 'Rapids', 'Sentinels',
];

export function generateSeason(userTeam, seed) {
  const leagueTeams = Array.from({ length: LEAGUE_SIZE }, (_, i) => ({
    ...generateOpponentTeam(seed * 1000 + i),
    name: LEAGUE_TEAM_NAMES[i % LEAGUE_TEAM_NAMES.length],
  }));

  const rng = createRng(seed);
  const schedule = Array.from({ length: SEASON_LENGTH }, (_, i) => {
    const opponentTeamId = leagueTeams[Math.floor(rng() * LEAGUE_SIZE)].id;
    return { id: `game-${seed}-${i}`, opponentTeamId, played: false };
  });

  return { year: 1, leagueTeams, schedule };
}
