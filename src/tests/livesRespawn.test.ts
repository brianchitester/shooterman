import { describe, it, expect } from "vitest";
import { createGameState } from "../core/state/GameState";
import { createRng } from "../core/sim/rng/seedRng";
import { createEventBus } from "../core/events/EventBus";
import { step } from "../core/sim/tick";
import { applyIntents } from "../core/sim/systems/applyIntents";
import { shootingSystem } from "../core/sim/systems/shooting";
import type { PlayerIntent } from "../core/state/Types";
import {
  DOWNED_BLEEDOUT_TIMER, REVIVE_HOLD_TIME, SPAWN_INVULN_DURATION,
  PLAYER_HP, DOWNED_CRAWL_SPEED, DT,
} from "../core/state/Defaults";
import { ENEMY_CHASER } from "../core/defs/enemies";

function emptyIntents(count: number): PlayerIntent[] {
  const intents: PlayerIntent[] = [];
  for (let i = 0; i < count; i++) {
    intents[i] = { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, shoot: false, revive: false };
  }
  return intents;
}

/** Place an active enemy directly on top of a player so contact damage triggers. */
function placeEnemyOnPlayer(state: ReturnType<typeof createGameState>, playerIdx: number) {
  const enemy = state.enemies[0];
  enemy.active = true;
  enemy.hp = 99;
  enemy.spawnTimer = 0;
  enemy.contactDamage = ENEMY_CHASER.contactDamage;
  enemy.colliderRadius = 12;
  enemy.pos.x = state.players[playerIdx].pos.x;
  enemy.pos.y = state.players[playerIdx].pos.y;
}

