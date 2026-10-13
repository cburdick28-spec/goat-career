const RETIREMENT_AGE_FLOOR = 34;
const RETIREMENT_AGE_FORCE = 42;
const RETIREMENT_PERFORMANCE_PPG = 8;

export function shouldRetire(player, seasonBoxScores) {
  if (player.age >= RETIREMENT_AGE_FORCE) return true;
  if (player.age >= RETIREMENT_AGE_FLOOR) {
    const avgPoints = seasonBoxScores.reduce((sum, g) => sum + g.points, 0) / seasonBoxScores.length;
    return avgPoints < RETIREMENT_PERFORMANCE_PPG;
  }
  return false;
}
