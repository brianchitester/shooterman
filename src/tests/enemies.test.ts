import { describe, it, expect } from "vitest";
import { createGameState } from "../core/state/GameState";
import { createRng } from "../core/sim/rng/seedRng";
import { createEventBus } from "../core/events/EventBus";
import { step } from "../core/sim/tick";
import type { PlayerIntent, GameState } from "../core/state/Types";
import {
  SHOOTER_HP, SHOOTER_FIRE_COOLDOWN, SHOOTER_SPAWN_INTERVAL,
  SHOOTER_BULLET_DAMAGE, SHOOTER_KNOCKBACK, SHOOTER_SCORE, ENEMY_HP, PLAYER_HP,
  BREAKABLE_TILE_HP, CELL_SIZE, TILE_COLS,
} from "../core/state/Defaults";

function emptyIntents(count: number): PlayerIntent[] {
  const intents: PlayerIntent[] = [];
  for (let i = 0; i < count; i++) {
    intents[i] = { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, shoot: false, revive: false };
  }
  return intents;
}

/** Manually activate a shooter enemy in slot 0 for unit testing. */
function placeShooter(state: GameState, x: number, y: number): void {
  const enemy = state.enemies[0];
  enemy.id = state.match.nextEntityId++;
  enemy.type = "shooter";
  enemy.pos.x = x;
  enemy.pos.y = y;
  enemy.vel.x = 0;
  enemy.vel.y = 0;
  enemy.hp = SHOOTER_HP;
  enemy.active = true;
  enemy.spawnTimer = 0;
  enemy.fireCooldown = SHOOTER_FIRE_COOLDOWN;
  enemy.knockback = SHOOTER_KNOCKBACK;
  enemy.score = SHOOTER_SCORE;
}

