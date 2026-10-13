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

test('isAiStuck is true when recent positions barely moved', () => {
  const stillPositions = Array.from({ length: 90 }, () => ({ x: 1, z: 1 }));
  expect(isAiStuck(stillPositions)).toBe(true);
});

test('isAiStuck is false when the player is actually moving', () => {
  const movingPositions = Array.from({ length: 90 }, (_, i) => ({ x: i * 0.1, z: 0 }));
  expect(isAiStuck(movingPositions)).toBe(false);
});
