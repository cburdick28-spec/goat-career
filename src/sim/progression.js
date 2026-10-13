import { ATTRIBUTE_KEYS, ATTRIBUTE_MIN, ATTRIBUTE_MAX } from '../data/player.js';

const AGE_GROWTH_PHASE_END = 26;
const AGE_PEAK_PHASE_END = 31;
const PERFORMANCE_THRESHOLD_PPG = 18;

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function averagePoints(seasonBoxScores) {
  const total = seasonBoxScores.reduce((sum, g) => sum + g.points, 0);
  return total / seasonBoxScores.length;
}

export function applyProgression(player, seasonBoxScores) {
  const avgPoints = averagePoints(seasonBoxScores);
  const strong = avgPoints >= PERFORMANCE_THRESHOLD_PPG;
  const age = player.age;

  let delta;
  if (age <= AGE_GROWTH_PHASE_END) {
    delta = () => (strong ? randomInt(2, 4) : randomInt(0, 2));
  } else if (age <= AGE_PEAK_PHASE_END) {
    delta = () => randomInt(-1, 1);
  } else {
    delta = () => (strong ? randomInt(-2, -1) : randomInt(-5, -2));
  }

  const attributes = Object.fromEntries(
    ATTRIBUTE_KEYS.map((k) => [k, Math.min(ATTRIBUTE_MAX, Math.max(ATTRIBUTE_MIN, player.attributes[k] + delta()))])
  );

  return { ...player, age: age + 1, attributes };
}
