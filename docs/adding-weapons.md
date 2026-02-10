# Adding a New Weapon

This guide walks through adding a new weapon to the game. The weapon system is data-driven -- you define a weapon as a `WeaponDef` object and register it. The shooting system reads from the registry automatically.

## Quick Start

Open `src/core/defs/weapons.ts` and follow these 3 steps:

### 1. Define your weapon

```ts
export const WEAPON_SNIPER: WeaponDef = {
  id: "sniper",
  fireRate: 60,          // ticks between shots (1 shot/sec)
  bulletSpeed: 900,      // px/s (fast projectile)
  bulletTTL: 90,         // ticks (1.5s lifetime)
  bulletDamage: 3,       // one-shots most enemies
  projectileCount: 1,    // single bullet
  spreadAngle: 0,        // no spread
};
```

### 2. Add it to WEAPON_REGISTRY

```ts
export const WEAPON_REGISTRY: Record<string, WeaponDef> = {
  [WEAPON_AUTO.id]: WEAPON_AUTO,
  [WEAPON_SPREAD.id]: WEAPON_SPREAD,
  [WEAPON_EXPLOSIVE.id]: WEAPON_EXPLOSIVE,
  [WEAPON_SNIPER.id]: WEAPON_SNIPER,    // add this line
};
```

### 3. Assign it to a player

In the simulation, set `player.weaponId = "sniper"` to equip the weapon. The shooting system (`src/core/sim/systems/shooting.ts`) reads the player's `weaponId` each tick and looks up the `WeaponDef` from the registry.

Currently all players start with `"auto"`. To test your weapon, you can temporarily change the default in `src/core/state/GameState.ts` in the `createPlayer()` function, or build a pickup system that sets `player.weaponId` at runtime.

## WeaponDef Reference

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier, stored on player and bullet state |
| `fireRate` | `number` | Ticks between shots. Lower = faster. At 60 ticks/sec: 15 = 4 shots/sec, 60 = 1 shot/sec |
| `bulletSpeed` | `number` | Bullet travel speed in pixels per second |
| `bulletTTL` | `number` | Bullet lifetime in ticks. At 60 ticks/sec: 60 = 1 second range |
| `bulletDamage` | `number` | Damage per bullet hit. Standard enemies have 2 HP, shooters have 3 HP |
| `projectileCount` | `number` | Bullets fired per shot. 1 = single, 3+ = spread pattern |
| `spreadAngle` | `number` | Total arc in radians for multi-projectile spread. 0 = all bullets go straight |

## Existing Weapons

| Weapon | Fire Rate | Speed | TTL | Damage | Projectiles | Spread |
|--------|-----------|-------|-----|--------|-------------|--------|
| `auto` | 15 ticks (4/sec) | 600 px/s | 60 ticks (1s) | 1 | 1 | 0 |
| `spread` | 24 ticks (2.5/sec) | 500 px/s | 40 ticks (0.67s) | 1 | 5 | 30 deg |
| `explosive` | 45 ticks (1.3/sec) | 400 px/s | 90 ticks (1.5s) | 3 | 1 | 0 |

Note: `spread` and `explosive` are defined as data but not yet available to players in-game (no pickup system yet). They are ready to use once a pickup or loadout system is added.

## How Multi-Projectile Spread Works

When `projectileCount > 1`, the shooting system fans bullets evenly across the `spreadAngle` arc centered on the player's aim direction:

```
projectileCount: 5, spreadAngle: PI/6 (30 degrees)

        *         <- bullet 1 (aim - 15 deg)
       * *        <- bullets 2, 3
      *   *       <- bullets 4, 5 (aim + 15 deg)
       [P]        <- player aiming up
```

Each bullet gets the same speed, TTL, and damage. For a single projectile (`projectileCount: 1`), `spreadAngle` is ignored.

## Timing Reference

All timers use integer ticks. The simulation runs at 60 ticks per second.

| Ticks | Seconds | Use case |
|-------|---------|----------|
| 6 | 0.1s | Very fast (i-frames) |
| 15 | 0.25s | Fast fire rate |
| 30 | 0.5s | Medium fire rate |
| 60 | 1.0s | Slow fire rate |
| 90 | 1.5s | Very slow / long range |

## Balance Guidelines

- **DPS check**: `damage * (60 / fireRate)` gives damage per second. Auto = 4 DPS. Keep weapons in the 2-6 DPS range.
- **Range check**: `bulletSpeed * (bulletTTL / 60)` gives max range in pixels. Auto = 600px. The arena is 960x720, so anything over 800px crosses the whole map.
- **Spread weapons** trade accuracy for area coverage. Lower per-bullet damage or shorter range to compensate.
- **High-damage weapons** should fire slowly. A weapon that one-shots enemies (3+ damage) should have a fire rate of 45+ ticks.

## Testing Your Weapon

Add tests in `src/tests/weapons.test.ts`:

```ts
it("getWeaponDef('sniper') returns correct values", () => {
  const w = getWeaponDef("sniper");
  expect(w.id).toBe("sniper");
  expect(w.bulletDamage).toBe(3);
  expect(w.fireRate).toBe(60);
});
```

Run tests with `npm test`.

## Files Involved

| File | Role |
|------|------|
| `src/core/defs/WeaponDef.ts` | `WeaponDef` interface definition |
| `src/core/defs/weapons.ts` | All weapon definitions, registry, `getWeaponDef()` |
| `src/core/sim/systems/shooting.ts` | Reads `WeaponDef` to fire bullets |
| `src/core/sim/systems/spawnBullet.ts` | Shared helper that creates bullet entities |
| `src/tests/weapons.test.ts` | Weapon tests |
