import './style.css';
import { loadCareer, saveCareer } from './persistence/storage.js';
import { renderCreatePlayerScreen } from './ui/createPlayer.js';
import { renderGameChoice } from './ui/gameChoice.js';
import { renderDashboard } from './ui/dashboard.js';
import { advanceSeason } from './sim/seasonFlow.js';

const app = document.getElementById('app');

function startNewCareer() {
  localStorage.removeItem('goat-career:v1');
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
      <h2>${careerState.player.name}'s Career Is Complete</h2>
      <p>${careerState.careerHistory.length} seasons — ${totalWins}-${totalLosses}</p>
      <p>${mvps} MVP award(s), ${allStars} All-Star selection(s)</p>
      <ul>${careerState.careerHistory
        .map((s) => `<li>Season ${s.year}: ${s.record.wins}-${s.record.losses}</li>`)
        .join('')}</ul>
      <button id="new-career-btn">Start New Career</button>
    </section>
  `;
  app.innerHTML = '';
  app.appendChild(container);
  container.querySelector('#new-career-btn').addEventListener('click', startNewCareer);
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

  app.innerHTML = '';
  app.appendChild(container);

  nextBtn.addEventListener('click', () => showGameChoice(careerState));
}

function showGameChoice(careerState) {
  renderGameChoice(app, careerState, (gameResult) => {
    const nextState = advanceSeason(careerState, gameResult);
    saveCareer(nextState);
    showDashboard(nextState);
  });
}

function showCorruptedNotice() {
  const notice = document.createElement('div');
  notice.className = 'notice';
  notice.innerHTML = `
    <p>Your saved career couldn't be loaded, so a fresh one is starting below. (Your browser's saved data for this game was missing or unreadable.)</p>
  `;
  app.appendChild(notice);
}

function boot() {
  const { state, fresh, corrupted } = loadCareer();
  if (fresh || !state) {
    renderCreatePlayerScreen(app, (careerState) => showDashboard(careerState));
    if (corrupted) showCorruptedNotice();
  } else {
    showDashboard(state);
  }
}

boot();
