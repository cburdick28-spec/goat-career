import { test, expect } from 'vitest';
import { computeFlightTime, computeShotVelocity, GRAVITY } from '../../src/engine/shooting.js';
import { checkScoringTrigger } from '../../src/engine/collision.js';

test('a shot aimed at the hoop arrives at the hoop center descending, triggering a score', () => {
  const from = { x: 0, y: 1.5, z: 5 };
  const hoopBounds = { center: { x: 0, y: 3, z: 12 }, radius: 0.5 };
  const flightTime = computeFlightTime(from, hoopBounds.center);
  const velocity = computeShotVelocity(from, hoopBounds.center, flightTime);

  let pos = { ...from };
  const vel = { ...velocity };
  const dt = 1 / 60;
  let scored = false;
  for (let t = 0; t < flightTime + 0.2; t += dt) {
    vel.y -= GRAVITY * dt;
    pos = { x: pos.x + vel.x * dt, y: pos.y + vel.y * dt, z: pos.z + vel.z * dt };
    if (checkScoringTrigger(pos, vel, hoopBounds)) {
      scored = true;
      break;
    }
  }
  expect(scored).toBe(true);
});

test('a shot from farther away takes longer to arrive than a close shot', () => {
  const near = computeFlightTime({ x: 0, y: 1.5, z: 0 }, { x: 0, y: 3, z: 2 });
  const far = computeFlightTime({ x: 0, y: 1.5, z: 0 }, { x: 0, y: 3, z: 20 });
  expect(far).toBeGreaterThan(near);
});
