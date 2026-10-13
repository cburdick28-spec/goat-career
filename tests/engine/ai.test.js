import { test, expect } from 'vitest';
import { decideAiAction, SHOT_OPENNESS_THRESHOLD } from '../../src/engine/ai.js';

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
