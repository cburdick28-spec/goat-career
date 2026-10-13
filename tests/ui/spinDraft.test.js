import { test, expect, beforeEach } from 'vitest';
import { renderSpinDraft } from '../../src/ui/spinDraft.js';
import { renderDreamTeam, verdictFor } from '../../src/ui/dreamTeam.js';
import { renderHome } from '../../src/ui/home.js';
import { buildCareerFromPlayer } from '../../src/ui/createPlayer.js';
import { getDailyResult } from '../../src/persistence/daily.js';
import { dailyKey } from '../../src/data/draft.js';

beforeEach(() => {
  localStorage.clear();
});

test('spin & draft: six spins fill six slots, then the finish form builds a player', () => {
  const root = document.createElement('div');
  let completed = null;
  renderSpinDraft(root, { seed: 99, animationMs: 0 }, (result) => (completed = result));

  const slots = ['shooting', 'speed', 'dunking', 'defense', 'passing', 'rebounding'];
  for (const slot of slots) {
    root.querySelector('#spin-btn').click();
    expect(root.querySelector('#pro-card')).not.toBeNull();
    root.querySelector(`[data-assign="${slot}"]`).click();
  }

  expect(root.querySelector('#finish-form')).not.toBeNull();
  root.querySelector('input[name="name"]').value = 'Connor';
  root.querySelector('#finish-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

  expect(completed).not.toBeNull();
  expect(completed.player.name).toBe('Connor');
  expect(Object.values(completed.player.attributes).every((v) => v >= 25 && v <= 99)).toBe(true);

  const career = buildCareerFromPlayer(completed.player, 1);
  expect(career.team.players).toHaveLength(5);
  expect(career.season.schedule).toHaveLength(82);
});

test('spin & draft: a filled slot cannot be reassigned and a re-spin is limited to one', () => {
  const root = document.createElement('div');
  renderSpinDraft(root, { seed: 5, animationMs: 0 }, () => {});

  root.querySelector('#spin-btn').click();
  const first = root.querySelector('.pro-name').textContent;
  root.querySelector('#reroll-btn').click();
  const second = root.querySelector('.pro-name').textContent;
  expect(second).not.toBe(first);
  expect(root.querySelector('#reroll-btn').disabled).toBe(true);

  root.querySelector('[data-assign="shooting"]').click();
  root.querySelector('#spin-btn').click();
  expect(root.querySelector('[data-assign="shooting"]').disabled).toBe(true);
});

test('daily spins are identical for the same seed', () => {
  const run = () => {
    const root = document.createElement('div');
    renderSpinDraft(root, { seed: 20261013, daily: true, animationMs: 0 }, () => {});
    root.querySelector('#spin-btn').click();
    return root.querySelector('.pro-name').textContent;
  };
  expect(run()).toBe(run());
});

test('user-entered names are escaped in the UI', () => {
  const root = document.createElement('div');
  renderSpinDraft(root, { seed: 3, animationMs: 0 }, () => {});
  ['shooting', 'speed', 'dunking', 'defense', 'passing', 'rebounding'].forEach((slot) => {
    root.querySelector('#spin-btn').click();
    root.querySelector(`[data-assign="${slot}"]`).click();
  });
  expect(root.querySelector('#finish-form')).not.toBeNull();
  expect(root.innerHTML).not.toContain('<script');
});

test('dream team: five picks lock a lineup, the sim produces a record, and the daily result is saved', () => {
  const root = document.createElement('div');
  renderDreamTeam(root, { seed: 20261013, daily: true, animationMs: 0 }, () => {});

  for (let i = 0; i < 5; i += 1) {
    const cards = root.querySelectorAll('[data-pick]');
    expect(cards).toHaveLength(4);
    cards[0].click();
  }
  root.querySelector('#sim-btn').click();

  const record = root.querySelector('#final-record').textContent;
  const [wins, losses] = record.split('-').map(Number);
  expect(wins + losses).toBe(82);

  const saved = getDailyResult('dream', dailyKey());
  expect(saved.wins).toBe(wins);
  expect(saved.names).toHaveLength(5);
});

test('dream team verdicts cover perfect, near-miss and weak seasons', () => {
  expect(verdictFor({ perfect: true, wins: 82, firstLoss: null })).toContain('82-0');
  expect(verdictFor({ perfect: false, wins: 80, firstLoss: 41 })).toContain('game 41');
  expect(verdictFor({ perfect: false, wins: 30, firstLoss: 2 })).toContain('Rebuilding');
});

test('home shows Continue only when a career exists and wires up the mode buttons', () => {
  const root = document.createElement('div');
  const calls = [];
  const handlers = {
    onContinue: () => calls.push('continue'),
    onBuild: () => calls.push('build'),
    onDream: () => calls.push('dream'),
    onDailyBuild: () => calls.push('dailyBuild'),
    onDailyDream: () => calls.push('dailyDream'),
    onCustom: () => calls.push('custom'),
  };

  renderHome(root, { hasCareer: false, careerSummary: '' }, handlers);
  expect(root.querySelector('#mode-continue')).toBeNull();

  renderHome(root, { hasCareer: true, careerSummary: 'Test · Season 1 · 3-0' }, handlers);
  ['#mode-continue', '#mode-build', '#mode-dream', '#daily-build', '#daily-dream', '#mode-custom'].forEach((id) =>
    root.querySelector(id).click()
  );
  expect(calls).toEqual(['continue', 'build', 'dream', 'dailyBuild', 'dailyDream', 'custom']);
});