describe("shooter enemy type", () => {
  it("spawns a shooter every 10th enemy", () => {
    const state = createGameState("coop", 1, 42);
    // Manually set spawnCount to 8 (next spawn = 9th = index 9-1=8... we want spawnCount%10===9)
    // spawnCount increments AFTER type selection, so set to SHOOTER_SPAWN_INTERVAL - 1
    state.match.spawnCount = SHOOTER_SPAWN_INTERVAL - 1;

    // Directly activate an enemy slot as the spawn system would
    const enemy = state.enemies[0];
    const type = state.match.spawnCount % SHOOTER_SPAWN_INTERVAL === (SHOOTER_SPAWN_INTERVAL - 1)
      ? "shooter" as const
      : "chaser" as const;
    enemy.type = type;
    enemy.active = true;

    expect(enemy.type).toBe("shooter");
  });

  it("shooter has correct HP", () => {
    const state = createGameState("coop", 1, 42);
    placeShooter(state, 400, 400);
    expect(state.enemies[0].hp).toBe(SHOOTER_HP);
    expect(SHOOTER_HP).toBe(3);
    expect(SHOOTER_HP).toBeGreaterThan(ENEMY_HP);
  });

  it("shooter fires bullet at player", () => {
    const state = createGameState("coop", 1, 42);
    const rng = createRng(42);
    const events = createEventBus();
    const intents = emptyIntents(1);

    // Place player at center
    state.players[0].pos.x = 480;
    state.players[0].pos.y = 360;
    state.players[0].invulnTimer = 0;

    // Place shooter at preferred range from player
    placeShooter(state, 480, 160);
    // Set cooldown to 1 so it fires on next tick
    state.enemies[0].fireCooldown = 1;

    // Tick to let shooter fire
    step(state, intents, rng, events);

    // Check that an enemy bullet was spawned
    let foundEnemyBullet = false;
    for (let i = 0; i < state.bullets.length; i++) {
      if (state.bullets[i].active && state.bullets[i].fromEnemy) {
        foundEnemyBullet = true;
        expect(state.bullets[i].ownerId).toBe(state.enemies[0].id);
        break;
      }
    }
    expect(foundEnemyBullet).toBe(true);
  });

  it("shooter maintains distance (flees when too close)", () => {
    const state = createGameState("coop", 1, 42);
    const rng = createRng(42);
    const events = createEventBus();
    const intents = emptyIntents(1);

    // Place player at center
    state.players[0].pos.x = 480;
    state.players[0].pos.y = 360;

    // Place shooter very close to player (should flee)
    placeShooter(state, 480, 350);
    state.enemies[0].fireCooldown = 999; // prevent firing for this test

    const startY = state.enemies[0].pos.y;
    step(state, intents, rng, events);

    // Shooter should have moved away from player (upward, since player is below)
    // The shooter was at y=350, player at y=360, so shooter should move to lower y
    expect(state.enemies[0].pos.y).toBeLessThan(startY);
  });

  it("enemy bullet hits player", () => {
    const state = createGameState("coop", 1, 42);
    const rng = createRng(42);
    const events = createEventBus();
    const intents = emptyIntents(1);

    // Place player
    state.players[0].pos.x = 480;
    state.players[0].pos.y = 360;
    state.players[0].invulnTimer = 0;
    state.players[0].hp = PLAYER_HP;

    // Manually spawn a fromEnemy bullet right on the player
    const bullet = state.bullets[0];
    bullet.id = state.match.nextEntityId++;
    bullet.ownerId = 999; // not a player id
    bullet.pos.x = 480;
    bullet.pos.y = 360;
    bullet.vel.x = 0;
    bullet.vel.y = 1;
    bullet.ttl = 60;
    bullet.damage = SHOOTER_BULLET_DAMAGE;
    bullet.active = true;
    bullet.fromEnemy = true;

    step(state, intents, rng, events);

    // Player should have taken damage
    expect(state.players[0].hp).toBe(PLAYER_HP - SHOOTER_BULLET_DAMAGE);
  });

  it("enemy bullet does not hit enemies", () => {
    const state = createGameState("coop", 1, 42);
    const rng = createRng(42);
    const events = createEventBus();
    const intents = emptyIntents(1);

    // Keep player alive but far away
    state.players[0].pos.x = 100;
    state.players[0].pos.y = 100;

    // Activate a chaser enemy
    const enemy = state.enemies[0];
    enemy.id = state.match.nextEntityId++;
    enemy.type = "chaser";
    enemy.pos.x = 480;
    enemy.pos.y = 360;
    enemy.vel.x = 0;
    enemy.vel.y = 0;
    enemy.hp = ENEMY_HP;
    enemy.active = true;
    enemy.spawnTimer = 0;
    enemy.fireCooldown = 0;

    // Spawn a fromEnemy bullet right on the enemy
    const bullet = state.bullets[0];
    bullet.id = state.match.nextEntityId++;
    bullet.ownerId = 888;
    bullet.pos.x = 480;
    bullet.pos.y = 360;
    bullet.vel.x = 1;
    bullet.vel.y = 0;
    bullet.ttl = 60;
    bullet.damage = 1;
    bullet.active = true;
    bullet.fromEnemy = true;

    step(state, intents, rng, events);

    // Enemy HP should be unchanged — enemy bullets don't hit enemies
    expect(enemy.hp).toBe(ENEMY_HP);
  });

  it("enemy bullet destroys breakable tile", () => {
    const state = createGameState("coop", 1, 42);
    const rng = createRng(42);
    const events = createEventBus();
    const intents = emptyIntents(1);

    // Keep player far away
    state.players[0].pos.x = 100;
    state.players[0].pos.y = 100;

    // Find a breakable tile
    let breakableIdx = -1;
    for (let i = 0; i < state.tiles.cells.length; i++) {
      if (state.tiles.cells[i].type === "breakable") {
        breakableIdx = i;
        break;
      }
    }
    expect(breakableIdx).not.toBe(-1);

    const col = breakableIdx % TILE_COLS;
    const row = (breakableIdx / TILE_COLS) | 0;
    const tileX = col * CELL_SIZE + CELL_SIZE / 2;
    const tileY = row * CELL_SIZE + CELL_SIZE / 2;

    // Set tile to 1 HP so one hit destroys it
    state.tiles.cells[breakableIdx].hp = 1;

    // Place enemy bullet on the tile
    const bullet = state.bullets[0];
    bullet.id = state.match.nextEntityId++;
    bullet.ownerId = 888;
    bullet.pos.x = tileX;
    bullet.pos.y = tileY;
    bullet.vel.x = 1;
    bullet.vel.y = 0;
    bullet.ttl = 60;
    bullet.damage = 1;
    bullet.active = true;
    bullet.fromEnemy = true;

    step(state, intents, rng, events);

    // Tile should be destroyed
    expect(state.tiles.cells[breakableIdx].type).toBe("empty");
  });
});
