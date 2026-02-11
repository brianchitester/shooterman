import { describe, it, expect } from "vitest";
import {
  getWeaponDef, WEAPON_AUTO, WEAPON_MACHINE_GUN, WEAPON_SHOTGUN,
  WEAPON_AUTO_SHOTGUN, WEAPON_UZI, WEAPON_RIFLE, WEAPON_LIST, WEAPON_REGISTRY,
} from "../core/defs/weapons";
import { createGameState } from "../core/state/GameState";
import { createRng } from "../core/sim/rng/seedRng";
import { createEventBus } from "../core/events/EventBus";
import { step } from "../core/sim/tick";
import type { PlayerIntent } from "../core/state/Types";

describe("WeaponDef registry", () => {
  it("getWeaponDef('auto') returns WEAPON_AUTO", () => {
    const wep = getWeaponDef("auto");
    expect(wep).toBe(WEAPON_AUTO);
    expect(wep.fireRate).toBe(15);
    expect(wep.bulletSpeed).toBe(600);
    expect(wep.bulletTTL).toBe(60);
    expect(wep.bulletDamage).toBe(1);
    expect(wep.projectileCount).toBe(1);
    expect(wep.spreadAngle).toBe(0);
  });

  it("getWeaponDef('unknown') falls back to auto", () => {
    const wep = getWeaponDef("unknown");
    expect(wep).toBe(WEAPON_AUTO);
  });

  it("getWeaponDef('spread') returns spread weapon", () => {
    const wep = getWeaponDef("spread");
    expect(wep.id).toBe("spread");
    expect(wep.projectileCount).toBe(5);
    expect(wep.spreadAngle).toBeGreaterThan(0);
  });

  it("all registry entries have matching id", () => {
    for (const [key, def] of Object.entries(WEAPON_REGISTRY)) {
      expect(def.id).toBe(key);
    }
  });
});

describe("shooting with auto weapon", () => {
  it("produces a bullet with correct speed/ttl/damage", () => {
    const state = createGameState("coop", 1, 42);
    const rng = createRng(42);
    const events = createEventBus();

    // Clear invuln so player can fire
    state.players[0].invulnTimer = 0;

    const intents: PlayerIntent[] = [
      { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, shoot: true, revive: false },
    ];

    step(state, intents, rng, events);

    // Find the active bullet
    let bullet = null;
    for (let i = 0; i < state.bullets.length; i++) {
      if (state.bullets[i].active) {
        bullet = state.bullets[i];
        break;
      }
    }
    expect(bullet).not.toBeNull();
    expect(bullet!.vel.x).toBe(WEAPON_AUTO.bulletSpeed);
    expect(bullet!.vel.y).toBe(0);
    expect(bullet!.damage).toBe(WEAPON_AUTO.bulletDamage);
    expect(bullet!.weaponId).toBe("auto");
    // TTL decremented once by bulletSystem in the same tick
    expect(bullet!.ttl).toBe(WEAPON_AUTO.bulletTTL - 1);
  });

  it("sets fire cooldown to weapon fireRate", () => {
    const state = createGameState("coop", 1, 42);
    const rng = createRng(42);
    const events = createEventBus();

    state.players[0].invulnTimer = 0;

    const intents: PlayerIntent[] = [
      { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, shoot: true, revive: false },
    ];

    step(state, intents, rng, events);

    expect(state.players[0].fireCooldown).toBe(WEAPON_AUTO.fireRate);
  });
});

