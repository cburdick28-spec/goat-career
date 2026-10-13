# GOAT Career Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a browser basketball game: create-a-player, a real-time 3D arcade basketball engine (user controls one player, AI the rest), and a season/career simulation engine with an 82-0 perfect-season tracker — shipped to GitHub (`goat-career`) and Vercel.

**Architecture:** A single static client-side app (Vite + three.js, no backend). Pure, deterministic game logic (player/team models, schedule, box-score sim, progression, awards, retirement) lives in files with no rendering or DOM dependency and is unit-tested with Vitest. The 3D engine and UI wire that logic to the screen and are verified by manual playtesting through the Vite dev server. Career state persists to `localStorage`.

**Tech Stack:** Vite, vanilla JS (ES modules), three.js, Vitest, Node (via Volta) + isomorphic-git for version control (no system `git`/Xcode CLT available), `gh` CLI for GitHub repo creation, Vercel for static hosting.

**Spec:** `docs/superpowers/specs/2026-10-13-goat-career-design.md`

## Global Constraints

- No system `git` / Xcode Command Line Tools available (school Mac, no admin rights). All version control goes through `scripts/vcs.mjs` (isomorphic-git), never a `git` CLI call.
- No backend, no accounts. Persistence is browser `localStorage` only.
- Attribute scale: `ATTRIBUTE_MIN = 25`, `ATTRIBUTE_MAX = 99` for every player attribute.
- Normal-mode create-a-player budget: `NORMAL_MODE_BUDGET = 360` total points across the 6 attributes (shooting, speed, dunking, defense, passing, rebounding), each still individually capped at `ATTRIBUTE_MAX`. Legend mode removes the total-budget cap; the per-attribute `ATTRIBUTE_MAX` of 99 still applies.
- Season length: 82 games, matching the 82-0 concept exactly.
- 3D engine and UI wiring are validated by manual playtesting via `npm run dev`, not automated tests, per the spec's Testing section. Pure logic modules (`src/sim/*`, `src/data/*`, `src/persistence/*`) get Vitest unit tests.

## Review Focus

- **`localStorage.setItem` throws (private browsing, quota exceeded) during a save, not just missing/corrupted data on read** — a reasonable person expects the app not to crash and to keep playing in-memory. Test added to Task 7.
- **Create-a-player normal-mode boundary: an allocation using exactly `NORMAL_MODE_BUDGET` points must be accepted, one point over must be rejected** — off-by-one here silently breaks the "realistic prospect" guarantee. Test added to Task 2.
- **Box-score per-player stats must be non-negative integers that sum exactly to the simulated team total** — rounding bugs here produce box scores that don't add up, which is immediately visible and breaks trust in the sim. Test added to Task 5.
- **An AI player can get stuck (stale position) during a live game with no recovery** — without a failsafe this silently hangs the user's play session. Test added to Task 12.
- **Forced retirement at the hard age cutoff must fire even if the player's most recent season was excellent** — a reasonable person expects an age-42 player to retire regardless of a hot season; reward logic for good performance must not be allowed to override it. Test added to Task 6.

---

## Task 1: Project Scaffold, Git Tooling & GitHub Repo

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `.gitignore`, `scripts/vcs.mjs`, `README.md`

**Interfaces:**
- Produces: `node scripts/vcs.mjs init`, `node scripts/vcs.mjs add <path...>`, `node scripts/vcs.mjs commit -m "<message>"`, `node scripts/vcs.mjs push`, `node scripts/vcs.mjs log` — the version-control interface every later task's "Commit" step uses instead of a `git` CLI.

- [ ] **Step 1: Create `package.json`**

Dependencies: `three`. Dev dependencies: `vite`, `vitest`, `isomorphic-git`. Scripts: `"dev": "vite"`, `"build": "vite build"`, `"test": "vitest run"`.

- [ ] **Step 2: Create `vite.config.js` and `index.html`**

Minimal Vite vanilla-JS setup; `index.html` has a single `#app` root div and loads `src/main.js` as a module. `src/main.js` can just be a placeholder `console.log('GOAT Career')` for now — later tasks fill it in.

- [ ] **Step 3: Create `.gitignore`**

Ignore `node_modules/`, `dist/`, `.DS_Store`.

- [ ] **Step 4: Write `scripts/vcs.mjs`**

