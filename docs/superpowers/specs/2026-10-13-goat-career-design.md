# GOAT Career — Design Spec

Date: 2026-10-13
Status: Approved for planning

## Overview

A browser-based basketball game combining a real-time 3D arcade game (inspired
by 82-0.com and the "Sunset Circuit" three.js reference for graphics quality)
with a player-career creator and season/career simulation engine (inspired by
goat-lab.app). The player creates a custom basketball player, plays selected
games live in 3D, auto-sims the rest of an 82-game season, and progresses
that player across multiple seasons — tracking stats, awards, and the chase
for an 82-0 perfect season.

This is the first sub-project in a larger plan. Other sports (soccer, NFL,
etc.) are explicitly out of scope here and will be designed as separate,
later sub-projects that reuse this engine's career/sim foundation.

## Goals

- A real-time, playable 3D basketball game: full 5v5 on court, the user
  controls their created player, AI controls the other 9.
- A create-a-player flow with two modes:
  - **Normal (default):** capped point-buy budget — like 2K's MyPlayer,
    the player starts as a realistic prospect, strong in a few areas, not
    universally elite.
  - **Legend (opt-in):** no cap — every attribute can be maxed, for
    sandbox/fun play. Clearly labeled as non-default at creation time.
- A season/career simulation engine: 82-game schedule, auto-simmed box
  scores for games not played live, win/loss tracking, the 82-0
  perfect-season tracker, multi-season progression (attribute growth/decline
  by age and performance), awards (MVP/All-Star thresholds), retirement.
- A career dashboard: player card, season stats, career totals, game log,
  standings.
- Deployed as a static site: GitHub repo `goat-career`, built with Vite,
  deployed to Vercel.

## Non-Goals

- Other sports (soccer, NFL, etc.) — deferred to future sub-projects.
- Full physics-based simulation, realistic AI for all 10 players, or
  tactical play-calling — explicitly rejected as unbuildable-well in scope
  (see Approach discussion below).
- Multiplayer / online play.
- User accounts or server-side persistence — v1 uses browser `localStorage`
  only.

## Architecture

- **Stack:** Vanilla JS + three.js, built/served with Vite. No backend;
  fully static client-side site.
- **Persistence:** Browser `localStorage` holds the current player, career
  history, and season state as JSON. No accounts.
- **Repo layout:**
  - `src/engine/` — three.js scene, render loop, input/controls, AI state
    machine for non-user players, collision/scoring detection, camera.
  - `src/sim/` — pure, non-rendering logic: schedule generation, box-score
    simulation, progression/regression math, awards checks. Independently
    unit-testable.
  - `src/ui/` — create-a-player flow, career dashboard, in-game HUD/overlay
    (scoreboard, clock).
  - `src/data/` — schemas/types for Player, Team, Season, Game, CareerState.
  - `public/` — any models/textures/audio assets.
  - `docs/superpowers/specs/` — design specs (this file and future ones).

## Approach Decision (recorded for context)

Three approaches were considered for the core gameplay engine:

1. Full physics-based 5v5 simulation with complete AI for all players —
   rejected: effectively months of dedicated game-dev work; too high risk
   of producing something broken/unfun within this project's realistic
   scope.
2. **Real-time 3D arcade basketball, user controls one player, AI controls
   the rest (chosen).** Full 5v5 visually on court, decent real-time 3D
   production values, user-controlled gameplay, buildable and testable.
3. Fully stat-simulated games with 3D highlight playback instead of live
   control — rejected: user explicitly wants to play selected games
   themselves, not only watch simulated highlights.

## Core Modules

### 1. Create-a-Player
- Inputs: name, position (PG/SG/SF/PF/C), archetype preset (e.g.
  Sharpshooter, Slasher, Lockdown Defender) that biases starting attribute
  allocation, and a point-buy allocation across: shooting, speed, dunking,
  defense, passing, rebounding.
- **Normal mode:** total allocatable points capped below the sum of all
  max values, so the player cannot start maxed across every attribute.
- **Legend mode:** cap removed; any/all attributes can be set to max.
  Selecting this mode is an explicit, clearly-labeled toggle at creation.

### 2. 3D Arcade Game Engine
- three.js scene: basketball court, hoop with a collision-trigger volume
  for scoring (no full ball physics required — simplified trajectory +
  trigger check is sufficient).
