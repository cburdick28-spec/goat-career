const ALL_STAR_PPG = 20;
const ALL_STAR_RPG = 10;
const ALL_STAR_APG = 8;
const MVP_PPG = 27;
const MVP_WIN_RATE = 0.65;

function average(seasonBoxScores, key) {
  return seasonBoxScores.reduce((sum, g) => sum + g[key], 0) / seasonBoxScores.length;
}

export function checkAwards(seasonBoxScores, teamWinRate) {
  const avgPoints = average(seasonBoxScores, 'points');
  const avgRebounds = average(seasonBoxScores, 'rebounds');
  const avgAssists = average(seasonBoxScores, 'assists');

  const allStar = avgPoints >= ALL_STAR_PPG || avgRebounds >= ALL_STAR_RPG || avgAssists >= ALL_STAR_APG;
  const mvp = avgPoints >= MVP_PPG && teamWinRate >= MVP_WIN_RATE;

  return { allStar, mvp };
}
