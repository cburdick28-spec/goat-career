import {
  POSITIONS,
  tierOf,
  spinPlayer,
  createDraft,
  assignSlot,
  filledSlotCount,
  isDraftComplete,
  draftAttributes,
  draftOverall,
  archetypeFor,
  buildPlayerFromDraft,
  dailyKey,
} from '../data/draft.js';
import { NBA_PLAYERS } from '../data/nbaPlayers.js';
import { ATTRIBUTE_KEYS } from '../data/player.js';
import { saveDailyResult } from '../persistence/daily.js';
import { escapeHtml, capitalize } from './html.js';

const DEFAULT_POSITION = {
  SHARPSHOOTER: 'SG',
  SLASHER: 'SF',
  LOCKDOWN_DEFENDER: 'SF',
  PLAYMAKER: 'PG',
  REBOUNDER: 'C',
};

// Spin & Draft: spin a reel of real pros, then choose which attribute slot
// their rating fills. Six spins, six slots, then the career sim takes over.
export function renderSpinDraft(rootEl, options, onComplete, onBack) {
  const { seed = Date.now(), daily = false, animationMs = 1100, rerolls = 1 } = options || {};
  const state = {
    draft: createDraft(),
    spinIndex: 0,
    pro: null, // the pro currently waiting to be assigned
    spinning: false,
    rerollsLeft: rerolls,
    usedIds: [],
  };

  function slotMarkup(key) {
    const slot = state.draft.slots[key];
    return `
      <div class="slot ${slot ? 'filled' : 'empty'}" data-slot="${key}">
        <span class="slot-label">${capitalize(key)}</span>
        <span class="slot-value">${slot ? slot.value : '—'}</span>
        <span class="slot-pro">${slot ? escapeHtml(slot.proName) : 'empty'}</span>
      </div>`;
  }

  function proCardMarkup(pro) {
    const tier = tierOf(pro.ovr);
    return `
      <div class="pro-card tier-${tier.id}" id="pro-card">
        <div class="pro-head">
          <span class="tier-badge tier-${tier.id}">${tier.label}</span>
          <span class="pro-ovr">${pro.ovr}</span>
        </div>
        <div class="pro-name">${escapeHtml(pro.name)}</div>
        <div class="pro-pos">${pro.pos.join(' / ')}</div>
        <p class="hint">Tap a slot to bolt on their rating</p>
        <div class="rating-grid">
          ${ATTRIBUTE_KEYS.map((k) => {
            const filled = !!state.draft.slots[k];
            return `<button class="rating-btn" data-assign="${k}" ${filled ? 'disabled' : ''}>
              <span>${capitalize(k)}</span><strong>${pro.attrs[k]}</strong>
            </button>`;
          }).join('')}
        </div>
      </div>`;
  }

  function renderSpin() {
    const done = filledSlotCount(state.draft);
    rootEl.innerHTML = `
      <section class="spin-screen">
        <div class="screen-head">
          <button class="link-btn" id="back-btn">‹ Home</button>
          <span class="chip">${daily ? 'DAILY · ' : ''}${done}/6 slots</span>
        </div>
        <div class="slot-grid">${ATTRIBUTE_KEYS.map(slotMarkup).join('')}</div>
        <div class="reel" id="reel" aria-live="polite">
          <span class="reel-name" id="reel-name">${state.pro ? escapeHtml(state.pro.name) : 'Ready to spin'}</span>
        </div>
        ${state.pro ? proCardMarkup(state.pro) : ''}
        <div class="action-row">
          <button id="spin-btn" ${state.pro || state.spinning ? 'disabled' : ''}>SPIN</button>
          <button id="reroll-btn" class="ghost" ${state.pro && state.rerollsLeft > 0 ? '' : 'disabled'}>
            Re-spin (${state.rerollsLeft} left)
          </button>
        </div>
      </section>
    `;

    rootEl.querySelector('#back-btn').addEventListener('click', () => onBack && onBack());
    rootEl.querySelector('#spin-btn').addEventListener('click', () => doSpin(false));
    rootEl.querySelector('#reroll-btn').addEventListener('click', () => doSpin(true));
    rootEl.querySelectorAll('[data-assign]').forEach((btn) => {
      btn.addEventListener('click', () => assign(btn.getAttribute('data-assign')));
    });
  }

  function landOn(pro) {
    state.pro = pro;
    state.spinning = false;
    renderSpin();
  }

  function doSpin(isReroll) {
    if (state.spinning) return;
    if (isReroll) {
      if (state.rerollsLeft <= 0 || !state.pro) return;
      state.rerollsLeft -= 1;
      // A re-spun pro is gone for good so a daily seed cannot loop back to it.
      state.usedIds.push(state.pro.id);
      state.spinIndex += 1;
      state.pro = null;
    }
    const target = spinPlayer(seed, state.spinIndex, state.usedIds);
    state.usedIds = [...state.usedIds, target.id].filter((id, i, arr) => arr.indexOf(id) === i);
    state.spinning = true;

    if (animationMs <= 0) {
      landOn(target);
      return;
    }

    renderSpin();
    const reelName = rootEl.querySelector('#reel-name');
    const reel = rootEl.querySelector('#reel');
    reel.classList.add('spinning');
    const started = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - started >= animationMs) {
        clearInterval(timer);
        landOn(target);
        return;
      }
      reelName.textContent = NBA_PLAYERS[Math.floor(Math.random() * NBA_PLAYERS.length)].name;
    }, 70);
  }

  function assign(key) {
    if (!state.pro) return;
    try {
      state.draft = assignSlot(state.draft, key, state.pro);
    } catch {
      return;
    }
    state.pro = null;
    state.spinIndex += 1;
    if (isDraftComplete(state.draft)) renderFinish();
    else renderSpin();
  }

  function renderFinish() {
    const attrs = draftAttributes(state.draft);
    const overall = draftOverall(state.draft);
    const archetype = archetypeFor(attrs);
    const tier = tierOf(overall);
    rootEl.innerHTML = `
      <section class="spin-screen finish">
        <div class="screen-head"><span class="chip">${daily ? 'DAILY · ' : ''}Build complete</span></div>
        <div class="overall-badge tier-${tier.id}">
          <span class="overall-num">${overall}</span>
          <span class="overall-label">OVR · ${tier.label}</span>
        </div>
        <div class="slot-grid">${ATTRIBUTE_KEYS.map(slotMarkup).join('')}</div>
        <form id="finish-form" class="card">
          <label>Player name
            <input name="name" type="text" maxlength="24" placeholder="The GOAT" />
          </label>
          <label>Position
            <select name="position">
              ${POSITIONS.map((p) => `<option value="${p}" ${p === DEFAULT_POSITION[archetype] ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
          </label>
          <button type="submit">Start Career</button>
        </form>
      </section>
    `;

    rootEl.querySelector('#finish-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const player = buildPlayerFromDraft(state.draft, {
        name: form.elements['name'].value,
        position: form.elements['position'].value,
      });
      if (daily) saveDailyResult('build', dailyKey(), { overall, name: player.name });
      onComplete({ player, draft: state.draft, overall, daily, seed });
    });
  }

  renderSpin();
}
