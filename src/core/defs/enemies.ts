import type { EnemyDef } from "./EnemyDef";

export const ENEMY_CHASER: EnemyDef = {
  id: "chaser",
  name: "Chaser",
  hp: 2,
  moveSpeed: 120,          // px/s
  contactDamage: 2,
  colliderRadius: 12,      // px (tile collision + separation)
  knockback: 24,           // px
  score: 100,
  visual: {
    shape: "circle",
    color: 0x8b0000,       // dark red
    rotateToVelocity: false,
  },
  behaviorId: "chase",
  spawnWeight: 9,
  spawnAfterTick: 0,
};

export const ENEMY_SHOOTER: EnemyDef = {
  id: "shooter",
  name: "Shooter",
  hp: 3,
  moveSpeed: 80,           // px/s
  contactDamage: 2,
  colliderRadius: 12,
  knockback: 12,           // less knockback (heavier)
  score: 200,
  ranged: {
    fireRate: 90,           // ticks (1.5s)
    bulletSpeed: 350,       // px/s
    bulletDamage: 1,
    bulletTTL: 90,          // ticks (1.5s)
    preferredRange: 200,    // px
    weaponId: "enemy_shooter",
  },
  visual: {
    shape: "triangle",
    color: 0x6a0dad,        // purple
    rotateToVelocity: true,
  },
  behaviorId: "strafe_shoot",
  spawnWeight: 1,
  spawnAfterTick: 0,
};

export const ENEMY_SPINNER: EnemyDef = {
  id: "spinner",
  name: "Spinner",
  hp: 2,
  moveSpeed: 150,          // px/s — fast orbiter
  contactDamage: 1,        // lighter touch damage
  colliderRadius: 10,      // smaller
  knockback: 16,
  score: 150,
  visual: {
    shape: "diamond",
    color: 0x00bfff,        // deep sky blue
    rotateToVelocity: true,
  },
  behaviorId: "orbit",
  spawnWeight: 2,
  spawnAfterTick: 1800,    // appears after 30s
};

export const ENEMY_LIST: ReadonlyArray<EnemyDef> = [
  ENEMY_CHASER,
  ENEMY_SHOOTER,
  ENEMY_SPINNER,
];

export const ENEMY_REGISTRY: Record<string, EnemyDef> = {};
for (const e of ENEMY_LIST) {
  ENEMY_REGISTRY[e.id] = e;
}

export function getEnemyDef(id: string): EnemyDef {
  return ENEMY_REGISTRY[id] ?? ENEMY_CHASER;
}
