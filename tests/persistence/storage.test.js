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
  const { state: loaded, fresh, corrupted } = loadCareer();
  expect(fresh).toBe(false);
  expect(corrupted).toBe(false);
  expect(loaded).toEqual(state);
});

test('loadCareer returns fresh:true, corrupted:false when nothing is stored', () => {
  const { state, fresh, corrupted } = loadCareer();
  expect(fresh).toBe(true);
  expect(corrupted).toBe(false);
  expect(state).toBeNull();
});

test('loadCareer returns corrupted:true when stored data is invalid JSON', () => {
  localStorage.setItem('goat-career:v1', '{not valid json');
  const { state, fresh, corrupted } = loadCareer();
  expect(fresh).toBe(true);
  expect(corrupted).toBe(true);
  expect(state).toBeNull();
});

test('loadCareer returns corrupted:true when stored JSON has the wrong shape', () => {
  localStorage.setItem('goat-career:v1', JSON.stringify({ some: 'unrelated', data: 1 }));
  const { state, fresh, corrupted } = loadCareer();
  expect(fresh).toBe(true);
  expect(corrupted).toBe(true);
  expect(state).toBeNull();
});

test('saveCareer does not throw when localStorage.setItem throws (quota/private mode)', () => {
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('QuotaExceededError');
  });
  try {
    const state = createCareerState(player, team, season);
    expect(() => saveCareer(state)).not.toThrow();
  } finally {
    spy.mockRestore();
  }
});
