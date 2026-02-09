# Software Architecture Document

**Project:** Party Arena Shooter (local 1–7 players)
**Stack:** TypeScript + Phaser 3 + Vite
**Primary constraint:** **Input → Simulation → Render** (keep gameplay deterministic and portable)

---

## Goals

- **Fast prototype iteration** (one arena, destructible cover, co-op endless + PvP time mode)
- **7-player local** (gamepads + optional KB/M)
- **No spectator downtime** (respawn/downs design)
- **Online-ready later** without rewriting core logic (simulation stays engine-agnostic)

## Non-goals (prototype phase)

- Online multiplayer
- Progression/unlocks
- Complex UI / multiple menus
- Procedural generation

---

## Architectural Overview

### Layering

1. **Input Layer**: device polling & mapping → `PlayerIntent[]`
2. **Simulation Layer**: pure-ish state update → `GameState`
3. **Render Layer**: Phaser objects that visualize `GameState`
4. **Audio/VFX Layer**: reacts to simulation events (not gameplay rules)

**Golden Rule:** _No gameplay decisions inside rendering._

---

## Folder Structure

```
src/
  main.ts
  game/
    config.ts
    scenes/
      BootScene.ts
      StartScene.ts
      LobbyScene.ts
      MatchScene.ts
      PauseScene.ts
      GameOverScene.ts
    render/
      RenderWorld.ts
      RenderFactories.ts
      HUD.ts
      PrevPositions.ts
    input/
      InputManager.ts
      KeyboardMouseDevice.ts
      GamepadDevice.ts
  core/
    state/
      GameState.ts
      Types.ts
      Defaults.ts
    sim/
      tick.ts
      tileCollision.ts
      systems/
        applyIntents.ts
        movement.ts
        shooting.ts
        bullets.ts
        collisions.ts
        enemies.ts
        spawns.ts
        livesRespawn.ts
        modeRules.ts
      rng/
        seedRng.ts
    events/
      EventBus.ts
      Events.ts
  tests/    (Vitest)
```

---

## Core Data Model (Engine-agnostic)

### Key Types (TypeScript interfaces)

Keep these as plain data. No Phaser types in `core/`.

```ts
// core/state/Types.ts
export type EntityId = number; // monotonic counter, not string

export type DeviceType = "kbm" | "gamepad";

export interface DeviceAssignment {
  type: DeviceType;
  gamepadIndex: number; // -1 for kbm
}

export interface Vec2 {
  x: number;
  y: number;
}

export type Mode = "coop" | "pvp_time";

export type EnemyType = "chaser" | "shooter";

export interface PlayerState {
  id: EntityId;
  slot: number; // 0..6
  pos: Vec2;
  vel: Vec2;
  aim: Vec2; // normalized, fallback if stick is neutral
  hp: number;
  alive: boolean;
  downed: boolean; // co-op "downed" state
  downedTimer: number; // ticks remaining before bleed-out
  reviveProgress: number; // ticks of revive accumulated (0 = not being revived)
  reviverId: EntityId | null; // who is reviving this player
  respawnTimer: number; // ticks
  invulnTimer: number; // ticks (cannot deal damage while > 0)
  fireCooldown: number; // ticks
  kills: number;
  deaths: number;
  team: number; // for future teams / coop (0 for now)
}

export interface BulletState {
  id: EntityId;
  ownerId: EntityId;
  pos: Vec2;
  vel: Vec2;
  ttl: number; // ticks
  damage: number;
  active: boolean; // pooling flag
  fromEnemy: boolean; // true for enemy-fired bullets
}

export interface EnemyState {
  id: EntityId;
  type: EnemyType;
  pos: Vec2;
  vel: Vec2;
  hp: number;
  active: boolean; // pooling flag
  spawnTimer: number; // ticks remaining in telegraph (0 = fully spawned)
  fireCooldown: number; // ticks (0 for chasers, active for shooters)
  knockback: number; // px, instant push on bullet hit (per-type)
  score: number; // points awarded on kill (per-type)
}

export type TileType = "empty" | "solid" | "breakable";

export interface TileCell {
  type: TileType;
  hp: number; // 0 for non-breakable; for "breakable"
}

export interface TileGrid {
  width: number;
  height: number;
  cellSize: number; // pixels
  cells: TileCell[]; // row-major
}

export interface MatchState {
  mode: Mode;
  tick: number; // tick count elapsed (not float seconds)
  sharedLives: number; // coop
  score: number; // co-op shared score
  rngSeed: number;
  rngState: number; // current RNG internal state for determinism
  nextEntityId: number; // monotonic counter for EntityId generation
  gameOver: boolean;
  spawnCount: number; // total enemies spawned (used for type selection)
}

export interface GameState {
  players: PlayerState[];
  bullets: BulletState[]; // pre-allocated pool
  enemies: EnemyState[]; // pre-allocated pool
  tiles: TileGrid;
  match: MatchState;
}
```

