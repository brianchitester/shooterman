# Shooterman

A local multiplayer party arena shooter for 1–7 players. Think top-down Bomberman meets twin-stick chaos — destructible cover, chaser enemies, co-op shared lives, and PvP free-for-all. Gamepad-first, couch-play focused.

## Stack

- **TypeScript** + **Phaser 3** + **Vite**
- **Vitest** for testing
- Deterministic simulation (seeded RNG, fixed 60Hz tick, integer tick timers)

## Getting Started

```bash
npm install
npm run dev       # Vite dev server (opens browser, console output for now)
npm run build     # Production build
npm test          # Run tests once
npm run test:watch # Watch mode
```

## Project Structure

```
src/
  main.ts                     # Entry point (console-only tick loop for now)
  core/                       # Engine-agnostic simulation — NO Phaser imports
    state/
      Types.ts                # All data interfaces (GameState, PlayerState, etc.)
      Defaults.ts             # Balance constants, pool sizes, spawn points
      GameState.ts            # createGameState() factory, cloneState()
    sim/
      tick.ts                 # step() — runs all 9 systems in order
      rng/
        seedRng.ts            # Mulberry32 seeded PRNG
      systems/
        applyIntents.ts       # Intent → player velocity/aim
        movement.ts           # Position integration + arena bounds
        shooting.ts           # Bullet spawn from pool + fire cooldown
        bullets.ts            # Bullet movement + TTL expiry
        collisions.ts         # 4-phase: enemies → players → tiles → contact
        enemies.ts            # Chaser AI (steer toward nearest player)
        spawns.ts             # Edge spawning, safety distance, ramp scaling
        livesRespawn.ts       # Co-op downed/revive/bleed-out, PvP respawn
        modeRules.ts          # Scoring + end conditions per mode
    events/
      Events.ts               # 13 event types (discriminated union)
      EventBus.ts             # emit() / drain() / clear()
  tests/
    state.test.ts
    rng.test.ts
    tick.test.ts
docs/
  arch.md                     # Architecture + types + systems
  pillars.md                  # 6 design pillars
  loop.md                     # 2-second core loop
  bounds.md                   # Balance constants + mode rules
  aesthetic.md                # Visual direction
  scope.md                    # Prototype scope guard
```

## Architecture Rules

These are hard constraints — not suggestions.

- **Input → Simulation → Render.** No gameplay logic in rendering code.
- **No Phaser imports in `src/core/`**. The simulation layer is engine-agnostic.
- **No `Math.random()` in simulation code.** Use the seeded RNG passed into `step()`.
- **All timers are integer tick counts** (TICKS_PER_SECOND = 60). Never float seconds.
- **EntityId = number**, monotonically incrementing from `match.nextEntityId++`.
- **Pre-allocated pools** for bullets and enemies. Never `new`, `push`, or `splice` for entities — find an inactive slot. Set `active = false` to "remove".
- **No allocations in the hot loop** — no `new`, spread, `map`/`filter` creating arrays during `step()`.
- **Events are fire-and-forget.** The EventBus never feeds back into simulation. Renderer drains events each frame.

## Milestone Progress

- [x] **M1**: GameState + fixed tick loop + seeded RNG (console-only)
- [ ] **M2**: Render players + movement + render interpolation
- [ ] **M3**: Shooting + bullets
- [ ] **M4**: Tile grid + breakable tiles
- [ ] **M5**: Enemies + spawns
- [ ] **M6**: Co-op shared lives + downed/revive
- [ ] **M7**: Lobby join flow (7 controllers) + mid-match drop-in
- [ ] **M8**: PvP time mode

## Design Docs

All game design decisions live in `docs/`. Read these before making gameplay changes:

- **pillars.md** — What the game optimizes for (and what it doesn't)
- **loop.md** — The 2-second core gameplay loop
- **bounds.md** — All balance numbers, spawn scaling, friendly fire rules
- **scope.md** — What's in/out of the prototype
- **arch.md** — Full technical architecture, type definitions, system responsibilities

## Running the Simulation

M1 has no rendering. `npm run dev` opens a browser with console output showing the tick loop running 60 seconds of co-op with 4 idle players. You'll see enemies spawn, ramp up, and eventually overwhelm the players.
