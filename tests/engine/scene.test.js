import { test, expect } from 'vitest';
import { getHoopBounds } from '../../src/engine/scene.js';

test('getHoopBounds places home and away hoops at opposite ends of the court', () => {
  const home = getHoopBounds('home');
  const away = getHoopBounds('away');
  expect(home.center.z).toBeCloseTo(-away.center.z);
  expect(home.radius).toBeGreaterThan(0);
});
