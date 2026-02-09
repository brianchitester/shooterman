# Software Architecture Document

**Project:** Party Arena Shooter (local 1–7 players)
**Stack:** TypeScript + Phaser 3 + Vite
**Primary constraint:** **Input → Simulation → Render** (keep gameplay deterministic and portable)

---

## Goals

- **Fast prototype iteration** (one arena, destructible cover, co-op endless, PvP later)
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
      LobbyScene.ts
      MatchScene.ts
    render/
      RenderWorld.ts
      RenderFactories.ts
      Vfx.ts
  core/
    state/
      GameState.ts
      Types.ts
      Defaults.ts
    sim/
      tick.ts
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
    input/
      InputManager.ts
      devices/
        KeyboardMouseDevice.ts
        GamepadDevice.ts
      mapping/
        defaultMappings.ts
      lobby/
        JoinManager.ts
    events/
      EventBus.ts
      Events.ts
  assets/   (optional; for audio/images later)
  tests/    (Vitest)
```

---

## Core Data Model (Engine-agnostic)

### Key Types (TypeScript interfaces)

Keep these as plain data. No Phaser types in `core/`.

```ts
// core/state/Types.ts
export type EntityId = number; // monotonic counter, not string

export interface Vec2 {
  x: number;
  y: number;
}

export type Mode = "coop" | "pvp_time";

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
}

export interface EnemyState {
  id: EntityId;
  type: "chaser"; // prototype
  pos: Vec2;
  vel: Vec2;
  hp: number;
  active: boolean; // pooling flag
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
export function step(
  state: GameState,
  intents: PlayerIntent[],
  dt: number,
  rng: SeededRng,
  events: EventBus,
) {
  applyIntents(state, intents, dt);
  movementSystem(state, dt);
  shootingSystem(state, dt, rng, events);
  bulletSystem(state, dt);
  collisionSystem(state, events); // order: enemies → players → tiles → contact
  enemyAISystem(state, dt, rng);
  spawnSystem(state, dt, rng, events);
  livesRespawnSystem(state, dt, events);
  modeRulesSystem(state, dt);
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
- `movement`: acceleration + damping + arena bounds (250 px/s move speed)
- `shooting`: rate-limited bullet spawn from pre-allocated pool (15-tick cooldown)
- `bullets`: integrate position, decrement TTL, deactivate expired bullets
- `collisions` (resolution order: enemies → players → tiles → contact):
  - bullets vs enemies (first hit deactivates bullet)
  - bullets vs players (friendly fire OFF in co-op, ON in PvP; invuln players immune)
  - bullets vs tiles (reduce HP; set to empty + emit `tile_destroyed` when HP reaches 0)
  - enemies vs players (contact damage = 2 HP, last)
  - Bullet-tile lookup via grid indexing: `cellX = floor(pos.x / cellSize)`, O(1) per bullet

- `enemies`: choose target (nearest alive player), steer (120 px/s)
- `spawns`: spawn enemies at edges; 150px min distance from players; 30-tick telegraph; scale with player count (see bounds.md)
- `livesRespawn`:
  - co-op: downed state + revive (90-tick hold) + bleed-out (480 ticks) + shared lives
  - PvP: 30-tick respawn + 90-tick invuln (cannot deal damage while invuln)

- `modeRules`: scoring (kills/deaths for PvP, shared score for co-op), friendly fire rules, match timer, end conditions

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

---

## Render Layer (Phaser)

### Scene responsibilities

- **BootScene**: load minimal assets (or none early), init plugins
- **LobbyScene**: join flow, device assignment, start match
- **MatchScene**:
  - owns `GameState`, `InputManager`, `EventBus`
  - runs fixed-timestep simulation
  - updates `RenderWorld` each frame

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

## Milestone Build Order

1. `GameState` + fixed tick loop + seeded RNG (no rendering, console logs ok)
2. Render players + movement + render interpolation (KB/M first)
3. Shooting + bullets (pooled from day one)
4. Tile grid + breakable tiles (core "Bomberman" influence)
5. Enemies + spawns (pooled, with telegraph + safety distance)
6. Co-op shared lives + downed/revive (no spectators)
7. Lobby join flow (7 controllers) + mid-match drop-in
8. PvP time mode (kills/deaths scoring, instant respawn)

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
- `bullets[]`: id, ownerId, pos, vel, ttl, damage, active (pre-allocated pool)
- `enemies[]`: id, type, pos, vel, hp, active (pre-allocated pool)
- `tiles`: destructible grid (hp per cell, type: empty/solid/breakable)
- `match`: mode, tick, sharedLives, score, rngSeed, rngState, nextEntityId

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

Each tick (all receive seeded RNG where needed):

1. `applyIntents(state, intents, dt)`
2. `movementSystem(state, dt)`
3. `shootSystem(state, dt, rng)` (spawns bullets from pool)
4. `bulletSystem(state, dt)` (moves bullets, decrements TTL ticks)
5. `collisionSystem(state, events)` (enemies → players → tiles → contact)
6. `enemyAISystem(state, dt, rng)`
7. `spawnSystem(state, dt, rng, events)` (edges, telegraph, safety distance)
8. `livesRespawnSystem(state, dt, events)` (no spectator rule)
9. `modeRulesSystem(state, dt)` (scoring, match timer, end conditions)

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

EventBus is drained by the renderer after all sim ticks per frame. See "EventBus Contract" section above for full lifecycle spec.

---

## 3) Scenes (Phaser)

Keep it super simple:

- `BootScene` (load assets)
- `LobbyScene` (“Press A to join” + pick mode)
- `MatchScene` (runs game loop)

Lobby exists mainly to solve controller assignment cleanly.

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
// core/state/Defaults.ts
export const TICKS_PER_SECOND = 60;
export const ARENA_WIDTH = 960;
export const ARENA_HEIGHT = 720;
export const TILE_COLS = 20;
export const TILE_ROWS = 15;
export const CELL_SIZE = 48;
export const MAX_PLAYERS = 7;
export const MAX_BULLETS = 256;  // pre-allocated pool
export const MAX_ENEMIES = 20;   // hard cap regardless of player count
```

---

# Why this ordering is worth it

- You can prototype fast (Phaser handles visuals + input plumbing)
- Your game logic stays testable and portable
- Online multiplayer later is "swap intent source" instead of "rewrite game"
