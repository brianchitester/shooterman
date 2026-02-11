import type { WeaponDef } from "./WeaponDef";

export const WEAPON_AUTO: WeaponDef = {
  id: "auto",
  name: "Pistol",
  fireRate: 20,        // ticks (3 shots/sec)
  bulletSpeed: 600,    // px/s
  bulletTTL: 60,       // ticks (1.0s)
  bulletDamage: 1,
  projectileCount: 1,
  spreadAngle: 0,
  pierceCount: 0,
};

export const WEAPON_MACHINE_GUN: WeaponDef = {
  id: "machine_gun",
  name: "Machine Gun",
  fireRate: 6,         // ticks (10 shots/sec)
  bulletSpeed: 650,    // px/s
  bulletTTL: 50,       // ticks (~0.83s)
  bulletDamage: 1,
  projectileCount: 1,
  spreadAngle: 0,
  pierceCount: 0,
};

export const WEAPON_SHOTGUN: WeaponDef = {
  id: "shotgun",
  name: "Shotgun",
  fireRate: 30,        // ticks (2 shots/sec)
  bulletSpeed: 500,    // px/s
  bulletTTL: 20,       // ticks (~0.33s) — short range
  bulletDamage: 1,
  projectileCount: 3,
  spreadAngle: Math.PI / 6, // 30 degrees
  pierceCount: 0,
};

export const WEAPON_AUTO_SHOTGUN: WeaponDef = {
  id: "auto_shotgun",
  name: "Auto Shotgun",
  fireRate: 12,        // ticks (5 shots/sec)
  bulletSpeed: 500,    // px/s
  bulletTTL: 18,       // ticks (0.3s) — short range
  bulletDamage: 1,
  projectileCount: 3,
  spreadAngle: Math.PI / 5, // 36 degrees — slightly wider
  pierceCount: 0,
};

export const WEAPON_UZI: WeaponDef = {
  id: "uzi",
  name: "Uzi",
  fireRate: 4,         // ticks (15 shots/sec)
  bulletSpeed: 550,    // px/s
  bulletTTL: 25,       // ticks (~0.42s) — short range
  bulletDamage: 1,
  projectileCount: 1,
  spreadAngle: 0,
  pierceCount: 0,
};

export const WEAPON_RIFLE: WeaponDef = {
  id: "rifle",
  name: "Rifle",
  fireRate: 60,        // ticks (1 shot/sec)
  bulletSpeed: 900,    // px/s
  bulletTTL: 90,       // ticks (1.5s) — long range
  bulletDamage: 3,
  projectileCount: 1,
  spreadAngle: 0,
  pierceCount: 2,      // passes through 2 entities
};

// Legacy defs kept for compatibility
export const WEAPON_SPREAD: WeaponDef = {
  id: "spread",
  name: "Spread",
  fireRate: 24,
  bulletSpeed: 500,
  bulletTTL: 40,
  bulletDamage: 1,
  projectileCount: 5,
  spreadAngle: Math.PI / 6,
  pierceCount: 0,
};

export const WEAPON_EXPLOSIVE: WeaponDef = {
  id: "explosive",
  name: "Explosive",
  fireRate: 45,
  bulletSpeed: 400,
  bulletTTL: 90,
  bulletDamage: 3,
  projectileCount: 1,
  spreadAngle: 0,
  pierceCount: 0,
};

// Weapons available in lobby selection (ordered)
export const WEAPON_LIST: ReadonlyArray<WeaponDef> = [
  WEAPON_AUTO, WEAPON_MACHINE_GUN, WEAPON_SHOTGUN,
  WEAPON_AUTO_SHOTGUN, WEAPON_UZI, WEAPON_RIFLE,
];

export const WEAPON_REGISTRY: Record<string, WeaponDef> = {};
for (const w of WEAPON_LIST) {
  WEAPON_REGISTRY[w.id] = w;
}
// Also register legacy defs
WEAPON_REGISTRY[WEAPON_SPREAD.id] = WEAPON_SPREAD;
WEAPON_REGISTRY[WEAPON_EXPLOSIVE.id] = WEAPON_EXPLOSIVE;

export function getWeaponDef(id: string): WeaponDef {
  return WEAPON_REGISTRY[id] ?? WEAPON_AUTO;
}
