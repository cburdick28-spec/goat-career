import { test, expect, vi, beforeEach } from 'vitest';
import { saveCareer, loadCareer } from '../../src/persistence/storage.js';
import { createCareerState } from '../../src/data/career.js';

const player = { id: 'p1', name: 'Me', attributes: {} };
const team = { id: 't1', name: 'Your Team', players: [player] };
const season = { year: 1, leagueTeams: [], schedule: [] };

beforeEach(() => {
  localStorage.clear();
});

test('saveCareer then loadCareer round-trips the same state', () => {
  const state = createCareerState(player, team, season);
  saveCareer(state);
  const { state: loaded, fresh } = loadCareer();
  expect(fresh).toBe(false);
  expect(loaded).toEqual(state);
});

test('loadCareer returns fresh:true when nothing is stored', () => {
  const { state, fresh } = loadCareer();
  expect(fresh).toBe(true);
  expect(state).toBeNull();
});

test('loadCareer returns fresh:true when stored data is corrupted JSON', () => {
  localStorage.setItem('goat-career:v1', '{not valid json');
  const { state, fresh } = loadCareer();
  expect(fresh).toBe(true);
  expect(state).toBeNull();
});

test('saveCareer does not throw when localStorage.setItem throws (quota/private mode)', () => {
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('QuotaExceededError');
  });
  const state = createCareerState(player, team, season);
  expect(() => saveCareer(state)).not.toThrow();
  spy.mockRestore();
});
