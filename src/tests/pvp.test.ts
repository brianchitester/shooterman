import { describe, it, expect } from "vitest";
import { createGameState } from "../core/state/GameState";
import { createRng } from "../core/sim/rng/seedRng";
import { createEventBus } from "../core/events/EventBus";
import { step } from "../core/sim/tick";
import { collisionSystem } from "../core/sim/systems/collisions";
import type { PlayerIntent } from "../core/state/Types";
import { PVP_MATCH_DURATION, PLAYER_KNOCKBACK } from "../core/state/Defaults";
import { WEAPON_AUTO } from "../core/defs/weapons";

const BULLET_SPEED = WEAPON_AUTO.bulletSpeed;
const BULLET_DAMAGE = WEAPON_AUTO.bulletDamage;
const BULLET_TTL = WEAPON_AUTO.bulletTTL;

function emptyIntents(count: number): PlayerIntent[] {
  const intents: PlayerIntent[] = [];
  for (let i = 0; i < count; i++) {
    intents[i] = { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, shoot: false, revive: false };
  }
  return intents;
}

describe("PVP mode", () => {
  it("pvpRules sets gameOver at PVP_MATCH_DURATION", () => {
    const state = createGameState("pvp_time", 2, 42);
    const rng = createRng(42);
    const events = createEventBus();

    state.match.tick = PVP_MATCH_DURATION;
    step(state, emptyIntents(2), rng, events);

    expect(state.match.gameOver).toBe(true);
  });

  it("pvpRules does not end match early", () => {
    const state = createGameState("pvp_time", 2, 42);
    const rng = createRng(42);
    const events = createEventBus();

    state.match.tick = PVP_MATCH_DURATION - 1;
    step(state, emptyIntents(2), rng, events);

    expect(state.match.gameOver).toBe(false);
  });

  it("player knockback on bullet hit in PVP", () => {
    const state = createGameState("pvp_time", 2, 42);
    const rng = createRng(42);
    const events = createEventBus();

    // Place players far from walls/enemies and each other
    state.players[0].pos = { x: 200, y: 200 };
    state.players[1].pos = { x: 200, y: 350 };
    // Give player 1 enough HP to survive
    state.players[1].hp = 3;
    // Clear invuln
    state.players[0].invulnTimer = 0;
    state.players[1].invulnTimer = 0;

    // Manually place a bullet from player 0 heading toward player 1 (downward)
    const bullet = state.bullets[0];
    bullet.active = true;
    bullet.id = state.match.nextEntityId++;
    bullet.ownerId = state.players[0].id;
    bullet.pos = { x: 200, y: 348 }; // Just above player 1 (within hit radius: 4+16=20)
    bullet.vel = { x: 0, y: BULLET_SPEED };
    bullet.ttl = BULLET_TTL;
    bullet.damage = BULLET_DAMAGE;
    bullet.fromEnemy = false;

    const beforeY = state.players[1].pos.y;

    step(state, emptyIntents(2), rng, events);

    // Player should have been pushed downward by PLAYER_KNOCKBACK
    expect(state.players[1].pos.y).toBeGreaterThan(beforeY);
    // The knockback should be approximately PLAYER_KNOCKBACK (may not be exact due to movement system)
    // But the position change from knockback alone is exactly PLAYER_KNOCKBACK in the bullet direction
    expect(state.players[1].pos.y - beforeY).toBeCloseTo(PLAYER_KNOCKBACK, 0);
  });

  it("player knockback applies in co-op too", () => {
    const state = createGameState("coop", 2, 42);
    const events = createEventBus();

    // Deactivate all enemies so contact damage doesn't interfere
    for (let i = 0; i < state.enemies.length; i++) {
      state.enemies[i].active = false;
    }

    // Place players far apart
    state.players[0].pos = { x: 200, y: 200 };
    state.players[1].pos = { x: 600, y: 600 };
    state.players[0].invulnTimer = 0;
    state.players[0].hp = 3;

    // Enemy bullet already overlapping player 0
    const bullet = state.bullets[0];
    bullet.active = true;
    bullet.id = state.match.nextEntityId++;
    bullet.ownerId = 999; // enemy owner
    bullet.pos = { x: 200, y: 200 }; // Overlapping player 0
    bullet.vel = { x: 0, y: 300 };
    bullet.ttl = BULLET_TTL;
    bullet.damage = BULLET_DAMAGE;
    bullet.fromEnemy = true;

    const beforeY = state.players[0].pos.y;

    // Call collision system directly to isolate knockback behavior
    collisionSystem(state, events);

    // Player should be pushed downward by PLAYER_KNOCKBACK
    expect(state.players[0].pos.y).toBe(beforeY + PLAYER_KNOCKBACK);
  });

  it("kill/death tracking through full step", () => {
    const state = createGameState("pvp_time", 2, 42);
    const rng = createRng(42);
    const events = createEventBus();

    // Place players away from walls
    state.players[0].pos = { x: 200, y: 200 };
    state.players[1].pos = { x: 200, y: 350 };
    state.players[0].invulnTimer = 0;
    state.players[1].invulnTimer = 0;

    // Set player 1 to 1 HP so the bullet kills them
    state.players[1].hp = 1;

    // Bullet from player 0 toward player 1
    const bullet = state.bullets[0];
    bullet.active = true;
    bullet.id = state.match.nextEntityId++;
    bullet.ownerId = state.players[0].id;
    bullet.pos = { x: 200, y: 348 };
    bullet.vel = { x: 0, y: BULLET_SPEED };
    bullet.ttl = BULLET_TTL;
    bullet.damage = BULLET_DAMAGE;
    bullet.fromEnemy = false;

    const killsBefore = state.players[0].kills;
    const deathsBefore = state.players[1].deaths;

    step(state, emptyIntents(2), rng, events);

    expect(state.players[0].kills).toBe(killsBefore + 1);
    expect(state.players[1].deaths).toBe(deathsBefore + 1);
    expect(state.players[1].alive).toBe(false);
  });
});