A small Node CLI wrapping `isomorphic-git` (using Node's built-in `fs`, not a browser filesystem shim) with subcommands `init`, `add <paths...>`, `commit -m <message>`, `push`, `log`. For `push`, get the GitHub auth token at runtime via `execSync('gh auth token')` (never hardcode or write it to a file) and use it as the HTTP Basic auth password (any non-empty username) via `isomorphic-git/http/node`. Remote URL: `https://github.com/cburdick28/goat-career.git`, remote name `origin`, branch `main`.

- [ ] **Step 5: Verify local git operations work**

Run: `node scripts/vcs.mjs init && node scripts/vcs.mjs add . && node scripts/vcs.mjs commit -m "Initial scaffold"`
Expected: no errors.
Run: `node scripts/vcs.mjs log`
Expected: prints 1 log entry.

- [ ] **Step 6: Create the GitHub repository**

Run: `gh repo create goat-career --public --description "Real-time 3D arcade basketball + career sim" --disable-wiki`
Expected: repo created at `github.com/cburdick28/goat-career`. (No local git needed for this step — `gh repo create` alone talks to the GitHub API.)

- [ ] **Step 7: Push the initial commit**

Run: `node scripts/vcs.mjs push`
Expected: no errors.
Run: `gh api repos/cburdick28/goat-career/commits --jq 'length'`
Expected: `1`

- [ ] **Step 8: Copy the design spec and this plan into the repo, write README, commit**

Copy `docs/superpowers/specs/2026-10-13-goat-career-design.md` and this plan file into the new repo's `docs/superpowers/` tree (they were authored in this same directory already — confirm they're present, don't duplicate). Write a short `README.md`: what the project is, `npm install`, `npm run dev`, `npm test`, `npm run build`.

```bash
node scripts/vcs.mjs add README.md docs
node scripts/vcs.mjs commit -m "docs: add README"
node scripts/vcs.mjs push
```

---

## Task 2: Player & Attribute Data Model

**Files:**
- Create: `src/data/player.js`
- Test: `tests/data/player.test.js`

**Interfaces:**
- Produces: `ATTRIBUTE_MIN`, `ATTRIBUTE_MAX`, `NORMAL_MODE_BUDGET` constants; `ATTRIBUTE_KEYS = ['shooting','speed','dunking','defense','passing','rebounding']`; `ARCHETYPES` object keyed by `'SHARPSHOOTER' | 'SLASHER' | 'LOCKDOWN_DEFENDER' | 'PLAYMAKER' | 'REBOUNDER'`, each value a default attribute allocation object; `createPlayer({ name, position, archetype, attributes, mode }) -> Player` where `mode` is `'normal' | 'legend'`, throwing `Error('BUDGET_EXCEEDED')` in normal mode if the sum of `attributes` exceeds `NORMAL_MODE_BUDGET`, and clamping every attribute to `[ATTRIBUTE_MIN, ATTRIBUTE_MAX]` in both modes. `Player` shape: `{ id, name, position, archetype, age: 19, attributes: {shooting, speed, dunking, defense, passing, rebounding} }`.

- [ ] **Step 1: Write failing tests**

```js
test('normal mode rejects allocation exceeding the budget', () => {
  const over = { shooting: 99, speed: 99, dunking: 99, defense: 99, passing: 99, rebounding: 1 }; // sums to 496 > 360
  expect(() => createPlayer({ name: 'A', position: 'PG', archetype: 'PLAYMAKER', attributes: over, mode: 'normal' }))
    .toThrow('BUDGET_EXCEEDED');
});

test('normal mode accepts an allocation using exactly the budget', () => {
  const exact = { shooting: 60, speed: 60, dunking: 60, defense: 60, passing: 60, rebounding: 60 }; // sums to 360
  const player = createPlayer({ name: 'A', position: 'PG', archetype: 'PLAYMAKER', attributes: exact, mode: 'normal' });
  expect(player.attributes).toEqual(exact);
});

test('legend mode allows every attribute at ATTRIBUTE_MAX', () => {
  const maxed = Object.fromEntries(ATTRIBUTE_KEYS.map(k => [k, ATTRIBUTE_MAX]));
  const player = createPlayer({ name: 'A', position: 'C', archetype: 'REBOUNDER', attributes: maxed, mode: 'legend' });
  expect(player.attributes).toEqual(maxed);
});

test('attributes are clamped to [ATTRIBUTE_MIN, ATTRIBUTE_MAX] in both modes', () => {
  const outOfRange = { shooting: 10, speed: 150, dunking: 50, defense: 50, passing: 50, rebounding: 50 };
  const player = createPlayer({ name: 'A', position: 'SF', archetype: 'SLASHER', attributes: outOfRange, mode: 'legend' });
  expect(player.attributes.shooting).toBe(ATTRIBUTE_MIN);
  expect(player.attributes.speed).toBe(ATTRIBUTE_MAX);
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- tests/data/player.test.js`
Expected: FAIL (`createPlayer` not defined).

- [ ] **Step 3: Implement `src/data/player.js`**

Implement the constants, `ARCHETYPES` (5 named presets, each a default attribute object implementers choose reasonable values for, biased toward that archetype's namesake stats), and `createPlayer` per the Interfaces block above. Clamp before budget-checking.

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test -- tests/data/player.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
node scripts/vcs.mjs add src/data/player.js tests/data/player.test.js
node scripts/vcs.mjs commit -m "feat: player data model with normal/legend create-a-player"
node scripts/vcs.mjs push
```

---

## Task 3: RNG, Team & Roster Generation

**Files:**
- Create: `src/sim/rng.js`, `src/data/team.js`
- Test: `tests/sim/rng.test.js`, `tests/data/team.test.js`

**Interfaces:**
- Consumes: `createPlayer`, `ATTRIBUTE_KEYS`, `ATTRIBUTE_MIN`, `ATTRIBUTE_MAX` from `src/data/player.js` (Task 2).
- Produces: `createRng(seed: number) -> () => number` (returns floats in `[0,1)`, deterministic for a given seed). `generateOpponentTeam(seed: number) -> Team`, `computeTeamRating(team: Team) -> number`, `assembleUserTeam(player: Player, seed: number) -> Team`. `Team` shape: `{ id, name, players: Player[] }` (exactly 5 players per team).

- [ ] **Step 1: Write failing RNG test**

```js
test('createRng is deterministic for a given seed', () => {
  const a = createRng(42); const b = createRng(42);
  const seqA = [a(), a(), a()]; const seqB = [b(), b(), b()];
  expect(seqA).toEqual(seqB);
  seqA.forEach(n => { expect(n).toBeGreaterThanOrEqual(0); expect(n).toBeLessThan(1); });
});
```

- [ ] **Step 2: Run, verify fail; implement `src/sim/rng.js`; run, verify pass**

Implement a small seeded PRNG (e.g. mulberry32). Run: `npm test -- tests/sim/rng.test.js` before (FAIL) and after (PASS).

- [ ] **Step 3: Write failing team tests**

```js
test('generateOpponentTeam produces exactly 5 players with valid attributes', () => {
  const team = generateOpponentTeam(1);
  expect(team.players).toHaveLength(5);
  team.players.forEach(p => ATTRIBUTE_KEYS.forEach(k =>
    expect(p.attributes[k]).toBeGreaterThanOrEqual(ATTRIBUTE_MIN)));
});

test('generateOpponentTeam is deterministic for a given seed', () => {
  expect(generateOpponentTeam(7)).toEqual(generateOpponentTeam(7));
});

test('computeTeamRating averages all players attributes', () => {
  // construct a team of 5 players each with every attribute = 50
  const team = { id: 't', name: 'Test', players: Array.from({length:5}, () => ({ attributes: Object.fromEntries(ATTRIBUTE_KEYS.map(k=>[k,50])) })) };
  expect(computeTeamRating(team)).toBe(50);
});

test('assembleUserTeam includes the given player plus 4 generated teammates', () => {
  const player = createPlayer({ name:'Me', position:'PG', archetype:'PLAYMAKER', attributes:{shooting:60,speed:60,dunking:60,defense:60,passing:60,rebounding:60}, mode:'normal' });
  const team = assembleUserTeam(player, 3);
  expect(team.players).toHaveLength(5);
  expect(team.players).toContainEqual(player);
});
```

- [ ] **Step 4: Run, verify fail**

Run: `npm test -- tests/data/team.test.js`

- [ ] **Step 5: Implement `src/data/team.js`**

`generateOpponentTeam(seed)` uses `createRng(seed)` to roll random valid attributes (within `[ATTRIBUTE_MIN, ATTRIBUTE_MAX]`) for 5 generated players via `createPlayer(..., mode: 'legend')` (no budget cap needed for generated players — just clamp). `computeTeamRating` = mean over all players of the mean of that player's 6 attributes. `assembleUserTeam` = `{ id, name: "Your Team", players: [player, ...4 generated via generateOpponentTeam(seed).players.slice(0,4)] }`.

- [ ] **Step 6: Run, verify pass**

- [ ] **Step 7: Commit**

```bash
node scripts/vcs.mjs add src/sim/rng.js src/data/team.js tests/sim/rng.test.js tests/data/team.test.js
node scripts/vcs.mjs commit -m "feat: seeded RNG and team/roster generation"
node scripts/vcs.mjs push
```

---

## Task 4: Season Schedule Generation

**Files:**
- Create: `src/sim/schedule.js`
- Test: `tests/sim/schedule.test.js`

**Interfaces:**
- Consumes: `createRng` (Task 3), `generateOpponentTeam` (Task 3).
- Produces: `LEAGUE_SIZE = 15` (other teams, plus the user's team = 16 total), `generateSeason(userTeam: Team, seed: number) -> { year: number, leagueTeams: Team[], schedule: Game[] }` where `schedule.length === 82` and each `Game = { id, opponentTeamId, played: false }`.

- [ ] **Step 1: Write failing tests**

```js
test('generateSeason produces exactly 82 games', () => {
  const season = generateSeason(userTeam, 11);
  expect(season.schedule).toHaveLength(82);
});

test('generateSeason produces LEAGUE_SIZE opponent teams, all distinct ids', () => {
  const season = generateSeason(userTeam, 11);
  expect(season.leagueTeams).toHaveLength(LEAGUE_SIZE);
  expect(new Set(season.leagueTeams.map(t => t.id)).size).toBe(LEAGUE_SIZE);
});

test('every scheduled game references a real opponent team id', () => {
  const season = generateSeason(userTeam, 11);
  const ids = new Set(season.leagueTeams.map(t => t.id));
  season.schedule.forEach(g => expect(ids.has(g.opponentTeamId)).toBe(true));
});

test('generateSeason is deterministic for a given seed', () => {
  expect(generateSeason(userTeam, 5)).toEqual(generateSeason(userTeam, 5));
});
```

- [ ] **Step 2: Run, verify fail**

- [ ] **Step 3: Implement `src/sim/schedule.js`**

Generate `LEAGUE_SIZE` opponent teams with `generateOpponentTeam(seed + i)`. Build the 82-game schedule by drawing an opponent team id uniformly at random (via the seeded RNG) for each of the 82 slots — repeats across the season are expected and fine, matching how a real NBA schedule repeats opponents.

- [ ] **Step 4: Run, verify pass**

- [ ] **Step 5: Commit**

```bash
node scripts/vcs.mjs add src/sim/schedule.js tests/sim/schedule.test.js
node scripts/vcs.mjs commit -m "feat: 82-game season schedule generation"
node scripts/vcs.mjs push
```

---

## Task 5: Box Score Simulation

**Files:**
- Create: `src/sim/boxscore.js`
- Test: `tests/sim/boxscore.test.js`

**Interfaces:**
- Consumes: `computeTeamRating` (Task 3), `createRng` (Task 3).
- Produces: `simulateGame(teamA: Team, teamB: Team, rng: () => number) -> GameResult` where `GameResult = { teamAScore, teamBScore, winnerId, boxScore: { [teamId]: PlayerBoxScore[] } }` and `PlayerBoxScore = { playerId, points, rebounds, assists, steals, blocks }` (all non-negative integers).

- [ ] **Step 1: Write failing tests**

Fixtures for all tests below: `const teamA = generateOpponentTeam(1); const teamB = generateOpponentTeam(2);` (from Task 3's `src/data/team.js`).

```js
test('simulateGame is deterministic for a given rng sequence', () => {
  const rngA = createRng(9); const rngB = createRng(9);
  expect(simulateGame(teamA, teamB, rngA)).toEqual(simulateGame(teamA, teamB, rngB));
});

test('winnerId has the higher score and matches the team with the higher final score', () => {
  const result = simulateGame(teamA, teamB, createRng(9));
  const winnerScore = result.winnerId === teamA.id ? result.teamAScore : result.teamBScore;
  const loserScore = result.winnerId === teamA.id ? result.teamBScore : result.teamAScore;
  expect(winnerScore).toBeGreaterThan(loserScore);
});

test('a much higher-rated team wins the large majority of simulated games', () => {
  const strong = { id: 's', name: 'Strong', players: Array.from({length:5}, (_,i) => ({ id:`s${i}`, attributes: Object.fromEntries(ATTRIBUTE_KEYS.map(k=>[k,90])) })) };
  const weak = { id: 'w', name: 'Weak', players: Array.from({length:5}, (_,i) => ({ id:`w${i}`, attributes: Object.fromEntries(ATTRIBUTE_KEYS.map(k=>[k,30])) })) };
  let strongWins = 0;
  for (let i = 0; i < 200; i++) if (simulateGame(strong, weak, createRng(i)).winnerId === 's') strongWins++;
  expect(strongWins).toBeGreaterThan(160); // > 80% of 200
});

test('per-player points are non-negative integers summing to the team score', () => {
  const result = simulateGame(teamA, teamB, createRng(9));
  const aPoints = result.boxScore[teamA.id].map(p => p.points);
  aPoints.forEach(p => { expect(Number.isInteger(p)).toBe(true); expect(p).toBeGreaterThanOrEqual(0); });
  expect(aPoints.reduce((a,b) => a+b, 0)).toBe(result.teamAScore);
});

test('per-player rebounds/assists/steals/blocks are non-negative integers and sum to a team total', () => {
  const result = simulateGame(teamA, teamB, createRng(9));
  ['rebounds','assists','steals','blocks'].forEach(stat => {
    const values = result.boxScore[teamA.id].map(p => p[stat]);
    values.forEach(v => { expect(Number.isInteger(v)).toBe(true); expect(v).toBeGreaterThanOrEqual(0); });
  });
});
```

- [ ] **Step 2: Run, verify fail**

- [ ] **Step 3: Implement `src/sim/boxscore.js`**

```
RATING_SCALE = 15
pWinA = 1 / (1 + 10 ** (-(ratingA - ratingB) / RATING_SCALE))
winner = rng() < pWinA ? teamA : teamB
margin = clamp(round(rng() * 10 + Math.abs(ratingA - ratingB) / 5), 1, 40)
winnerScore = 95 + round(rng() * 15)
loserScore = max(60, winnerScore - margin)
TEAM_STAT_BASES = { rebounds: 40, assists: 24, steals: 7, blocks: 4 }  // + round(rng() * variance) per team, variance = {10,8,4,3}
```

Distribute each team total across its 5 players by weighted shares, then fix the rounding remainder on the top-weighted player so player stats always sum exactly to the team total:
- points weight per player = `shooting*0.5 + dunking*0.3 + passing*0.2`
- rebounds weight = `rebounding`
- assists weight = `passing`
- steals weight = `defense*0.6 + speed*0.4`
- blocks weight = `defense*0.4 + dunking*0.2 + rebounding*0.4`

Normalize each weight set to shares summing to 1, multiply by the team total, round each, then add/subtract the rounding remainder from the highest-weighted player so the integers sum exactly to the team total.

- [ ] **Step 4: Run, verify pass**

- [ ] **Step 5: Commit**

```bash
node scripts/vcs.mjs add src/sim/boxscore.js tests/sim/boxscore.test.js
node scripts/vcs.mjs commit -m "feat: box score simulation engine"
node scripts/vcs.mjs push
```

---

## Task 6: Offseason — Progression, Awards, Retirement

**Files:**
- Create: `src/sim/progression.js`, `src/sim/awards.js`, `src/sim/retirement.js`
- Test: `tests/sim/progression.test.js`, `tests/sim/awards.test.js`, `tests/sim/retirement.test.js`

**Interfaces:**
- Consumes: `Player`, `ATTRIBUTE_MIN`, `ATTRIBUTE_MAX`, `ATTRIBUTE_KEYS` (Task 2); `PlayerBoxScore` shape (Task 5).
- Produces:
  - `applyProgression(player: Player, seasonBoxScores: PlayerBoxScore[]) -> Player` (new object, `age` incremented by 1, attributes adjusted and clamped to `[ATTRIBUTE_MIN, ATTRIBUTE_MAX]`).
  - `checkAwards(seasonBoxScores: PlayerBoxScore[], teamWinRate: number) -> { allStar: boolean, mvp: boolean }`.
  - `shouldRetire(player: Player, seasonBoxScores: PlayerBoxScore[]) -> boolean`.

- [ ] **Step 1: Write failing progression tests**

```js
test('a young player (age <= 26) with strong performance improves', () => {
  const player = { age: 22, attributes: Object.fromEntries(ATTRIBUTE_KEYS.map(k=>[k,50])) };
  const strongSeason = [{ points: 28, rebounds: 8, assists: 6, steals: 2, blocks: 1 }];
  const next = applyProgression(player, strongSeason);
  expect(next.age).toBe(23);
  const totalBefore = Object.values(player.attributes).reduce((a,b)=>a+b,0);
  const totalAfter = Object.values(next.attributes).reduce((a,b)=>a+b,0);
  expect(totalAfter).toBeGreaterThan(totalBefore);
});

test('a veteran (age >= 32) declines even with a decent season', () => {
  const player = { age: 34, attributes: Object.fromEntries(ATTRIBUTE_KEYS.map(k=>[k,80])) };
  const next = applyProgression(player, [{ points: 18, rebounds: 5, assists: 4, steals: 1, blocks: 1 }]);
  const totalBefore = Object.values(player.attributes).reduce((a,b)=>a+b,0);
  const totalAfter = Object.values(next.attributes).reduce((a,b)=>a+b,0);
  expect(totalAfter).toBeLessThan(totalBefore);
});

test('attributes never exceed ATTRIBUTE_MAX or drop below ATTRIBUTE_MIN', () => {
  const player = { age: 22, attributes: Object.fromEntries(ATTRIBUTE_KEYS.map(k=>[k,ATTRIBUTE_MAX])) };
  const next = applyProgression(player, [{ points: 30, rebounds: 10, assists: 10, steals: 3, blocks: 3 }]);
  ATTRIBUTE_KEYS.forEach(k => expect(next.attributes[k]).toBeLessThanOrEqual(ATTRIBUTE_MAX));
});
```

- [ ] **Step 2: Run, verify fail; implement `src/sim/progression.js`**

```
AGE_GROWTH_PHASE_END = 26   // age <= this: can improve
AGE_PEAK_PHASE_END = 31     // age <= this: plateau
                            // age > 31: decline
PERFORMANCE_THRESHOLD_PPG = 18  // avg points/game at/above this counts as "strong"
```
Per-attribute delta, based on average points/game across `seasonBoxScores`:
- age ≤ 26: delta = strong ? randomInt(2,4) : randomInt(0,2)
- 27 ≤ age ≤ 31: delta = randomInt(-1,1)
- age ≥ 32: delta = strong ? randomInt(-2,-1) : randomInt(-5,-2)

Clamp each resulting attribute to `[ATTRIBUTE_MIN, ATTRIBUTE_MAX]`.

- [ ] **Step 3: Run, verify pass**

- [ ] **Step 4: Write failing awards tests**

```js
test('checkAwards grants All-Star for 20+ ppg even with a losing team', () => {
  const season = Array.from({length: 10}, () => ({ points: 22, rebounds: 4, assists: 3, steals: 1, blocks: 0 }));
  expect(checkAwards(season, 0.3).allStar).toBe(true);
});

test('checkAwards grants MVP only when both scoring and team win rate thresholds are met', () => {
  const season = Array.from({length: 10}, () => ({ points: 29, rebounds: 6, assists: 5, steals: 1, blocks: 0 }));
  expect(checkAwards(season, 0.7).mvp).toBe(true);
  expect(checkAwards(season, 0.4).mvp).toBe(false);
});
```

- [ ] **Step 5: Run, verify fail; implement `src/sim/awards.js`**

```
ALL_STAR_PPG = 20, ALL_STAR_RPG = 10, ALL_STAR_APG = 8
MVP_PPG = 27, MVP_WIN_RATE = 0.65
```
`allStar` = any one average threshold met; `mvp` = avg points ≥ `MVP_PPG` AND `teamWinRate` ≥ `MVP_WIN_RATE`.

- [ ] **Step 6: Run, verify pass**

- [ ] **Step 7: Write failing retirement tests**

```js
test('a player below the age floor never retires regardless of performance', () => {
  const player = { age: 30, attributes: {} };
  expect(shouldRetire(player, [{ points: 2, rebounds: 1, assists: 0, steals: 0, blocks: 0 }])).toBe(false);
});

test('a player past the performance floor between the age floor and hard cutoff retires', () => {
  const player = { age: 36, attributes: {} };
  expect(shouldRetire(player, [{ points: 4, rebounds: 1, assists: 1, steals: 0, blocks: 0 }])).toBe(true);
});

test('a player at the hard age cutoff retires even coming off a strong season', () => {
  const player = { age: 42, attributes: {} };
  expect(shouldRetire(player, [{ points: 25, rebounds: 8, assists: 6, steals: 2, blocks: 1 }])).toBe(true);
});
```

- [ ] **Step 8: Run, verify fail; implement `src/sim/retirement.js`**

```
RETIREMENT_AGE_FLOOR = 34   // below this, never forced to retire by this check
RETIREMENT_AGE_FORCE = 42   // at/above this, always retires
RETIREMENT_PERFORMANCE_PPG = 8  // between floor and force age, retire if avg points below this
```
`shouldRetire`: `age >= RETIREMENT_AGE_FORCE` → true, always, regardless of performance. Else if `age >= RETIREMENT_AGE_FLOOR` → true only if average points across `seasonBoxScores` < `RETIREMENT_PERFORMANCE_PPG`. Else → false.

- [ ] **Step 9: Run, verify pass**

- [ ] **Step 10: Commit**

```bash
node scripts/vcs.mjs add src/sim/progression.js src/sim/awards.js src/sim/retirement.js tests/sim/progression.test.js tests/sim/awards.test.js tests/sim/retirement.test.js
node scripts/vcs.mjs commit -m "feat: offseason progression, awards, and retirement logic"
node scripts/vcs.mjs push
```

---

## Task 7: Career State & Persistence

**Files:**
- Create: `src/data/career.js`, `src/persistence/storage.js`
- Modify: `vite.config.js` (add `test: { environment: 'jsdom' }`), `package.json` (add `jsdom` dev dependency)
- Test: `tests/persistence/storage.test.js`

**Interfaces:**
- Consumes: `Player` (Task 2), `Team` (Task 3), season/schedule shapes (Task 4), `GameResult` (Task 5).
- Produces:
  - `createCareerState(player: Player, team: Team, season: object) -> CareerState` where `CareerState = { player, team, season: { ...season, record: { wins: 0, losses: 0 }, perfectSeasonAlive: true, completedGames: [] }, careerHistory: [], retired: false }`.
  - `saveCareer(state: CareerState) -> void` (writes JSON to `localStorage` key `"goat-career:v1"`; catches and swallows any thrown error from `localStorage.setItem` without throwing).
  - `loadCareer() -> { state: CareerState | null, fresh: boolean }` (`fresh: true` and `state: null` if nothing stored or the stored JSON fails to parse; never throws).

- [ ] **Step 1: Write failing tests**

```js
import { vi } from 'vitest';

test('saveCareer then loadCareer round-trips the same state', () => {
  const state = createCareerState(player, team, season);
  saveCareer(state);
  const { state: loaded, fresh } = loadCareer();
  expect(fresh).toBe(false);
  expect(loaded).toEqual(state);
});

test('loadCareer returns fresh:true when nothing is stored', () => {
  localStorage.clear();
  const { state, fresh } = loadCareer();
  expect(fresh).toBe(true);
  expect(state).toBeNull();
});

test('loadCareer returns fresh:true when stored data is corrupted JSON', () => {
  localStorage.setItem('goat-career:v1', '{not valid json');
  const { state, fresh } = loadCareer();
  expect(fresh).toBe(true);
  expect(state).toBeNull();
});

test('saveCareer does not throw when localStorage.setItem throws (quota/private mode)', () => {
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
  const state = createCareerState(player, team, season);
  expect(() => saveCareer(state)).not.toThrow();
  spy.mockRestore();
});
```

Note: these tests need a `localStorage` global — add `test: { environment: 'jsdom' }` to `vite.config.js`'s Vitest config (jsdom provides `localStorage`), and add `jsdom` as a dev dependency.

- [ ] **Step 2: Run, verify fail**

- [ ] **Step 3: Implement `src/data/career.js` and `src/persistence/storage.js`**

`saveCareer` wraps the `localStorage.setItem` call in try/catch and does nothing on failure (in-memory state in the running app is unaffected either way — this only governs whether it persists). `loadCareer` wraps `getItem`+`JSON.parse` in try/catch, returning `{ state: null, fresh: true }` on any failure or absence.

- [ ] **Step 4: Run, verify pass**

- [ ] **Step 5: Commit**

```bash
node scripts/vcs.mjs add src/data/career.js src/persistence/storage.js tests/persistence/storage.test.js vite.config.js package.json
node scripts/vcs.mjs commit -m "feat: career state and localStorage persistence"
node scripts/vcs.mjs push
```

---

## Task 8: Create-a-Player UI

**Files:**
- Create: `src/ui/createPlayer.js`
- Test: `tests/ui/createPlayer.test.js`

**Interfaces:**
- Consumes: `createPlayer`, `ARCHETYPES`, `ATTRIBUTE_KEYS`, `NORMAL_MODE_BUDGET` (Task 2); `assembleUserTeam` (Task 3); `generateSeason` (Task 4); `createCareerState`, `saveCareer` (Task 7).
- Produces: `buildCareerFromForm(formState, seed) -> CareerState` (pure — takes the already-collected form values, not DOM events) where `formState = { name, position, archetype, attributes, mode }`. `renderCreatePlayerScreen(rootEl: HTMLElement, onComplete: (CareerState) => void) -> void` (DOM wiring, manually verified, not unit-tested).

- [ ] **Step 1: Write failing test for the pure builder function**

```js
test('buildCareerFromForm creates a player, assembles a team, and generates a season', () => {
  const formState = { name: 'Test Player', position: 'SG', archetype: 'SHARPSHOOTER', attributes: {shooting:70,speed:60,dunking:50,defense:40,passing:60,rebounding:40}, mode: 'normal' };
  const careerState = buildCareerFromForm(formState, 123);
  expect(careerState.player.name).toBe('Test Player');
  expect(careerState.team.players).toHaveLength(5);
  expect(careerState.season.schedule).toHaveLength(82);
  expect(careerState.retired).toBe(false);
});
```

- [ ] **Step 2: Run, verify fail**

- [ ] **Step 3: Implement `buildCareerFromForm`**

Compose `createPlayer` → `assembleUserTeam` → `generateSeason` → `createCareerState`, in that order, using the given `seed`.

- [ ] **Step 4: Run, verify pass**

- [ ] **Step 5: Implement `renderCreatePlayerScreen` (manual verification only)**

A form with: name text input, position select, archetype select, 6 attribute sliders/number inputs (bounded `[ATTRIBUTE_MIN, ATTRIBUTE_MAX]`), a running total vs. `NORMAL_MODE_BUDGET` shown only in normal mode, and a normal/legend mode toggle clearly labeled (e.g. "Legend Mode (max every attribute)"). Submitting calls `buildCareerFromForm`, then `saveCareer`, then `onComplete(careerState)`. Disable submit in normal mode when the running total exceeds `NORMAL_MODE_BUDGET`.

- [ ] **Step 6: Manually verify**

Run `npm run dev`, open the create-a-player screen, confirm: normal mode blocks over-budget submission, legend mode allows maxing every attribute, submission produces a playable state (confirmed fully once Task 13 wires navigation).

- [ ] **Step 7: Commit**

```bash
node scripts/vcs.mjs add src/ui/createPlayer.js tests/ui/createPlayer.test.js
node scripts/vcs.mjs commit -m "feat: create-a-player UI with normal/legend modes"
node scripts/vcs.mjs push
```

---

## Task 9: Career Dashboard UI

**Files:**
- Create: `src/ui/dashboard.js`
- Test: `tests/ui/dashboard.test.js`

**Interfaces:**
- Consumes: `CareerState` shape (Task 7).
- Produces pure selectors: `computeStandings(leagueTeams: Team[], completedGames: GameResult[]) -> Array<{ teamId, wins, losses }>` sorted by wins descending; `formatGameLog(completedGames: GameResult[]) -> Array<{ gameId, opponentName, result: 'W'|'L', score: string }>`. `renderDashboard(rootEl, careerState) -> void` (DOM wiring, manual verification).

- [ ] **Step 1: Write failing tests**

```js
test('computeStandings sorts teams by wins descending', () => {
  const teams = [{id:'a'},{id:'b'},{id:'c'}];
  const games = [ /* construct GameResults so a:2-0, b:1-1, c:0-2 */ ];
  const standings = computeStandings(teams, games);
  expect(standings.map(s => s.teamId)).toEqual(['a','b','c']);
});

test('formatGameLog marks wins and losses correctly from the user team perspective', () => {
  const games = [ /* one GameResult the user's team won, one it lost */ ];
  const log = formatGameLog(games);
  expect(log[0].result).toBe('W');
  expect(log[1].result).toBe('L');
});
```

- [ ] **Step 2: Run, verify fail; implement selectors; run, verify pass**

- [ ] **Step 3: Implement `renderDashboard` (manual verification only)**

Shows: player card (name, position, archetype, age, attributes), current season record and the 82-0 perfect-season banner (visible while `perfectSeasonAlive` is true, replaced by "Perfect season ended" once it's false), game log via `formatGameLog`, standings via `computeStandings`, career totals/awards from `careerHistory`.

- [ ] **Step 4: Manually verify via `npm run dev`** (full confirmation after Task 13 wires navigation)

- [ ] **Step 5: Commit**

```bash
node scripts/vcs.mjs add src/ui/dashboard.js tests/ui/dashboard.test.js
node scripts/vcs.mjs commit -m "feat: career dashboard UI"
node scripts/vcs.mjs push
```

---

## Task 10: 3D Scene, Court & Camera

**Files:**
- Create: `src/engine/scene.js`
- Test: `tests/engine/scene.test.js`

**Interfaces:**
- Produces: `COURT_WIDTH`, `COURT_LENGTH` constants; `getHoopBounds(side: 'home' | 'away') -> { center: {x,y,z}, radius }` (pure, testable); `createScene(canvas: HTMLCanvasElement) -> { scene, camera, renderer, court, hoops }` (three.js setup, manual verification).

- [ ] **Step 1: Write failing test for the pure geometry helper**

```js
test('getHoopBounds places home and away hoops at opposite ends of the court', () => {
  const home = getHoopBounds('home');
  const away = getHoopBounds('away');
  expect(home.center.z).toBeCloseTo(-away.center.z);
  expect(home.radius).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run, verify fail; implement; run, verify pass**

Place hoops at `z = ±(COURT_LENGTH/2 - 2)`, `y` at a fixed rim height (e.g. 3 world units), radius ~0.5 world units — exact world-unit scale is the implementer's reasonable choice, kept consistent with player/court scale in `createScene`.

- [ ] **Step 3: Implement `createScene` (manual verification only)**

three.js `Scene`, `PerspectiveCamera`, `WebGLRenderer` bound to `canvas`, a court plane sized `COURT_WIDTH × COURT_LENGTH`, basic lighting (ambient + directional), two hoop meshes positioned per `getHoopBounds`, and a follow camera that trails the user's player (wired fully in Task 11-12).

- [ ] **Step 4: Manually verify**

Run `npm run dev`, confirm the court, both hoops, and lighting render without console errors.

- [ ] **Step 5: Commit**

```bash
node scripts/vcs.mjs add src/engine/scene.js tests/engine/scene.test.js
node scripts/vcs.mjs commit -m "feat: 3D court scene and hoop geometry"
node scripts/vcs.mjs push
```

---

## Task 11: Input Controls & AI State Machine

**Files:**
- Create: `src/engine/controls.js`, `src/engine/ai.js`
- Test: `tests/engine/controls.test.js`, `tests/engine/ai.test.js`

**Interfaces:**
- Produces:
  - `mapKeysToAction(pressedKeys: Set<string>) -> { move: {x, z}, shoot: boolean, pass: boolean, steal: boolean }` (pure; WASD/arrow keys for `move`, Space for `shoot`, `P` for `pass`, `S` for `steal`).
  - `decideAiAction(aiState, gameState) -> 'CHASE_BALL' | 'DEFEND' | 'SEEK_OPEN_SHOT'` (pure) where `aiState = { teamId }`, `gameState = { possessionTeamId, ballHolderId, aiPlayerId, distanceToBall, openness }`. Precedence: if `aiState.teamId !== gameState.possessionTeamId` → `'DEFEND'`. Else if `gameState.ballHolderId === gameState.aiPlayerId` and `gameState.openness > SHOT_OPENNESS_THRESHOLD` → `'SEEK_OPEN_SHOT'`. Else → `'CHASE_BALL'`.
  - `SHOT_OPENNESS_THRESHOLD = 0.6` (0-1 scale, implementer wires the actual openness calculation into the live engine in Task 12).

- [ ] **Step 1: Write failing tests**

```js
test('mapKeysToAction reads WASD as movement', () => {
  const action = mapKeysToAction(new Set(['w']));
  expect(action.move.z).toBeLessThan(0);
});

test('mapKeysToAction reads Space as shoot', () => {
  expect(mapKeysToAction(new Set([' '])).shoot).toBe(true);
});

test('decideAiAction defends when the AI is not on the possessing team', () => {
  expect(decideAiAction({ teamId: 'b' }, { possessionTeamId: 'a', ballHolderId: 'x', aiPlayerId: 'y', distanceToBall: 5, openness: 0.9 })).toBe('DEFEND');
});

test('decideAiAction seeks an open shot when holding the ball and open', () => {
  expect(decideAiAction({ teamId: 'a' }, { possessionTeamId: 'a', ballHolderId: 'y', aiPlayerId: 'y', distanceToBall: 0, openness: 0.8 })).toBe('SEEK_OPEN_SHOT');
});

test('decideAiAction chases the ball otherwise', () => {
  expect(decideAiAction({ teamId: 'a' }, { possessionTeamId: 'a', ballHolderId: 'x', aiPlayerId: 'y', distanceToBall: 5, openness: 0.1 })).toBe('CHASE_BALL');
});
```

- [ ] **Step 2: Run, verify fail; implement both files; run, verify pass**

- [ ] **Step 3: Wire controls and AI into the scene (manual verification only)**

Attach a `keydown`/`keyup` listener maintaining the `pressedKeys` set, call `mapKeysToAction` each frame to move/orient the user's player mesh from Task 10's scene. Drive each of the other 9 player meshes' movement off `decideAiAction` each frame.

- [ ] **Step 4: Manually verify**

Run `npm run dev`; confirm WASD moves the user's player and the other 9 meshes visibly react (chasing/defending) without errors.

- [ ] **Step 5: Commit**

```bash
node scripts/vcs.mjs add src/engine/controls.js src/engine/ai.js tests/engine/controls.test.js tests/engine/ai.test.js
node scripts/vcs.mjs commit -m "feat: player controls and AI state machine"
node scripts/vcs.mjs push
```

---

## Task 12: Scoring, Game Clock & Live Game Loop

**Files:**
- Create: `src/engine/collision.js`, `src/engine/clock.js`, `src/engine/gameLoop.js`
- Test: `tests/engine/collision.test.js`, `tests/engine/clock.test.js`

**Interfaces:**
- Consumes: `getHoopBounds` (Task 10); `mapKeysToAction`, `decideAiAction` (Task 11); `createScene` (Task 10).
- Produces:
  - `checkScoringTrigger(ballPosition: {x,y,z}, ballVelocity: {x,y,z}, hoopBounds: {center,radius}) -> boolean`. `RIM_VERTICAL_TOLERANCE = 0.3`. True when `sqrt((bx-cx)^2+(bz-cz)^2) <= radius && Math.abs(by-cy) <= RIM_VERTICAL_TOLERANCE && ballVelocity.y < 0`.
  - `createGameClock(durationSeconds: number) -> { remaining: number }`; `tickClock(clockState, deltaSeconds: number) -> { remaining: number }` (floored at 0); `isExpired(clockState) -> boolean`.
  - `isAiStuck(recentPositions: Array<{x,z}>) -> boolean`. `STUCK_POSITION_EPSILON = 0.05`, `STUCK_SAMPLE_COUNT = 90` (~3 seconds at 30fps). True when every pair of consecutive samples in the last `STUCK_SAMPLE_COUNT` positions differs by less than `STUCK_POSITION_EPSILON` in both x and z.
  - `runLiveGame(canvas, userTeam: Team, opponentTeam: Team) -> Promise<GameResult>` (the full render loop; resolves with a `GameResult` — same shape as `simulateGame`'s — once `isExpired` is true; manual verification only).

- [ ] **Step 1: Write failing collision test**

```js
test('checkScoringTrigger is true when the ball is inside the hoop radius, near rim height, and descending', () => {
  const bounds = { center: { x: 0, y: 3, z: 10 }, radius: 0.5 };
  expect(checkScoringTrigger({ x: 0.1, y: 3.1, z: 10 }, { x: 0, y: -2, z: 0 }, bounds)).toBe(true);
});

test('checkScoringTrigger is false when the ball is rising through the same position', () => {
  const bounds = { center: { x: 0, y: 3, z: 10 }, radius: 0.5 };
  expect(checkScoringTrigger({ x: 0.1, y: 3.1, z: 10 }, { x: 0, y: 2, z: 0 }, bounds)).toBe(false);
});

test('checkScoringTrigger is false when the ball is outside the hoop radius', () => {
  const bounds = { center: { x: 0, y: 3, z: 10 }, radius: 0.5 };
  expect(checkScoringTrigger({ x: 5, y: 3.1, z: 10 }, { x: 0, y: -2, z: 0 }, bounds)).toBe(false);
});
```

- [ ] **Step 2: Run, verify fail; implement `src/engine/collision.js`'s `checkScoringTrigger`; run, verify pass**

- [ ] **Step 3: Write failing clock tests**

```js
test('tickClock reduces remaining time and floors at 0', () => {
  let clock = createGameClock(10);
  clock = tickClock(clock, 7);
  expect(clock.remaining).toBe(3);
  clock = tickClock(clock, 7);
  expect(clock.remaining).toBe(0);
});

test('isExpired is true once remaining reaches 0', () => {
  expect(isExpired(tickClock(createGameClock(5), 5))).toBe(true);
  expect(isExpired(createGameClock(5))).toBe(false);
});
```

- [ ] **Step 4: Run, verify fail; implement; run, verify pass**

- [ ] **Step 5: Write failing AI-stuck test**

```js
test('isAiStuck is true when recent positions barely moved', () => {
  const stillPositions = Array.from({length: 90}, () => ({ x: 1, z: 1 }));
  expect(isAiStuck(stillPositions)).toBe(true);
});

test('isAiStuck is false when the player is actually moving', () => {
  const movingPositions = Array.from({length: 90}, (_, i) => ({ x: i * 0.1, z: 0 }));
  expect(isAiStuck(movingPositions)).toBe(false);
});
```

- [ ] **Step 6: Run, verify fail; implement `isAiStuck` in `src/engine/collision.js` (or a shared util); run, verify pass**

- [ ] **Step 7: Implement `runLiveGame` (manual verification only)**

Render loop using `createScene`, `mapKeysToAction` for the user's player, `decideAiAction` for the other 9, `checkScoringTrigger` for scoring events (update score + HUD), `tickClock`/`isExpired` to end the game, and `isAiStuck` on each AI player's position history — when stuck, reset that AI player's target/state so it un-sticks rather than hanging the game. Builds a `GameResult`-shaped box score from in-game events as it runs.

- [ ] **Step 8: Manually verify**

Run `npm run dev`, play a full live game end to end: move, shoot, score at least one basket, confirm the clock expires and a `GameResult` is produced, and confirm no AI player visibly freezes for the whole game.

- [ ] **Step 9: Commit**

```bash
node scripts/vcs.mjs add src/engine/collision.js src/engine/clock.js src/engine/gameLoop.js tests/engine/collision.test.js tests/engine/clock.test.js
node scripts/vcs.mjs commit -m "feat: scoring collision, game clock, and live game loop"
node scripts/vcs.mjs push
```

---

## Task 13: Game Orchestration — Play/Sim Choice & Season Flow

**Files:**
- Create: `src/main.js` (replacing the Task 1 placeholder), `src/ui/gameChoice.js`, `src/sim/seasonFlow.js`
- Test: `tests/sim/seasonFlow.test.js`

**Interfaces:**
- Consumes: everything from Tasks 2-12.
- Produces: `advanceSeason(careerState: CareerState, gameResult: GameResult) -> CareerState` (pure: records the result into `season.completedGames`, updates `season.record`, flips `season.perfectSeasonAlive` to `false` permanently on the first loss, and — once `season.completedGames.length === 82` — runs `applyProgression`/`checkAwards`/`shouldRetire` from Task 6, appends a season summary to `careerHistory`, and either starts a new season via `generateSeason` or sets `retired: true`). `main.js` wires screen navigation: create-player → per-game Play/Sim choice → dashboard, persisting via `saveCareer` after every `advanceSeason` call.

- [ ] **Step 1: Write failing tests**

```js
test('advanceSeason records a win and keeps the perfect season alive', () => {
  const state = /* CareerState with 0 completed games, perfectSeasonAlive: true */;
  const winResult = /* GameResult where the user team outscored the opponent */;
  const next = advanceSeason(state, winResult);
  expect(next.season.record.wins).toBe(1);
  expect(next.season.perfectSeasonAlive).toBe(true);
});

test('advanceSeason flips perfectSeasonAlive to false on the first loss and it stays false after a later win', () => {
  let state = /* CareerState with 0 completed games, perfectSeasonAlive: true */;
  state = advanceSeason(state, /* a loss result */);
  expect(state.season.perfectSeasonAlive).toBe(false);
  state = advanceSeason(state, /* a subsequent win result */);
  expect(state.season.perfectSeasonAlive).toBe(false);
});

test('advanceSeason triggers offseason processing and starts a new season after 82 games', () => {
  let state = /* CareerState with 81 completed games already recorded */;
  const finalResult = /* a GameResult completing game 82 */;
  const next = advanceSeason(state, finalResult);
  expect(next.careerHistory).toHaveLength(1);
  expect(next.retired === true || next.season.year === state.season.year + 1).toBe(true);
  if (!next.retired) expect(next.season.completedGames).toHaveLength(0);
});
```

- [ ] **Step 2: Run, verify fail**

- [ ] **Step 3: Implement `src/sim/seasonFlow.js`**

Compose `applyProgression`, `checkAwards`, `shouldRetire` (Task 6) and `generateSeason` (Task 4) exactly per the Interfaces block above.

- [ ] **Step 4: Run, verify pass**

- [ ] **Step 5: Implement `src/ui/gameChoice.js` and `src/main.js` (manual verification only)**

Per scheduled game: a screen offering **Play** (calls `runLiveGame` from Task 12 with the user's team vs. that game's opponent team) or **Sim** (calls `simulateGame` from Task 5 directly) — either path produces a `GameResult` fed into `advanceSeason`, then `saveCareer`, then back to the dashboard (Task 9) showing the updated state and the next scheduled game. On app load, call `loadCareer()`; route to the create-a-player screen (Task 8) if `fresh`, otherwise straight to the dashboard with the loaded career in progress.

- [ ] **Step 6: Manually verify**

Run `npm run dev`: create a player, Sim through several games, confirm the record/dashboard update and state survives a page reload (loaded from `localStorage`). Play at least one live game via the 3D engine and confirm its result also advances the season correctly.

- [ ] **Step 7: Commit**

```bash
node scripts/vcs.mjs add src/main.js src/ui/gameChoice.js src/sim/seasonFlow.js tests/sim/seasonFlow.test.js
node scripts/vcs.mjs commit -m "feat: wire play/sim choice and full season flow"
node scripts/vcs.mjs push
```

---

## Task 14: Production Build & Deploy to Vercel

**Files:**
- Modify: `README.md`

**Interfaces:** None (deployment task).

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: `dist/` is produced with no errors.

- [ ] **Step 3: Deploy to Vercel**

Ask the user to confirm they're logged into Vercel (via `vercel login` or the dashboard), since this wasn't verified during planning. Then run `vercel --prod` (or link + deploy through the dashboard if the CLI isn't installed) from the project root to deploy the Vite static build.

- [ ] **Step 4: Verify the live deployment**

Open the returned Vercel URL and manually confirm: the create-a-player screen loads, a Sim'd game advances the season, and a live 3D game is playable, matching Task 13's manual verification but against the deployed build.

- [ ] **Step 5: Update README with the live URL, commit**

```bash
node scripts/vcs.mjs add README.md
node scripts/vcs.mjs commit -m "docs: add live deployment URL"
node scripts/vcs.mjs push
```
