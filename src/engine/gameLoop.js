import * as THREE from 'three';
import { createScene, getHoopBounds, COURT_WIDTH, COURT_LENGTH } from './scene.js';
import { mapKeysToAction } from './controls.js';
import { decideAiAction, SHOT_OPENNESS_THRESHOLD } from './ai.js';
import { checkScoringTrigger, isAiStuck } from './collision.js';
import { createGameClock, tickClock, isExpired } from './clock.js';

const GAME_DURATION_SECONDS = 120;
const PLAYER_SPEED = 5;
const STUCK_HISTORY_LENGTH = 90;
const STEAL_RANGE = 1.5;

function emptyBoxLine(playerId) {
  return { playerId, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 };
}

export function runLiveGame(canvas, userTeam, opponentTeam) {
  return new Promise((resolve) => {
    const { scene, camera, renderer } = createScene(canvas);
    const homeBounds = getHoopBounds('home');
    const awayBounds = getHoopBounds('away');

    const entities = [];
    function spawnTeam(team, side, isUserTeam) {
      team.players.forEach((player, i) => {
        const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.2, 4, 8), new THREE.MeshStandardMaterial({ color: isUserTeam ? 0x2266ff : 0xdd2222 }));
        const startZ = side === 'home' ? -COURT_LENGTH / 4 : COURT_LENGTH / 4;
        mesh.position.set((i - 2) * 2, 0.6, startZ);
        scene.add(mesh);
        entities.push({
          id: player.id,
          player,
          team,
          mesh,
          isUser: isUserTeam && i === 0,
          attackingBounds: side === 'home' ? awayBounds : homeBounds,
          defendingBounds: side === 'home' ? homeBounds : awayBounds,
          history: [],
        });
      });
    }
    spawnTeam(userTeam, 'home', true);
    spawnTeam(opponentTeam, 'away', false);

    const ball = {
      mesh: new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshStandardMaterial({ color: 0xff8800 })),
      position: new THREE.Vector3(0, 1, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      holderId: entities[0].id,
      inFlight: false,
      shooterId: null,
      shotTeamId: null,
    };
    scene.add(ball.mesh);

    const scores = { [userTeam.id]: 0, [opponentTeam.id]: 0 };
    const boxLines = Object.fromEntries(entities.map((e) => [e.id, emptyBoxLine(e.id)]));

    const pressedKeys = new Set();
    const onKeyDown = (e) => pressedKeys.add(e.key.toLowerCase());
    const onKeyUp = (e) => pressedKeys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let clock = createGameClock(GAME_DURATION_SECONDS);
    let lastTime = performance.now();

    function entityById(id) {
      return entities.find((e) => e.id === id);
    }

    function holderTeamId() {
      const holder = entityById(ball.holderId);
      return holder ? holder.team.id : ball.shotTeamId;
    }

    function shoot(entity) {
      const target = entity.attackingBounds.center;
      const dir = new THREE.Vector3(target.x - entity.mesh.position.x, 0, target.z - entity.mesh.position.z);
      const distance = dir.length();
      dir.normalize();
      ball.shooterId = entity.id;
      ball.shotTeamId = entity.team.id;
      ball.holderId = null;
      ball.inFlight = true;
      ball.velocity.set(dir.x * 4, Math.max(4, distance * 0.3), dir.z * 4);
    }

    function resolveMiss() {
      // simplified rebound: nearest player to the hoop recovers the ball
      let nearest = entities[0];
      let nearestDist = Infinity;
      for (const e of entities) {
        const d = e.mesh.position.distanceTo(new THREE.Vector3(ball.position.x, 0.6, ball.position.z));
        if (d < nearestDist) {
          nearestDist = d;
          nearest = e;
        }
      }
      boxLines[nearest.id].rebounds += 1;
      ball.holderId = nearest.id;
      ball.inFlight = false;
      ball.velocity.set(0, 0, 0);
    }

    function step(delta) {
      clock = tickClock(clock, delta);

      // user control
      const userEntity = entities.find((e) => e.isUser);
      const action = mapKeysToAction(pressedKeys);
      userEntity.mesh.position.x += action.move.x * PLAYER_SPEED * delta;
      userEntity.mesh.position.z += action.move.z * PLAYER_SPEED * delta;

      if (ball.holderId === userEntity.id) {
        ball.position.set(userEntity.mesh.position.x, 1, userEntity.mesh.position.z);
        if (action.shoot) shoot(userEntity);
      } else if (!ball.inFlight) {
        const holder = entityById(ball.holderId);
        if (action.steal && holder && holder.team.id !== userEntity.team.id) {
          const dist = userEntity.mesh.position.distanceTo(holder.mesh.position);
          if (dist <= STEAL_RANGE) {
            boxLines[userEntity.id].steals += 1;
            ball.holderId = userEntity.id;
          }
        }
      }

      // AI
      for (const entity of entities) {
        if (entity.isUser) continue;
        const gameState = {
          possessionTeamId: holderTeamId(),
          ballHolderId: ball.holderId,
          aiPlayerId: entity.id,
          distanceToBall: entity.mesh.position.distanceTo(ball.position),
          openness: 0.7,
        };
        const decision = decideAiAction(entity, gameState);

        let targetPos;
        if (decision === 'DEFEND') {
          targetPos = entity.defendingBounds.center;
        } else if (decision === 'SEEK_OPEN_SHOT') {
          targetPos = entity.mesh.position;
          if (ball.holderId === entity.id) shoot(entity);
        } else {
          targetPos = ball.position;
        }

        const dir = new THREE.Vector3(targetPos.x - entity.mesh.position.x, 0, targetPos.z - entity.mesh.position.z);
        if (dir.length() > 0.1) {
          dir.normalize();
          entity.mesh.position.x += dir.x * PLAYER_SPEED * delta;
          entity.mesh.position.z += dir.z * PLAYER_SPEED * delta;
        }

        if (ball.holderId === entity.id) {
          ball.position.set(entity.mesh.position.x, 1, entity.mesh.position.z);
        }

        entity.history.push({ x: entity.mesh.position.x, z: entity.mesh.position.z });
        if (entity.history.length > STUCK_HISTORY_LENGTH) entity.history.shift();
        if (isAiStuck(entity.history)) {
          // failsafe: nudge the AI toward center court to break the stall
          entity.mesh.position.x += (Math.random() - 0.5) * 2;
          entity.mesh.position.z += (Math.random() - 0.5) * 2;
          entity.history = [];
        }
      }

      // ball physics
      if (ball.inFlight) {
        ball.velocity.y -= 9.8 * delta;
        ball.position.addScaledVector(ball.velocity, delta);

        const scored = checkScoringTrigger(ball.position, ball.velocity, homeBounds) || checkScoringTrigger(ball.position, ball.velocity, awayBounds);
        if (scored) {
          scores[ball.shotTeamId] += 2;
          boxLines[ball.shooterId].points += 2;
          ball.inFlight = false;
          ball.holderId = entities.find((e) => e.team.id !== ball.shotTeamId).id;
          ball.velocity.set(0, 0, 0);
        } else if (ball.position.y <= 0) {
          resolveMiss();
        }
      }
      ball.mesh.position.copy(ball.position);

      // follow camera
      camera.position.set(userEntity.mesh.position.x, 10, userEntity.mesh.position.z + 15);
      camera.lookAt(userEntity.mesh.position.x, 0, userEntity.mesh.position.z);

      renderer.render(scene, camera);
    }

    function finish() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      const winnerId = scores[userTeam.id] >= scores[opponentTeam.id] ? userTeam.id : opponentTeam.id;
      resolve({
        teamAScore: scores[userTeam.id],
        teamBScore: scores[opponentTeam.id],
        winnerId,
        boxScore: {
          [userTeam.id]: userTeam.players.map((p) => boxLines[p.id]),
          [opponentTeam.id]: opponentTeam.players.map((p) => boxLines[p.id]),
        },
      });
    }

    function frame(now) {
      const delta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      step(delta);
      if (isExpired(clock)) {
        finish();
        return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

export { SHOT_OPENNESS_THRESHOLD };
