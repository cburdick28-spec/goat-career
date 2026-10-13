import { POSITIONS, tierOf, dreamPack, dailyKey } from '../data/draft.js';
import { ATTRIBUTE_KEYS } from '../data/player.js';
import { dreamTeamRating, simulateDreamSeason, DREAM_SEASON_LENGTH } from '../sim/dreamSeason.js';
import { saveDailyResult } from '../persistence/daily.js';
import { buildDreamShareText, shareText } from './share.js';
import { escapeHtml, capitalize } from './html.js';

export function verdictFor(result) {
  if (result.perfect) return '82-0. A perfect season. You beat the algorithm.';
  if (result.wins >= 75) return `So close. First loss came in game ${result.firstLoss}.`;
  if (result.wins >= 65) return 'Dominant season. A true contender.';
  if (result.wins >= 50) return 'Solid playoff team. Draft smarter for 82-0.';
  return 'Rebuilding year. Run it back.';
}

function strengths(pro) {
  return ATTRIBUTE_KEYS.map((k) => [k, pro.attrs[k]])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
}

// Dream Team: draft one all-time player per position from a pack of four,
// then sim 82 games and see whether the lineup can go undefeated.
export function renderDreamTeam(rootEl, options, onDone, onBack) {
  const { seed = Date.now(), daily = false, animationMs = 1600 } = options || {};
  const state = { step: 0, picks: [] };

  function lineupMarkup() {
    return `
      <div class="lineup">
        ${POSITIONS.map((pos, i) => {
          const pick = state.picks[i];
          const active = i === state.step;
          return `<div class="lineup-slot ${pick ? 'filled tier-' + tierOf(pick.ovr).id : ''} ${active ? 'active' : ''}">
            <span class="lineup-pos">${pos}</span>
            <span class="lineup-name">${pick ? escapeHtml(pick.name.split(' ').slice(-1)[0]) : '?'}</span>
          </div>`;
        }).join('')}
      </div>`;
  }

  function renderPack() {
    const position = POSITIONS[state.step];
    const pack = dreamPack(seed, state.step, position, state.picks.map((p) => p.id));
    rootEl.innerHTML = `
      <section class="dream-screen">
        <div class="screen-head">
          <button class="link-btn" id="back-btn">‹ Home</button>
          <span class="chip">${daily ? 'DAILY · ' : ''}Pick ${state.step + 1}/5</span>
        </div>
        ${lineupMarkup()}
        <h2 class="pack-title">Choose your ${position}</h2>
        <div class="pack">
          ${pack
            .map((pro) => {
              const tier = tierOf(pro.ovr);
              return `<button class="pack-card tier-${tier.id}" data-pick="${pro.id}">
                <span class="tier-badge tier-${tier.id}">${tier.label}</span>
                <span class="pack-ovr">${pro.ovr}</span>
                <span class="pack-name">${escapeHtml(pro.name)}</span>
                <span class="pack-pos">${pro.pos.join(' / ')}</span>
                <span class="pack-strengths">${strengths(pro)
                  .map(([k, v]) => `${capitalize(k)} ${v}`)
                  .join(' · ')}</span>
              </button>`;
            })
            .join('')}
        </div>
      </section>
    `;
    rootEl.querySelector('#back-btn').addEventListener('click', () => onBack && onBack());
    rootEl.querySelectorAll('[data-pick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pro = pack.find((p) => p.id === btn.getAttribute('data-pick'));
        state.picks.push(pro);
        state.step += 1;
        if (state.step >= POSITIONS.length) renderReady();
        else renderPack();
      });
    });
  }

  function renderReady() {
    const rating = dreamTeamRating(state.picks);
    rootEl.innerHTML = `
      <section class="dream-screen">
        <div class="screen-head"><span class="chip">${daily ? 'DAILY · ' : ''}Lineup locked</span></div>
        ${lineupMarkup()}
        <div class="overall-badge tier-${tierOf(Math.round(rating)).id}">
          <span class="overall-num">${rating}</span>
          <span class="overall-label">Team rating</span>
        </div>
        <ul class="roster">
          ${state.picks
            .map((p, i) => `<li><span class="roster-pos">${POSITIONS[i]}</span> ${escapeHtml(p.name)} <span class="roster-ovr">${p.ovr}</span></li>`)
            .join('')}
        </ul>
        <button id="sim-btn" class="big-btn">Sim 82 Games</button>
      </section>
    `;
    rootEl.querySelector('#sim-btn').addEventListener('click', () => runSeason(rating));
  }

  function runSeason(rating) {
    const result = simulateDreamSeason(rating, seed * 13 + 5);
    if (animationMs <= 0) {
      renderResult(rating, result);
      return;
    }
    rootEl.innerHTML = `
      <section class="dream-screen">
        ${lineupMarkup()}
        <div class="record-live"><span id="live-record">0-0</span><span class="record-sub">Simulating…</span></div>
      </section>
    `;
    const recordEl = rootEl.querySelector('#live-record');
    const started = Date.now();
    const timer = setInterval(() => {
      const progress = Math.min(1, (Date.now() - started) / animationMs);
      const played = Math.floor(progress * DREAM_SEASON_LENGTH);
      const wins = result.games.slice(0, played).filter((g) => g.won).length;
      recordEl.textContent = `${wins}-${played - wins}`;
      if (progress >= 1) {
        clearInterval(timer);
        renderResult(rating, result);
      }
    }, 50);
  }

  function renderResult(rating, result) {
    const names = state.picks.map((p) => p.name);
    if (daily) {
      saveDailyResult('dream', dailyKey(), { wins: result.wins, losses: result.losses, perfect: result.perfect, names, rating });
    }
    rootEl.innerHTML = `
      <section class="dream-screen result ${result.perfect ? 'perfect' : ''}">
        <div class="record-live final">
          <span class="record-big" id="final-record">${result.wins}-${result.losses}</span>
          <span class="record-sub">${escapeHtml(verdictFor(result))}</span>
        </div>
        <div class="game-strip" aria-label="Game by game results">
          ${result.games.map((g) => `<span class="dot ${g.won ? 'w' : 'l'}"></span>`).join('')}
        </div>
        <ul class="roster">
          ${state.picks
            .map((p, i) => `<li><span class="roster-pos">${POSITIONS[i]}</span> ${escapeHtml(p.name)} <span class="roster-ovr">${p.ovr}</span></li>`)
            .join('')}
        </ul>
        <p class="team-rating">Team rating ${rating}</p>
        <div class="action-row">
          <button id="share-btn">Share result</button>
          ${daily ? '' : '<button id="again-btn" class="ghost">Draft again</button>'}
          <button id="home-btn" class="ghost">Home</button>
        </div>
        <p class="share-note" id="share-note" hidden></p>
      </section>
    `;
    const text = buildDreamShareText({ wins: result.wins, losses: result.losses, perfect: result.perfect, names, rating });
    const note = rootEl.querySelector('#share-note');
    rootEl.querySelector('#share-btn').addEventListener('click', async () => {
      const outcome = await shareText(text);
      note.hidden = false;
      note.textContent =
        outcome === 'copied' ? 'Copied to clipboard!' : outcome === 'shared' ? 'Shared!' : 'Could not share from this browser.';
    });
    const again = rootEl.querySelector('#again-btn');
    if (again) again.addEventListener('click', () => onDone && onDone({ again: true }));
    rootEl.querySelector('#home-btn').addEventListener('click', () => onDone && onDone({ again: false }));
  }

  renderPack();
}
