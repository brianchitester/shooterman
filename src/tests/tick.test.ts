import { describe, it, expect } from "vitest";
import { createGameState } from "../core/state/GameState";
import { createRng } from "../core/sim/rng/seedRng";
import { createEventBus } from "../core/events/EventBus";
import { step } from "../core/sim/tick";
import type { PlayerIntent } from "../core/state/Types";
import { WEAPON_AUTO } from "../core/defs/weapons";

const BULLET_TTL = WEAPON_AUTO.bulletTTL;
const FIRE_COOLDOWN = WEAPON_AUTO.fireRate;

function emptyIntents(count: number): PlayerIntent[] {
  const intents: PlayerIntent[] = [];
  for (let i = 0; i < count; i++) {
    intents[i] = { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, shoot: false, revive: false };
  }
  return intents;
}

describe("step()", () => {
  it("increments tick count", () => {
    const state = createGameState("coop", 2, 42);
    const rng = createRng(42);
    const events = createEventBus();

    step(state, emptyIntents(2), rng, events);
    expect(state.match.tick).toBe(1);

    step(state, emptyIntents(2), rng, events);
    expect(state.match.tick).toBe(2);
  });

  it("runs many ticks without crashing", () => {
    const state = createGameState("coop", 4, 42);
    const rng = createRng(42);
    const events = createEventBus();
    const intents = emptyIntents(4);

    for (let i = 0; i < 3600; i++) {
      step(state, intents, rng, events);
    }

    // Tick may be < 3600 if game over triggers (players die from enemies)
    expect(state.match.tick).toBeGreaterThan(0);
    expect(state.match.tick).toBeLessThanOrEqual(3600);
  });

  it("spawns a bullet on shoot intent", () => {
    const state = createGameState("coop", 1, 42);
    const rng = createRng(42);
    const events = createEventBus();

    const intents: PlayerIntent[] = [
      { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, shoot: true, revive: false },
    ];

    step(state, intents, rng, events);

    let activeBullets = 0;
    for (let i = 0; i < state.bullets.length; i++) {
      if (state.bullets[i].active) activeBullets++;
    }
    expect(activeBullets).toBe(1);

    // Check bullet was fired event
    const drained = events.drain();
    const fired = drained.filter(e => e.type === "bullet_fired");
    expect(fired.length).toBe(1);
  });

  it("respects fire cooldown", () => {
    const state = createGameState("coop", 1, 42);
    const rng = createRng(42);
    const events = createEventBus();

    const intents: PlayerIntent[] = [
      { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, shoot: true, revive: false },
    ];

    // First shot
    step(state, intents, rng, events);
    expect(state.players[0].fireCooldown).toBe(FIRE_COOLDOWN);

    // Subsequent ticks during cooldown — no new bullet
    step(state, intents, rng, events);
    let activeBullets = 0;
    for (let i = 0; i < state.bullets.length; i++) {
      if (state.bullets[i].active) activeBullets++;
    }
    expect(activeBullets).toBe(1); // Still just the one
  });

  it("deactivates bullets after TTL expires", () => {
    const state = createGameState("pvp_time", 1, 42);
    const rng = createRng(42);
    const events = createEventBus();

    // Fire a bullet
    const shootIntents: PlayerIntent[] = [
      { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, shoot: true, revive: false },
    ];
    step(state, shootIntents, rng, events);

    // Verify bullet active
    let activeIdx = -1;
    for (let i = 0; i < state.bullets.length; i++) {
      if (state.bullets[i].active) { activeIdx = i; break; }
    }
    expect(activeIdx).not.toBe(-1);

    // Run until TTL expires
    const noShoot = emptyIntents(1);
    for (let t = 0; t < BULLET_TTL; t++) {
      step(state, noShoot, rng, events);
    }

    // Bullet should now be inactive
    let anyActive = false;
    for (let i = 0; i < state.bullets.length; i++) {
      if (state.bullets[i].active) { anyActive = true; break; }
    }
    expect(anyActive).toBe(false);
  });

  it("syncs RNG state back to match", () => {
    const state = createGameState("coop", 2, 42);
    const rng = createRng(42);
    const events = createEventBus();

    const initial = state.match.rngState;
    step(state, emptyIntents(2), rng, events);

    // RNG state should have advanced
    expect(state.match.rngState).not.toBe(initial);
    expect(state.match.rngState).toBe(rng.state());
  });

  it("spawns enemies over time in co-op", () => {
    const state = createGameState("coop", 4, 42);
    const rng = createRng(42);
    const events = createEventBus();
    const intents = emptyIntents(4);

    // Run for several seconds
    for (let i = 0; i < 600; i++) {
      step(state, intents, rng, events);
    }

    let activeEnemies = 0;
    for (let i = 0; i < state.enemies.length; i++) {
      if (state.enemies[i].active) activeEnemies++;
    }
    // Should have some enemies after 10 seconds
    expect(activeEnemies).toBeGreaterThan(0);
  });
});
