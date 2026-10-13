import { test, expect } from 'vitest';
import { decideAiAction, SHOT_OPENNESS_THRESHOLD, computeOpenness, findPassTarget } from '../../src/engine/ai.js';

test('decideAiAction defends when the AI is not on the possessing team', () => {
  expect(
    decideAiAction({ teamId: 'b' }, { possessionTeamId: 'a', ballHolderId: 'x', aiPlayerId: 'y', distanceToBall: 5, openness: 0.9 })
  ).toBe('DEFEND');
});

test('decideAiAction seeks an open shot when holding the ball and open', () => {
  expect(
    decideAiAction({ teamId: 'a' }, { possessionTeamId: 'a', ballHolderId: 'y', aiPlayerId: 'y', distanceToBall: 0, openness: 0.8 })
  ).toBe('SEEK_OPEN_SHOT');
});

test('decideAiAction chases the ball otherwise', () => {
  expect(
    decideAiAction({ teamId: 'a' }, { possessionTeamId: 'a', ballHolderId: 'x', aiPlayerId: 'y', distanceToBall: 5, openness: 0.1 })
  ).toBe('CHASE_BALL');
});

test('SHOT_OPENNESS_THRESHOLD is exported for the live engine to reuse', () => {
  expect(SHOT_OPENNESS_THRESHOLD).toBe(0.6);
});

test('computeOpenness is 1 (fully open) when the nearest defender is far away', () => {
  const openness = computeOpenness({ x: 0, z: 0 }, [{ x: 10, z: 10 }]);
  expect(openness).toBe(1);
});

test('computeOpenness is 0 (fully contested) when a defender is right on top of the shooter', () => {
  const openness = computeOpenness({ x: 0, z: 0 }, [{ x: 0, z: 0 }]);
  expect(openness).toBe(0);
});

test('computeOpenness uses the nearest of several defenders', () => {
  const openness = computeOpenness({ x: 0, z: 0 }, [{ x: 10, z: 10 }, { x: 1, z: 0 }]);
  expect(openness).toBeLessThan(1);
  expect(openness).toBeGreaterThan(0);
});

test('findPassTarget picks the nearest teammate, excluding the passer', () => {
  const teammates = [
    { id: 'self', x: 0, z: 0 },
    { id: 'far', x: 10, z: 10 },
    { id: 'near', x: 1, z: 0 },
  ];
  expect(findPassTarget('self', teammates)).toBe('near');
});
