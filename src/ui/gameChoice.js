import { simulateGame } from '../sim/boxscore.js';
import { runLiveGame } from '../engine/gameLoop.js';
import { createRng } from '../sim/rng.js';

export function renderGameChoice(rootEl, careerState, onResult) {
  const { team, season } = careerState;
  const gameIndex = season.completedGames.length;
  const scheduledGame = season.schedule[gameIndex];
  const opponentTeam = season.leagueTeams.find((t) => t.id === scheduledGame.opponentTeamId);

  rootEl.innerHTML = `
    <section id="game-choice" class="card">
      <h2>Game ${gameIndex + 1} of 82 vs ${opponentTeam.name}</h2>
      <button id="play-btn">Play</button>
      <button id="sim-btn">Sim</button>
      <canvas id="game-canvas" width="800" height="450" style="display:none;"></canvas>
    </section>
  `;

  rootEl.querySelector('#sim-btn').addEventListener('click', () => {
    const rng = createRng(Date.now() % 100000);
    const result = simulateGame(team, opponentTeam, rng);
    onResult(result);
  });

  rootEl.querySelector('#play-btn').addEventListener('click', () => {
    const canvas = rootEl.querySelector('#game-canvas');
    canvas.style.display = 'block';
    rootEl.querySelector('#play-btn').disabled = true;
    rootEl.querySelector('#sim-btn').disabled = true;
    runLiveGame(canvas, team, opponentTeam).then(onResult);
  });
}