---

## Input Abstraction

### PlayerIntent (simulation consumes only this)

```ts
export interface PlayerIntent {
  move: Vec2; // [-1..1]
  aim: Vec2; // [-1..1]
  shoot: boolean;
  revive: boolean; // co-op
}
```

### How slots work (local-first)

- Lobby assigns **gamepad index → player slot**
- Keyboard/mouse can be a dedicated slot (e.g., slot 0) or optional
- Devices produce intents for “their” slot each tick

**Join flow (LobbyScene):**

- Show 7 slots as empty
- “Press A / South button to join”
- Capture the gamepad that pressed it → bind to next open slot
- Allow leave/unbind (press Back/Select or hold A)

---

## Simulation Loop

### Fixed timestep

- Simulation runs at **fixed dt** (e.g., `1/60`)
- Render can be variable (Phaser frame rate)
- Accumulate delta time; run sim multiple steps if needed

```ts
// core/sim/tick.ts
const DT = 1 / TICKS_PER_SECOND;

export function step(
  state: GameState,
  intents: PlayerIntent[],
  rng: SeededRng,
  events: EventBus,
) {
  if (state.match.gameOver) return;

  applyIntents(state, intents, DT);
  movementSystem(state, DT);
  shootingSystem(state, intents, DT, rng, events);
  bulletSystem(state, DT);
  collisionSystem(state, events); // order: enemies → players → tiles → contact
  enemyAISystem(state, DT);
  spawnSystem(state, DT, rng, events);
  livesRespawnSystem(state, intents, DT, events);
  modeRulesSystem(state, DT);

  state.match.rngState = rng.state();
  state.match.tick++;
}
```

### Determinism rules (future online)

- Seed RNG once per match (`match.rngSeed`); current state stored in `match.rngState`
- All randomness from a seeded RNG (e.g., mulberry32) passed into `step()` — never `Math.random()`
- Simulation updates only from `(state, intents, dt, rng)`
- All timers are integer tick counts (TICKS_PER_SECOND = 60), not float seconds
- EntityIds are monotonically incrementing numbers from `match.nextEntityId`

### Collision Resolution Order

Per bullet, check in this order:

