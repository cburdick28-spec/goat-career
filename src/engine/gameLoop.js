import * as THREE from 'three';
import { createScene, getHoopBounds, COURT_WIDTH, COURT_LENGTH } from './scene.js';
import { mapKeysToAction } from './controls.js';
import { decideAiAction, computeOpenness, findPassTarget } from './ai.js';
import { checkScoringTrigger, isAiStuck } from './collision.js';
import { createGameClock, tickClock, isExpired } from './clock.js';
import { computeFlightTime, computeShotVelocity } from './shooting.js';

const GAME_DURATION_SECONDS = 120;
const OVERTIME_SECONDS = 20;
const PLAYER_SPEED = 5;
const STEAL_RANGE = 1.5;
const SHOT_SUCCESS_BASE = 0.35;
const SHOT_SUCCESS_SHOOTING_SCALE = 0.5;
const SHOT_MISS_OFFSET_RADIUS = 2.5;

function emptyBoxLine(playerId) {
  return { playerId, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 };
}

function shotSuccessChance(shootingAttr, nearestDefenderDist) {
  const base = Math.min(0.9, Math.max(0.15, SHOT_SUCCESS_BASE + (shootingAttr / 99) * SHOT_SUCCESS_SHOOTING_SCALE));
  const pressure = nearestDefenderDist < 1.5 ? 0.25 : 0; // being closely guarded costs accuracy
  return Math.max(0.1, base - pressure);
}

