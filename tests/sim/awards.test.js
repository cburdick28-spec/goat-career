import { test, expect } from 'vitest';
import { checkAwards } from '../../src/sim/awards.js';

test('checkAwards grants All-Star for 20+ ppg even with a losing team', () => {
  const season = Array.from({ length: 10 }, () => ({ points: 22, rebounds: 4, assists: 3, steals: 1, blocks: 0 }));
  expect(checkAwards(season, 0.3).allStar).toBe(true);
});

test('checkAwards grants MVP only when both scoring and team win rate thresholds are met', () => {
  const season = Array.from({ length: 10 }, () => ({ points: 29, rebounds: 6, assists: 5, steals: 1, blocks: 0 }));
  expect(checkAwards(season, 0.7).mvp).toBe(true);
  expect(checkAwards(season, 0.4).mvp).toBe(false);
});