1. **Enemies** (reward player intent — they're aiming at enemies, not walls)
2. **Players** (PvP damage, respects friendly fire rules)
3. **Tiles** (environmental destruction)

First hit consumes the bullet (single-hit). After all bullet collisions resolve:

4. **Enemies vs Players** (contact damage = 2 HP, last)

Bullets processed by array index for deterministic ordering.

### State Snapshot Contract

`cloneState(state: GameState): GameState` — deep-copies entity arrays, shallow-copies primitives. O(entityCount). Used only for debug/replay/future netcode snapshots — NOT called every tick.

No system may hold references to state sub-objects across tick boundaries.

---

## Systems Responsibilities (Prototype)

- `applyIntents`: copy/transform intents into player movement/aim desires
- `movement`: acceleration + damping + arena bounds + tile collision (250 px/s move speed). Downed players crawl at 75 px/s.
- `shooting`: rate-limited bullet spawn from pre-allocated pool (15-tick cooldown). Invuln players cannot fire.
- `bullets`: integrate position, decrement TTL, deactivate expired bullets
- `collisions` (resolution order: enemies → players → tiles → contact):
  - bullets vs enemies (first hit deactivates bullet; knockback push along bullet dir; score/kills awarded)
  - bullets vs players (friendly fire OFF in co-op, ON in PvP; invuln players immune; 12px knockback on all hits)
  - bullets vs tiles (reduce HP; set to empty + emit `tile_destroyed` when HP reaches 0)
  - enemies vs players (contact damage = 2 HP, last)
  - Bullet-tile lookup via grid indexing: `cellX = floor(pos.x / cellSize)`, O(1) per bullet

- `enemies`: two types — chasers (120 px/s, seek nearest player) and shooters (80 px/s, maintain 200px range, fire bullets at 1.5s intervals)
- `spawns`: co-op only (PvP has no enemies). Spawn at edges; 150px min distance from players; 30-tick telegraph; every 10th spawn is a shooter. Scale rate with player count (see bounds.md).
- `livesRespawn`:
  - co-op: downed state + revive (90-tick hold) + bleed-out (480 ticks) + shared lives
  - PvP: 30-tick respawn + 90-tick invuln (cannot deal damage while invuln)

- `modeRules`:
  - co-op: game over when 0 shared lives and no players alive or downed
  - PvP: game over when tick >= 7200 (2 minutes). Kills/deaths tracked per player.

---

## Event Bus (for VFX / SFX, not gameplay)

Simulation emits events; renderer consumes them. Events never feed back into the simulation.

### EventBus Contract

- Events are appended during `step()`.
- The renderer drains and clears all events after consuming them each frame.
- If multiple sim steps run per frame (catch-up), events accumulate across ticks.
- For future rollback: events are discarded and re-emitted during replay.

### Required Events

- `bullet_fired { bulletId, ownerId, pos }`
- `hit_player { bulletId, playerId, damage }`
- `hit_enemy { bulletId, enemyId, damage }`
- `tile_damaged { col, row, remainingHp }`
- `tile_destroyed { col, row }` — renderer plays 300ms destruction animation; sim has already removed the tile
- `player_downed { playerId, pos }`
- `revive_start { targetId, reviverId }`
- `revive_complete { targetId, reviverId }`
- `revive_cancelled { targetId }`
- `player_bled_out { playerId }`
- `player_respawned { playerId, pos }`
- `enemy_spawned { enemyId, pos }` — preceded by 30-tick telegraph
- `enemy_killed { enemyId, killerBulletOwnerId }`
- `player_joined { playerId, slot, pos }` — mid-match drop-in

---

## Render Layer (Phaser)

### Scene responsibilities

- **BootScene**: load minimal assets (or none early), init plugins
- **StartScene**: title screen with Start button
- **LobbyScene**: join flow (up to 7 controllers), device assignment, mode select, start match
- **MatchScene**:
  - owns `GameState`, `InputManager`, `EventBus`
  - runs fixed-timestep simulation
  - updates `RenderWorld` + `HUD` each frame
  - supports mid-match drop-in for new players
- **PauseScene**: overlay on Escape, resume/quit
- **GameOverScene**: co-op (final score) or PvP (ranked leaderboard with kills/deaths)

### RenderWorld

- Maintains sprite/graphics objects keyed by `EntityId`
- On each frame:
  - ensure entity visuals exist (create sprites for new active entities, hide inactive ones)
  - interpolate positions: `renderPos = lerp(prevPos, currentPos, alpha)` where `alpha = accumulator remainder / dt`
  - consume `EventBus` to play particles/sound/shake

### Render Interpolation (prototype-blocking, week 1)

Store `previousState` entity positions before each sim tick. The renderer lerps between previous and current positions using the accumulator remainder as the interpolation factor. Without this, sprites jump in discrete steps causing visible stutter at non-60Hz refresh rates. This is ~25 lines of code and must land with milestone 2 (render players + movement).

---

## Testing Strategy (optional but high leverage)

Use **Vitest** to test pure systems:

- tile damage and destruction
- bullet TTL and collision rules
- spawn ramp logic
- revive/respawn and shared lives correctness

No Phaser required in unit tests.

---

## Coding Standards (to keep AI output consistent)

- No Phaser imports in `src/core/**`
- No gameplay rules in `src/game/render/**`
- Systems are small, single-purpose functions
- Prefer data-driven constants in `Defaults.ts`
- Pool from day one: `bullets[]` and `enemies[]` are pre-allocated arrays with `active: boolean` flags. Never use `new` or `push()` for entities — find an inactive slot. Never use `splice()` — set `active = false`.
- All timers are integer tick counts, never float seconds
- Never call `Math.random()` in simulation code — use seeded RNG only
- EntityIds are numbers from `match.nextEntityId++`, never strings

---

## Milestone Build Order (all complete)

1. ~~`GameState` + fixed tick loop + seeded RNG~~
2. ~~Render players + movement + render interpolation~~
3. ~~Shooting + bullets (pooled from day one)~~
4. ~~Tile grid + breakable tiles~~
5. ~~Enemies + spawns (chaser + shooter, pooled, telegraph + safety distance)~~
6. ~~Co-op shared lives + downed/revive~~
7. ~~Lobby join flow (7 controllers) + mid-match drop-in~~
8. ~~PvP time mode (2-min timer, kills/deaths scoring, instant respawn, knockback, HUD, game over)~~

---

# Prototype Software Architecture

## 1) High-level rule

**Input → Simulation → Render**
Nothing else gets to “decide” gameplay.

- **Input** produces _intent_ (move/aim/shoot/etc.)
- **Simulation** updates authoritative world state
- **Render** draws the world state (no gameplay logic)

This is the one constraint that keeps networking possible later.

---

## 2) Core modules

### A) `GameState` (authoritative data)

Plain data, no Phaser objects.

- `players[]`: id, slot, pos, vel, aim, hp, alive, downed, downedTimer, reviveProgress, reviverId, respawnTimer, invulnTimer, fireCooldown, kills, deaths, team
- `bullets[]`: id, ownerId, pos, vel, ttl, damage, active, fromEnemy (pre-allocated pool)
- `enemies[]`: id, type, pos, vel, hp, active, spawnTimer, fireCooldown, knockback, score (pre-allocated pool)
- `tiles`: destructible grid (hp per cell, type: empty/solid/breakable)
- `match`: mode, tick, sharedLives, score, rngSeed, rngState, nextEntityId, gameOver, spawnCount

### B) `InputManager` (device → intent)

Collects keyboard/mouse + gamepads and outputs:

- `PlayerIntent` per player per tick:
  - `move: {x,y}`
  - `aim: {x,y}`
  - `shoot: boolean`
  - `revive: boolean` (co-op)
  - `join: boolean` (lobby)

This layer is where controller mapping lives.

### C) `Systems` (simulation steps)

Each tick (DT = 1/60, computed once):

1. `applyIntents(state, intents, DT)`
2. `movementSystem(state, DT)`
3. `shootingSystem(state, intents, DT, rng, events)` (spawns bullets from pool)
4. `bulletSystem(state, DT)` (moves bullets, decrements TTL ticks)
5. `collisionSystem(state, events)` (enemies → players → tiles → contact)
6. `enemyAISystem(state, DT)` (chaser seek + shooter range/fire)
7. `spawnSystem(state, DT, rng, events)` (co-op only; edges, telegraph, safety distance)
8. `livesRespawnSystem(state, intents, DT, events)` (no spectator rule)
9. `modeRulesSystem(state, DT)` (end conditions: co-op lives / PvP timer)

Then: `state.match.rngState = rng.state(); state.match.tick++;`

Keep systems pure (state in → state out). All timers in tick counts.

### D) `Renderer` (state → visuals)

A thin adapter that:

- creates Phaser sprites / graphics objects for entities
- updates their positions each frame
- plays effects based on events (see next)

### E) `EventBus` (required, not optional)

Simulation emits events the renderer consumes. Events never feed back into simulation.

- `bullet_fired`, `hit_player`, `hit_enemy`, `tile_damaged`, `tile_destroyed`
- `player_downed`, `revive_start`, `revive_complete`, `revive_cancelled`
- `player_bled_out`, `player_respawned`, `enemy_spawned`, `enemy_killed`
- `player_joined`

EventBus is drained by the renderer after all sim ticks per frame. See "EventBus Contract" section above for full lifecycle spec.

---

## 3) Scenes (Phaser)

- `BootScene` (load assets)
- `StartScene` (title screen)
- `LobbyScene` ("Press A to join" + pick mode)
- `MatchScene` (runs game loop + mid-match join)
- `PauseScene` (overlay, resume/quit)
- `GameOverScene` (co-op score / PvP leaderboard)

---

## 4) Tick model (important)

Use a **fixed simulation tick** at 60 Hz (TICKS_PER_SECOND = 60), even if rendering is variable.

- Poll input at the START of each sim tick
- Accumulate time
- Run simulation in fixed `dt` steps
- Store previous entity positions before each tick
- Render every frame by interpolating between previous and current state (`alpha = accumulator remainder / dt`)

This matters for smooth visuals and later for deterministic behavior + networking.

---

## 5) Where destructible tiles live

In `tiles` inside GameState, as a grid:

- `tileType` (indestructible, destructible, empty)
- `tileHP` (for destructible), or just “one-shot break” initially

Collision system checks bullet position → grid cell → apply damage/remove.

---

## 6) Key Constants (Defaults.ts)

```ts
// core/state/Defaults.ts (key layout constants — see file for full balance table)
export const TICKS_PER_SECOND = 60;
export const ARENA_WIDTH = 960;
export const ARENA_HEIGHT = 720;
export const TILE_COLS = 20;
export const TILE_ROWS = 15;
export const CELL_SIZE = 48;
export const MAX_PLAYERS = 7;
export const MAX_BULLETS = 256;  // pre-allocated pool
export const MAX_ENEMIES = 100;  // pre-allocated pool
export const PVP_MATCH_DURATION = 7200; // ticks (120s)
```

---

# Why this ordering is worth it

- You can prototype fast (Phaser handles visuals + input plumbing)
- Your game logic stays testable and portable
- Online multiplayer later is "swap intent source" instead of "rewrite game"