export function runLiveGame(canvas, userTeam, opponentTeam) {
  return new Promise((resolve) => {
    const { scene, camera, renderer } = createScene(canvas);
    const homeBounds = getHoopBounds('home');
    const awayBounds = getHoopBounds('away');

    const hud = document.createElement('div');
    hud.className = 'game-hud';
    canvas.parentElement.insertBefore(hud, canvas);

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
      position: new THREE.Vector3(0, 1.5, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      holderId: entities[0].id,
      inFlight: false,
      shooterId: null,
      shotTeamId: null,
    };
    const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshStandardMaterial({ color: 0xff8800 }));
    scene.add(ballMesh);

    const scores = { [userTeam.id]: 0, [opponentTeam.id]: 0 };
    const boxLines = Object.fromEntries(entities.map((e) => [e.id, emptyBoxLine(e.id)]));

    const pressedKeys = new Set();
    const onKeyDown = (e) => {
      pressedKeys.add(e.key.toLowerCase());
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) e.preventDefault();
    };
    const onKeyUp = (e) => pressedKeys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let clock = createGameClock(GAME_DURATION_SECONDS);
    let elapsed = 0;
    let lastTime = performance.now();

    function entityById(id) {
      return entities.find((e) => e.id === id);
    }

    function holderTeamId() {
      const holder = entityById(ball.holderId);
      return holder ? holder.team.id : ball.shotTeamId;
    }

    function nearestDefenderDistance(entity) {
      const defenders = entities.filter((e) => e.team.id !== entity.team.id);
      if (defenders.length === 0) return Infinity;
      return Math.min(...defenders.map((d) => d.mesh.position.distanceTo(entity.mesh.position)));
    }

    function shoot(entity, assistPlayerId) {
      const hoopCenter = entity.attackingBounds.center;
      const fromPos = { x: entity.mesh.position.x, y: 1.5, z: entity.mesh.position.z };
      const defenderDist = nearestDefenderDistance(entity);
      const success = Math.random() < shotSuccessChance(entity.player.attributes.shooting, defenderDist);
      const target = success
        ? hoopCenter
        : {
            x: hoopCenter.x + (Math.random() - 0.5) * SHOT_MISS_OFFSET_RADIUS,
            y: hoopCenter.y,
            z: hoopCenter.z + (Math.random() - 0.5) * SHOT_MISS_OFFSET_RADIUS,
          };
      const flightTime = computeFlightTime(fromPos, target);
      const velocity = computeShotVelocity(fromPos, target, flightTime);

      ball.shooterId = entity.id;
      ball.shotTeamId = entity.team.id;
      ball.assistId = assistPlayerId ?? null;
      ball.holderId = null;
      ball.inFlight = true;
      ball.position.set(fromPos.x, fromPos.y, fromPos.z);
      ball.velocity.set(velocity.x, velocity.y, velocity.z);
    }

    function pass(fromEntity) {
      const teammates = entities
        .filter((e) => e.team.id === fromEntity.team.id)
        .map((e) => ({ id: e.id, x: e.mesh.position.x, z: e.mesh.position.z }));
      const targetId = findPassTarget(fromEntity.id, teammates);
      if (targetId) {
        boxLines[fromEntity.id].assists += 0; // assist only credited if the pass leads directly to a made shot (see shoot())
        ball.holderId = targetId;
        ball.pendingAssistId = fromEntity.id;
      }
    }

    function resolveMiss() {
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
      elapsed += delta;

      const userEntity = entities.find((e) => e.isUser);
      const action = mapKeysToAction(pressedKeys);
      userEntity.mesh.position.x += action.move.x * PLAYER_SPEED * delta;
      userEntity.mesh.position.z += action.move.z * PLAYER_SPEED * delta;
      clampToCourt(userEntity.mesh.position);

      if (ball.holderId === userEntity.id) {
        ball.position.set(userEntity.mesh.position.x, 1.5, userEntity.mesh.position.z);
        if (action.shoot) shoot(userEntity, ball.pendingAssistId);
        else if (action.pass) pass(userEntity);
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

      // AI: each defender is assigned a specific opponent (by roster index)
      // instead of every defender converging on one spot.
      for (const entity of entities) {
        if (entity.isUser) continue;
        const opponents = entities.filter((e) => e.team.id !== entity.team.id);
        const myIndex = entities.filter((e) => e.team.id === entity.team.id).indexOf(entity);
        const assignedOpponent = opponents[myIndex % opponents.length];

        const defenderPositions = opponents
          .filter((o) => o.team.id !== entity.team.id)
          .map((o) => ({ x: o.mesh.position.x, z: o.mesh.position.z }));
        const openness = computeOpenness({ x: entity.mesh.position.x, z: entity.mesh.position.z }, defenderPositions);

        const gameState = {
          possessionTeamId: holderTeamId(),
          ballHolderId: ball.holderId,
          aiPlayerId: entity.id,
          distanceToBall: entity.mesh.position.distanceTo(ball.position),
          openness,
        };
        const decision = decideAiAction(entity, gameState);

        let targetPos;
        if (decision === 'DEFEND') {
          targetPos = assignedOpponent.mesh.position;
        } else if (decision === 'SEEK_OPEN_SHOT') {
          targetPos = entity.mesh.position;
          if (ball.holderId === entity.id) shoot(entity, ball.pendingAssistId);
        } else {
          targetPos = ball.position;
          // occasional steal attempt when close to an opposing ball handler
          const holder = entityById(ball.holderId);
          if (holder && holder.team.id !== entity.team.id) {
            const dist = entity.mesh.position.distanceTo(holder.mesh.position);
            if (dist <= STEAL_RANGE && Math.random() < 0.01) {
              boxLines[entity.id].steals += 1;
              ball.holderId = entity.id;
            }
          }
        }

        const dir = new THREE.Vector3(targetPos.x - entity.mesh.position.x, 0, targetPos.z - entity.mesh.position.z);
        if (dir.length() > 0.1) {
          dir.normalize();
          entity.mesh.position.x += dir.x * PLAYER_SPEED * delta;
          entity.mesh.position.z += dir.z * PLAYER_SPEED * delta;
          clampToCourt(entity.mesh.position);
        }

        if (ball.holderId === entity.id) {
          ball.position.set(entity.mesh.position.x, 1.5, entity.mesh.position.z);
        }

        entity.history.push({ x: entity.mesh.position.x, z: entity.mesh.position.z, t: elapsed });
        if (entity.history.length > 300) entity.history.shift();
        if (isAiStuck(entity.history)) {
          entity.mesh.position.x += (Math.random() - 0.5) * 2;
          entity.mesh.position.z += (Math.random() - 0.5) * 2;
          clampToCourt(entity.mesh.position);
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
          if (ball.assistId && ball.assistId !== ball.shooterId) boxLines[ball.assistId].assists += 1;
          ball.assistId = null;
          ball.pendingAssistId = null;
          ball.inFlight = false;
          ball.holderId = entities.find((e) => e.team.id !== ball.shotTeamId).id;
          ball.velocity.set(0, 0, 0);
        } else if (ball.position.y <= 0) {
          ball.pendingAssistId = null;
          resolveMiss();
        }
      }
      ballMesh.position.copy(ball.position);

      camera.position.set(userEntity.mesh.position.x, 10, userEntity.mesh.position.z + 15);
      camera.lookAt(userEntity.mesh.position.x, 0, userEntity.mesh.position.z);

      renderer.render(scene, camera);
      renderHud();
    }

    function clampToCourt(position) {
      position.x = Math.max(-COURT_WIDTH / 2 + 0.5, Math.min(COURT_WIDTH / 2 - 0.5, position.x));
      position.z = Math.max(-COURT_LENGTH / 2 + 0.5, Math.min(COURT_LENGTH / 2 - 0.5, position.z));
    }

    function renderHud() {
      const possession = entityById(ball.holderId);
      hud.textContent =
        `${userTeam.name} ${scores[userTeam.id]} — ${scores[opponentTeam.id]} ${opponentTeam.name}` +
        ` | ${Math.ceil(clock.remaining)}s` +
        (possession ? ` | Ball: ${possession.team.id === userTeam.id ? userTeam.name : opponentTeam.name}` : '');
    }

    function cleanup() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      hud.remove();
      renderer.dispose();
    }

    function finish() {
      cleanup();
      const winnerId = scores[userTeam.id] > scores[opponentTeam.id] ? userTeam.id : opponentTeam.id;
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
        // Tied games go to overtime instead of auto-awarding the win to
        // the user (final-review fix: `>=` previously handed every tie
        // to the user, so a scoreless game always "won").
        if (scores[userTeam.id] === scores[opponentTeam.id]) {
          clock = createGameClock(OVERTIME_SECONDS);
        } else {
          finish();
          return;
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}