- 10 player meshes on court (5v5): one is user-controlled (move, shoot,
  pass, steal/block via keyboard, with touch controls as a stretch goal
  matching the "touch controls" pattern seen in the Sunset Circuit
  reference), the other 9 run a simple AI state machine (chase ball /
  defend assigned opponent / take an open shot when favorable).
- HUD: scoreboard, game clock, possession indicator.
- Follow camera, matching the reference site's "decent real-time 3D
  production values" bar (not photorealistic, but clean and readable).

### 3. Season/Career Sim Engine (pure logic, in `src/sim/`)
- Schedule generation: 82-game season against generated opponent teams.
- Box-score simulation for games not played live: each team gets a
  composite rating derived from player attributes; game outcome combines
  that rating with weighted randomness (better teams favored, upsets
  possible); final score and per-player stat lines (points, rebounds,
  assists, etc.) are distributed according to role/attributes.
- Win/loss record tracking and the 82-0 perfect-season tracker (breaks on
  first loss, with a clear in-UI indicator of the chase).
- Offseason processing: attribute progression/regression based on age and
  that season's performance; awards checks against stat thresholds
  (MVP/All-Star); retirement decision based on age/performance cutoffs.
- Multi-season career history retained in the persisted career state.

### 4. Career Dashboard (UI)
- Player card (current attributes, archetype, age).
- Current season stats and game log.
- Career totals and awards history.
- League standings (generated opponent teams' records).

## Data Flow

1. Create player (normal or legend mode) → stored in career state.
2. Generate 82-game season schedule.
3. For each game: user chooses **Play** (loads the 3D engine with the
   user's team vs. that game's opponent) or **Sim** (instant box-score
   result from the sim engine).
4. Game result updates win/loss record, 82-0 tracker, and career stats.
5. Repeat through all 82 games.
6. Offseason: run progression/regression, awards checks, retirement
   check.
7. Start next season, or end career and show a career summary if
   retired.

## Error Handling

- Create-a-player form validation: in normal mode, block submission if the
  point-buy budget is exceeded; legend mode skips this check.
- `localStorage` missing/corrupted: detect and fall back to starting a
  fresh career rather than crashing, with a visible notice to the user.
- AI state machine: include failsafe timers/state resets so an AI player
  cannot get permanently stuck (e.g., stuck against a wall or in an
  unreachable state).
- Sim engine: guard against edge cases in schedule/box-score generation
  (e.g., rounding so stat totals stay internally consistent).

## Testing

- **Sim engine (`src/sim/`):** unit tests with Vitest covering schedule
  generation, box-score simulation distributions, progression/regression
  math, and awards threshold checks. This logic is pure and deterministic
  enough (aside from seeded randomness) to test without rendering.
- **3D engine:** verified via manual playtesting through the Vite dev
  server — confirm the core loop (move, shoot, score, AI behavior,
  scoreboard updates) actually works before considering any task done.

## Deployment

- GitHub repository: `goat-career` (owner: cburdick28's GitHub account,
  already authenticated via `gh`).
- Vite production build deployed to Vercel as a static site.
- Vercel authentication/project linking to be completed at deploy time
  (not yet confirmed as logged in).

### Tooling note: no system git available

This is a school-managed Mac with no admin rights, so Xcode Command Line
Tools (which provides the system `git` binary) cannot be installed.
Confirmed working alternative: **isomorphic-git**, a pure-JavaScript git
implementation with no native/compiled dependencies, run via Node
(available locally through Volta, a user-space installer). Verified
locally that `init`/`add`/`commit` work; push-to-GitHub (via
`isomorphic-git/http/node` using the `gh`-issued token for auth) will be
exercised for real at the deployment step. All local version control and
GitHub pushes for this project go through isomorphic-git scripts rather
than a `git` CLI invocation.

## Future Work (explicitly deferred)

- Additional sports (soccer/"futty", NFL football, and potentially others)
  as new game modes layered on the same create-a-player and season/career
  sim architecture. Each will get its own short design pass before
  implementation, rather than being speced upfront here.
- Possible stretch goals not committed to in v1: touch controls, sound
  design, more detailed play-calling, online multiplayer.
