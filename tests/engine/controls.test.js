import { test, expect } from 'vitest';
import { mapKeysToAction } from '../../src/engine/controls.js';

test('mapKeysToAction reads WASD as movement', () => {
  const action = mapKeysToAction(new Set(['w']));
  expect(action.move.z).toBeLessThan(0);
});

test('mapKeysToAction reads Space as shoot', () => {
  expect(mapKeysToAction(new Set([' '])).shoot).toBe(true);
});

test('mapKeysToAction reads P as pass and S as steal', () => {
  expect(mapKeysToAction(new Set(['p'])).pass).toBe(true);
  expect(mapKeysToAction(new Set(['s'])).steal).toBe(true);
});