describe("M6: Co-op shared lives + downed/revive", () => {
  it("player goes downed on lethal enemy contact", () => {
    const state = createGameState("coop", 2, 42);
    const rng = createRng(42);
    const events = createEventBus();

    // Reduce HP so one contact kills
    state.players[0].hp = ENEMY_CHASER.contactDamage;
    placeEnemyOnPlayer(state, 0);

    step(state, emptyIntents(2), rng, events);

    expect(state.players[0].downed).toBe(true);
    expect(state.players[0].alive).toBe(false);
    expect(state.players[0].downedTimer).toBe(DOWNED_BLEEDOUT_TIMER - 1); // decremented once in same tick

    const drained = events.drain();
    expect(drained.some(e => e.type === "player_downed")).toBe(true);
  });

  it("downed player bleeds out after timer expires", () => {
    const state = createGameState("coop", 2, 42);
    const rng = createRng(42);
    const events = createEventBus();

    // Manually down player 0
    state.players[0].alive = false;
    state.players[0].downed = true;
    state.players[0].downedTimer = DOWNED_BLEEDOUT_TIMER;
    state.players[0].hp = 0;

    // Move enemy far away to prevent re-contact
    state.enemies[0].active = false;

    for (let i = 0; i < DOWNED_BLEEDOUT_TIMER; i++) {
      step(state, emptyIntents(2), rng, events);
    }

    expect(state.players[0].downed).toBe(false);

    const drained = events.drain();
    expect(drained.some(e => e.type === "player_bled_out")).toBe(true);
  });

  it("bleed-out consumes shared life and respawns player", () => {
    const state = createGameState("coop", 2, 42);
    const rng = createRng(42);
    const events = createEventBus();
    const initialLives = state.match.sharedLives;

    // Manually down player 0
    state.players[0].alive = false;
    state.players[0].downed = true;
    state.players[0].downedTimer = 1; // will bleed out next tick
    state.players[0].hp = 0;

    step(state, emptyIntents(2), rng, events);

    expect(state.match.sharedLives).toBe(initialLives - 1);
    expect(state.players[0].alive).toBe(true);
    expect(state.players[0].hp).toBe(PLAYER_HP);

    const drained = events.drain();
    expect(drained.some(e => e.type === "player_respawned")).toBe(true);
  });

  it("revive progress increments when reviver in range and holding E", () => {
    const state = createGameState("coop", 2, 42);
    const rng = createRng(42);
    const events = createEventBus();

    // Down player 0
    state.players[0].alive = false;
    state.players[0].downed = true;
    state.players[0].downedTimer = DOWNED_BLEEDOUT_TIMER;
    state.players[0].hp = 0;

    // Place player 1 right next to player 0
    state.players[1].pos.x = state.players[0].pos.x + 10;
    state.players[1].pos.y = state.players[0].pos.y;

    const intents = emptyIntents(2);
    intents[1].revive = true;

    step(state, intents, rng, events);

    expect(state.players[0].reviveProgress).toBeGreaterThan(0);
    expect(state.players[0].reviverId).toBe(state.players[1].id);

    const drained = events.drain();
    expect(drained.some(e => e.type === "revive_start")).toBe(true);
  });

  it("revive completes after REVIVE_HOLD_TIME ticks", () => {
    const state = createGameState("coop", 2, 42);
    const rng = createRng(42);
    const events = createEventBus();

    // Down player 0
    state.players[0].alive = false;
    state.players[0].downed = true;
    state.players[0].downedTimer = DOWNED_BLEEDOUT_TIMER;
    state.players[0].hp = 0;

    // Place player 1 right next to player 0
    state.players[1].pos.x = state.players[0].pos.x + 10;
    state.players[1].pos.y = state.players[0].pos.y;

    const intents = emptyIntents(2);
    intents[1].revive = true;

    for (let i = 0; i < REVIVE_HOLD_TIME; i++) {
      step(state, intents, rng, events);
    }

    expect(state.players[0].downed).toBe(false);
    expect(state.players[0].alive).toBe(true);
    expect(state.players[0].hp).toBe(PLAYER_HP);
    expect(state.players[0].invulnTimer).toBeGreaterThan(0);

    const drained = events.drain();
    expect(drained.some(e => e.type === "revive_complete")).toBe(true);
  });

  it("revive cancels when reviver moves out of range", () => {
    const state = createGameState("coop", 2, 42);
    const rng = createRng(42);
    const events = createEventBus();

    // Down player 0
    state.players[0].alive = false;
    state.players[0].downed = true;
    state.players[0].downedTimer = DOWNED_BLEEDOUT_TIMER;
    state.players[0].hp = 0;

    // Place player 1 right next to player 0
    state.players[1].pos.x = state.players[0].pos.x + 10;
    state.players[1].pos.y = state.players[0].pos.y;

    const intents = emptyIntents(2);
    intents[1].revive = true;

    // Start reviving for a few ticks
    for (let i = 0; i < 5; i++) {
      step(state, intents, rng, events);
    }
    expect(state.players[0].reviveProgress).toBeGreaterThan(0);
    events.drain(); // clear

    // Move reviver far away
    state.players[1].pos.x = state.players[0].pos.x + 500;

    step(state, intents, rng, events);

    expect(state.players[0].reviveProgress).toBe(0);
    expect(state.players[0].reviverId).toBeNull();

    const drained = events.drain();
    expect(drained.some(e => e.type === "revive_cancelled")).toBe(true);
  });

  it("game over when 0 shared lives and all players dead", () => {
    const state = createGameState("coop", 2, 42);
    const rng = createRng(42);
    const events = createEventBus();

    // Deplete all lives
    state.match.sharedLives = 0;

    // Kill all players (not downed, fully dead)
    for (const p of state.players) {
      p.alive = false;
      p.downed = false;
      p.hp = 0;
    }

    step(state, emptyIntents(2), rng, events);

    expect(state.match.gameOver).toBe(true);
  });

  it("downed player moves at crawl speed", () => {
    const state = createGameState("coop", 1, 42);

    // Down the player
    state.players[0].alive = false;
    state.players[0].downed = true;
    state.players[0].downedTimer = DOWNED_BLEEDOUT_TIMER;

    const intents: PlayerIntent[] = [
      { move: { x: 1, y: 0 }, aim: { x: 1, y: 0 }, shoot: false, revive: false },
    ];

    applyIntents(state, intents, DT);

    expect(state.players[0].vel.x).toBe(DOWNED_CRAWL_SPEED);
    expect(state.players[0].vel.y).toBe(0);
  });

  it("downed player cannot shoot", () => {
    const state = createGameState("coop", 1, 42);
    const rng = createRng(42);
    const events = createEventBus();

    // Down the player
    state.players[0].alive = false;
    state.players[0].downed = true;
    state.players[0].downedTimer = DOWNED_BLEEDOUT_TIMER;
    state.players[0].fireCooldown = 0;

    const intents: PlayerIntent[] = [
      { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, shoot: true, revive: false },
    ];

    shootingSystem(state, intents, DT, rng, events);

    let activeBullets = 0;
    for (const b of state.bullets) {
      if (b.active) activeBullets++;
    }
    expect(activeBullets).toBe(0);
  });

  it("tick halts after game over", () => {
    const state = createGameState("coop", 1, 42);
    const rng = createRng(42);
    const events = createEventBus();

    state.match.gameOver = true;
    const tickBefore = state.match.tick;

    step(state, emptyIntents(1), rng, events);

    expect(state.match.tick).toBe(tickBefore);
  });
});
