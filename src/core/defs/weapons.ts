import type { WeaponDef } from "./WeaponDef";

export const WEAPON_AUTO: WeaponDef = {
  id: "auto",
  fireRate: 15,        // ticks (4 shots/sec)
  bulletSpeed: 600,    // px/s
  bulletTTL: 60,       // ticks (1.0s)
  bulletDamage: 1,
  projectileCount: 1,
  spreadAngle: 0,
};

export const WEAPON_SPREAD: WeaponDef = {
  id: "spread",
  fireRate: 24,        // ticks (~2.5 shots/sec)
  bulletSpeed: 500,    // px/s
  bulletTTL: 40,       // ticks (~0.67s)
  bulletDamage: 1,
  projectileCount: 5,
  spreadAngle: Math.PI / 6, // 30 degrees total arc
};

export const WEAPON_EXPLOSIVE: WeaponDef = {
  id: "explosive",
  fireRate: 45,        // ticks (~1.3 shots/sec)
  bulletSpeed: 400,    // px/s
  bulletTTL: 90,       // ticks (1.5s)
  bulletDamage: 3,
  projectileCount: 1,
  spreadAngle: 0,
};

export const WEAPON_REGISTRY: Record<string, WeaponDef> = {
  [WEAPON_AUTO.id]: WEAPON_AUTO,
  [WEAPON_SPREAD.id]: WEAPON_SPREAD,
  [WEAPON_EXPLOSIVE.id]: WEAPON_EXPLOSIVE,
};

export function getWeaponDef(id: string): WeaponDef {
  return WEAPON_REGISTRY[id] ?? WEAPON_AUTO;
}
