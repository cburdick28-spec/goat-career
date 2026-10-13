import { test, expect } from 'vitest';
import { checkScoringTrigger, isAiStuck } from '../../src/engine/collision.js';

test('checkScoringTrigger is true when the ball is inside the hoop radius, near rim height, and descending', () => {
  const bounds = { center: { x: 0, y: 3, z: 10 }, radius: 0.5 };
  expect(checkScoringTrigger({ x: 0.1, y: 3.1, z: 10 }, { x: 0, y: -2, z: 0 }, bounds)).toBe(true);
});

test('checkScoringTrigger is false when the ball is rising through the same position', () => {
  const bounds = { center: { x: 0, y: 3, z: 10 }, radius: 0.5 };
  expect(checkScoringTrigger({ x: 0.1, y: 3.1, z: 10 }, { x: 0, y: 2, z: 0 }, bounds)).toBe(false);
});

test('checkScoringTrigger is false when the ball is outside the hoop radius', () => {
  const bounds = { center: { x: 0, y: 3, z: 10 }, radius: 0.5 };
  expect(checkScoringTrigger({ x: 5, y: 3.1, z: 10 }, { x: 0, y: -2, z: 0 }, bounds)).toBe(false);
});

test('isAiStuck is true when position barely changed over the whole time window, regardless of sample count (frame-rate independent)', () => {
  // 120Hz: many samples, tiny per-frame deltas, but near-zero net movement over the window
  const highFreq = Array.from({ length: 108 }, (_, i) => ({ x: 1 + Math.sin(i) * 0.01, z: 1, t: i * (1 / 120) }));
  expect(isAiStuck(highFreq)).toBe(true);

  // 30Hz: fewer samples, same ~0.9s window, same near-zero net movement
  const lowFreq = Array.from({ length: 27 }, (_, i) => ({ x: 1 + Math.sin(i) * 0.01, z: 1, t: i * (1 / 30) }));
  expect(isAiStuck(lowFreq)).toBe(true);
});

test('isAiStuck is false when the player actually moved across the window, at any frame rate', () => {
  const highFreq = Array.from({ length: 108 }, (_, i) => ({ x: i * (1 / 120) * 5, z: 0, t: i * (1 / 120) }));
  expect(isAiStuck(highFreq)).toBe(false);

  const lowFreq = Array.from({ length: 27 }, (_, i) => ({ x: i * (1 / 30) * 5, z: 0, t: i * (1 / 30) }));
  expect(isAiStuck(lowFreq)).toBe(false);
});

test('isAiStuck is false when there is not yet a full window of history', () => {
  expect(isAiStuck([{ x: 1, z: 1, t: 0 }])).toBe(false);
});
