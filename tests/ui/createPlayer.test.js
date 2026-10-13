import { test, expect } from 'vitest';
import { buildCareerFromForm } from '../../src/ui/createPlayer.js';

test('buildCareerFromForm creates a player, assembles a team, and generates a season', () => {
  const formState = {
    name: 'Test Player',
    position: 'SG',
    archetype: 'SHARPSHOOTER',
    attributes: { shooting: 70, speed: 60, dunking: 50, defense: 40, passing: 60, rebounding: 40 },
    mode: 'normal',
  };
  const careerState = buildCareerFromForm(formState, 123);
  expect(careerState.player.name).toBe('Test Player');
  expect(careerState.team.players).toHaveLength(5);
  expect(careerState.season.schedule).toHaveLength(82);
  expect(careerState.retired).toBe(false);
});
