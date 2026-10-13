import { loadCareer, saveCareer } from './persistence/storage.js';
import { renderCreatePlayerScreen } from './ui/createPlayer.js';
import { renderGameChoice } from './ui/gameChoice.js';
import { renderDashboard } from './ui/dashboard.js';
import { advanceSeason } from './sim/seasonFlow.js';

const app = document.getElementById('app');

function showDashboard(careerState) {
  const container = document.createElement('div');
  renderDashboard(container, careerState);

  const nextBtn = document.createElement('button');
  nextBtn.id = 'next-game-btn';
  nextBtn.textContent = careerState.retired ? 'Career Complete' : 'Next Game';
  nextBtn.disabled = careerState.retired;
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

function boot() {
  const { state, fresh } = loadCareer();
  if (fresh || !state) {
    renderCreatePlayerScreen(app, (careerState) => showDashboard(careerState));
  } else {
    showDashboard(state);
  }
}

boot();
