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
  hp: 3,
  moveSpeed: 55,            // px/s — slow chase
  contactDamage: 1,
  colliderRadius: 10,
  knockback: 16,
  score: 200,
  ranged: {
    fireRate: 11,            // ticks — odd to avoid locking to cardinal directions
    bulletSpeed: 250,        // px/s — slower bullets for readability
    bulletDamage: 1,
    bulletTTL: 37,           // ticks (~0.6s) — short range ring
    preferredRange: 0,       // unused by spin_chase
    weaponId: "enemy_spinner",
  },
  visual: {
    shape: "diamond",
    color: 0x00bfff,         // deep sky blue
    rotateToVelocity: false, // spins independently of movement
  },
  behaviorId: "spin_chase",
  spawnWeight: 2,
  spawnAfterTick: 1800,     // appears after 30s
};

export const ENEMY_TERRAFORMER: EnemyDef = {
  id: "terraformer",
  name: "Terraformer",
  hp: 4,
  moveSpeed: 70,             // px/s — slow, deliberate
  contactDamage: 1,
  colliderRadius: 10,
  knockback: 8,              // low (heavy)
  score: 300,
  trail: {
    tileHp: 1,               // fragile — 1 bullet to destroy
    cooldownTicks: 6,         // ~10 tiles/sec max
    maxTrailTiles: 15,        // FIFO cap; oldest auto-decays
    playerSafeRadius: 24,     // ~2 cells, won't trap players
  },
  visual: {
    shape: "square",
    color: 0x2d8659,          // green — "builder" feel
    rotateToVelocity: false,
  },
  behaviorId: "chase",
  spawnWeight: 2,
  spawnAfterTick: 2400,       // appears after 40s
};

export const ENEMY_LIST: ReadonlyArray<EnemyDef> = [
  ENEMY_CHASER,
  ENEMY_SHOOTER,
  ENEMY_SPINNER,
  ENEMY_TERRAFORMER,
];

export const ENEMY_REGISTRY: Record<string, EnemyDef> = {};
for (const e of ENEMY_LIST) {
  ENEMY_REGISTRY[e.id] = e;
}

export function getEnemyDef(id: string): EnemyDef {
  const def = ENEMY_REGISTRY[id];
  if (!def) throw new Error(`Unknown enemy: "${id}"`);
  return def;
}
