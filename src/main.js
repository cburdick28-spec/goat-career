import './style.css';
import { loadCareer, saveCareer } from './persistence/storage.js';
import { getDailyResult } from './persistence/daily.js';
import { renderCreatePlayerScreen, buildCareerFromPlayer } from './ui/createPlayer.js';
import { renderGameChoice } from './ui/gameChoice.js';
import { renderDashboard } from './ui/dashboard.js';
import { renderHome, renderDailyDone } from './ui/home.js';
import { renderSpinDraft } from './ui/spinDraft.js';
import { renderDreamTeam } from './ui/dreamTeam.js';
import { buildBuildShareText, buildDreamShareText, shareText } from './ui/share.js';
import { escapeHtml } from './ui/html.js';
import { dailySeed, dailyKey } from './data/draft.js';
import { advanceSeason } from './sim/seasonFlow.js';

const app = document.getElementById('app');
const STORAGE_KEY = 'goat-career:v1';

function savedCareer() {
  const { state } = loadCareer();
  return state;
}

function confirmReplaceCareer() {
  if (!savedCareer()) return true;
  if (typeof window.confirm !== 'function') return true;
  return window.confirm('Starting a new career replaces your saved one. Continue?');
}

function showHome(notice) {
  const career = savedCareer();
  const careerSummary = career
    ? `${escapeHtml(career.player.name)} · Season ${career.season.year} · ${career.season.record.wins}-${career.season.record.losses}`
    : '';

  renderHome(app, { hasCareer: !!career && !career.retired, careerSummary }, {
    onContinue: () => showDashboard(savedCareer()),
    onBuild: () => startBuild({ daily: false }),
    onDream: () => startDream({ daily: false }),
    onDailyBuild: () => startBuild({ daily: true }),
    onDailyDream: () => startDream({ daily: true }),
    onCustom: () => startCustom(),
  });

  if (notice) {
    const el = document.createElement('div');
    el.className = 'notice';
    el.textContent = notice;
    app.appendChild(el);
  }
}

function startBuild({ daily }) {
  if (daily) {
    const played = getDailyResult('build', dailyKey());
    if (played) {
      renderDailyDone(
        app,
        {
          title: "Today's Daily Build",
          lines: [`${escapeHtml(played.name)} — ${played.overall} OVR`],
          shareMessage: buildBuildShareText({ name: played.name, overall: played.overall }),
        },
        () => showHome(),
        shareText
      );
      return;
    }
  }
  if (!confirmReplaceCareer()) return;

  renderSpinDraft(
    app,
    { seed: daily ? dailySeed() : Date.now(), daily },
    ({ player }) => {
      const careerState = buildCareerFromPlayer(player, daily ? dailySeed() : Date.now());
      saveCareer(careerState);
      showDashboard(careerState);
    },
    () => showHome()
  );
}

function startDream({ daily }) {
  if (daily) {
    const played = getDailyResult('dream', dailyKey());
    if (played) {
      const names = played.names || [];
      renderDailyDone(
        app,
        {
          title: "Today's Daily Dream Team",
          lines: [`${played.wins}-${played.losses}${played.perfect ? ' — PERFECT SEASON' : ''}`, names.map(escapeHtml).join(' · ')],
          shareMessage: buildDreamShareText({
            wins: played.wins,
            losses: played.losses,
            perfect: !!played.perfect,
            names,
            rating: played.rating ?? '',
          }),
        },
        () => showHome(),
        shareText
      );
      return;
    }
  }

  renderDreamTeam(
    app,
    { seed: daily ? dailySeed() : Date.now(), daily },
    ({ again }) => (again ? startDream({ daily: false }) : showHome()),
    () => showHome()
  );
}

function startCustom() {
  if (!confirmReplaceCareer()) return;
  renderCreatePlayerScreen(app, (careerState) => showDashboard(careerState));
}

function showCareerSummary(careerState) {
  const container = document.createElement('div');
  const totalWins = careerState.careerHistory.reduce((sum, s) => sum + s.record.wins, 0);
  const totalLosses = careerState.careerHistory.reduce((sum, s) => sum + s.record.losses, 0);
  const mvps = careerState.careerHistory.filter((s) => s.awards?.mvp).length;
  const allStars = careerState.careerHistory.filter((s) => s.awards?.allStar).length;

  container.innerHTML = `
    <section class="card">
      <h2>${escapeHtml(careerState.player.name)}'s Career Is Complete</h2>
      <p>${careerState.careerHistory.length} seasons — ${totalWins}-${totalLosses}</p>
      <p>${mvps} MVP award(s), ${allStars} All-Star selection(s)</p>
      <ul>${careerState.careerHistory
        .map((s) => `<li>Season ${s.year}: ${s.record.wins}-${s.record.losses}</li>`)
        .join('')}</ul>
      <div class="action-row">
        <button id="share-career-btn">Share</button>
        <button id="new-career-btn" class="ghost">Back to Home</button>
      </div>
      <p class="share-note" id="share-note" hidden></p>
    </section>
  `;
  app.innerHTML = '';
  app.appendChild(container);

  const overall = Math.round(
    Object.values(careerState.player.attributes).reduce((a, b) => a + b, 0) / Object.values(careerState.player.attributes).length
  );
  container.querySelector('#share-career-btn').addEventListener('click', async () => {
    const outcome = await shareText(
      buildBuildShareText({ name: careerState.player.name, overall, record: `${totalWins}-${totalLosses}`, seasons: careerState.careerHistory.length })
    );
    const note = container.querySelector('#share-note');
    note.hidden = false;
    note.textContent = outcome === 'copied' ? 'Copied to clipboard!' : outcome === 'shared' ? 'Shared!' : 'Could not share from this browser.';
  });
  container.querySelector('#new-career-btn').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    showHome();
  });
}

function showDashboard(careerState) {
  if (careerState.retired) {
    showCareerSummary(careerState);
    return;
  }

  const container = document.createElement('div');
  renderDashboard(container, careerState);

  const nextBtn = document.createElement('button');
  nextBtn.id = 'next-game-btn';
  nextBtn.textContent = 'Next Game';
  container.appendChild(nextBtn);

  const homeBtn = document.createElement('button');
  homeBtn.id = 'home-btn';
  homeBtn.className = 'ghost';
  homeBtn.textContent = 'Home';
  container.appendChild(homeBtn);

  app.innerHTML = '';
  app.appendChild(container);

  nextBtn.addEventListener('click', () => showGameChoice(careerState));
  homeBtn.addEventListener('click', () => showHome());
}

function showGameChoice(careerState) {
  renderGameChoice(app, careerState, (gameResult) => {
    const nextState = advanceSeason(careerState, gameResult);
    saveCareer(nextState);
    showDashboard(nextState);
  });
}

function boot() {
  const { corrupted } = loadCareer();
  showHome(
    corrupted
      ? "Your saved career couldn't be loaded, so you're starting fresh. (Your browser's saved data for this game was missing or unreadable.)"
      : undefined
  );
}

boot();
