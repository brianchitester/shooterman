import { describe, it, expect } from "vitest";
import { getWeaponDef, WEAPON_AUTO, WEAPON_REGISTRY } from "../core/defs/weapons";
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
