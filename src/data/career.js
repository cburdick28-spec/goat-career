export function createCareerState(player, team, season) {
  return {
    player,
    team,
    season: {
      ...season,
      record: { wins: 0, losses: 0 },
      perfectSeasonAlive: true,
      completedGames: [],
    },
    careerHistory: [],
    retired: false,
  };
}