describe("new weapon definitions", () => {
  it("WEAPON_LIST contains 6 selectable weapons", () => {
    expect(WEAPON_LIST.length).toBe(6);
  });

  it("all weapons have unique ids and names", () => {
    const ids = WEAPON_LIST.map(w => w.id);
    const names = WEAPON_LIST.map(w => w.name);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it("all weapons are in registry", () => {
    for (const w of WEAPON_LIST) {
      expect(getWeaponDef(w.id)).toBe(w);
    }
  });

  it("machine gun has faster fire rate than auto", () => {
    expect(WEAPON_MACHINE_GUN.fireRate).toBeLessThan(WEAPON_AUTO.fireRate);
  });

  it("shotgun fires 3 projectiles with spread", () => {
    expect(WEAPON_SHOTGUN.projectileCount).toBe(3);
    expect(WEAPON_SHOTGUN.spreadAngle).toBeGreaterThan(0);
  });

  it("auto shotgun is rapid-fire shotgun", () => {
    expect(WEAPON_AUTO_SHOTGUN.projectileCount).toBe(3);
    expect(WEAPON_AUTO_SHOTGUN.fireRate).toBeLessThan(WEAPON_SHOTGUN.fireRate);
  });

  it("uzi has very fast fire rate and short range", () => {
    expect(WEAPON_UZI.fireRate).toBeLessThan(WEAPON_MACHINE_GUN.fireRate);
    expect(WEAPON_UZI.bulletTTL).toBeLessThan(WEAPON_AUTO.bulletTTL);
  });

  it("rifle has high damage, slow fire, and pierce", () => {
    expect(WEAPON_RIFLE.bulletDamage).toBe(3);
    expect(WEAPON_RIFLE.fireRate).toBeGreaterThan(WEAPON_AUTO.fireRate);
    expect(WEAPON_RIFLE.pierceCount).toBe(2);
  });
});

describe("pierce behavior", () => {
  it("rifle bullet passes through first enemy and hits second", () => {
    const state = createGameState("coop", 1, 42);
    const rng = createRng(42);
    const events = createEventBus();

    // Clear all tiles so bullet path is unobstructed
    for (let i = 0; i < state.tiles.cells.length; i++) {
      state.tiles.cells[i].type = "empty";
      state.tiles.cells[i].hp = 0;
    }

    // Place player far left, aiming right
    state.players[0].pos.x = 100;
    state.players[0].pos.y = 100;
    state.players[0].invulnTimer = 0;
    state.players[0].weaponId = "rifle";

    // Place two enemies in a line to the right
    const e1 = state.enemies[0];
    e1.id = state.match.nextEntityId++;
    e1.typeId = "chaser";
    e1.pos.x = 200;
    e1.pos.y = 100;
    e1.hp = 10; // high HP so they survive
    e1.active = true;
    e1.spawnTimer = 0;
    e1.knockback = 0;
    e1.score = 100;
    e1.contactDamage = 2;
    e1.colliderRadius = 12;
    e1.moveSpeed = 120;

    const e2 = state.enemies[1];
    e2.id = state.match.nextEntityId++;
    e2.typeId = "chaser";
    e2.pos.x = 250;
    e2.pos.y = 100;
    e2.hp = 10;
    e2.active = true;
    e2.spawnTimer = 0;
    e2.knockback = 0;
    e2.score = 100;
    e2.contactDamage = 2;
    e2.colliderRadius = 12;
    e2.moveSpeed = 120;

    // Fire
    const intents: PlayerIntent[] = [
      { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, shoot: true, revive: false },
    ];

    // Run enough ticks for bullet to reach both enemies
    for (let t = 0; t < 30; t++) {
      step(state, intents, rng, events);
      events.drain();
    }

    // Both enemies should have taken damage
    expect(e1.hp).toBeLessThan(10);
    expect(e2.hp).toBeLessThan(10);
  });

  it("normal bullet is consumed on first enemy hit", () => {
    const state = createGameState("coop", 1, 42);
    const rng = createRng(42);
    const events = createEventBus();

    // Clear all tiles so bullet path is unobstructed
    for (let i = 0; i < state.tiles.cells.length; i++) {
      state.tiles.cells[i].type = "empty";
      state.tiles.cells[i].hp = 0;
    }

    state.players[0].pos.x = 100;
    state.players[0].pos.y = 100;
    state.players[0].invulnTimer = 0;
    state.players[0].weaponId = "auto"; // pierceCount = 0

    // Place two enemies in a line
    const e1 = state.enemies[0];
    e1.id = state.match.nextEntityId++;
    e1.typeId = "chaser";
    e1.pos.x = 200;
    e1.pos.y = 100;
    e1.hp = 10;
    e1.active = true;
    e1.spawnTimer = 0;
    e1.knockback = 0;
    e1.score = 100;
    e1.contactDamage = 2;
    e1.colliderRadius = 12;
    e1.moveSpeed = 120;

    const e2 = state.enemies[1];
    e2.id = state.match.nextEntityId++;
    e2.typeId = "chaser";
    e2.pos.x = 250;
    e2.pos.y = 100;
    e2.hp = 10;
    e2.active = true;
    e2.spawnTimer = 0;
    e2.knockback = 0;
    e2.score = 100;
    e2.contactDamage = 2;
    e2.colliderRadius = 12;
    e2.moveSpeed = 120;

    const intents: PlayerIntent[] = [
      { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, shoot: true, revive: false },
    ];

    for (let t = 0; t < 30; t++) {
      step(state, intents, rng, events);
      events.drain();
    }

    // Only first enemy should be hit (bullet consumed)
    expect(e1.hp).toBeLessThan(10);
    expect(e2.hp).toBe(10);
  });
});
