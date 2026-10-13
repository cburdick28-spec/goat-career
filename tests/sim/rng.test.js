import { test, expect } from 'vitest';
import { createRng } from '../../src/sim/rng.js';

test('createRng is deterministic for a given seed', () => {
  const a = createRng(42);
  const b = createRng(42);
  const seqA = [a(), a(), a()];
  const seqB = [b(), b(), b()];
  expect(seqA).toEqual(seqB);
  seqA.forEach((n) => {
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThan(1);
  });
});
