/** Static, read-only definition for an enemy type. No Phaser imports. */
export interface EnemyDef {
  id: string;              // unique key, e.g. "chaser", "shooter", "spinner"
  name: string;            // display name
  hp: number;
  moveSpeed: number;       // px/s
  contactDamage: number;   // damage dealt on touch (0 = no contact damage)
  colliderRadius: number;  // px — used for tile collision + enemy separation
  knockback: number;       // px pushed on bullet hit
  score: number;           // points on kill (co-op)

  // Ranged attack (optional). If absent, enemy is melee-only.
  ranged?: {
    fireRate: number;      // ticks between shots
    bulletSpeed: number;   // px/s
    bulletDamage: number;
    bulletTTL: number;     // ticks
    preferredRange: number; // px — AI distance target
    weaponId: string;      // used as bullet.weaponId for VFX lookup
  };

  // Rendering hints (core-safe, no Phaser types)
  visual: {
    shape: "circle" | "triangle" | "diamond" | "square";
    color: number;         // hex, e.g. 0x8b0000
    rotateToVelocity: boolean;
  };

  // Behavior function ID (dispatched by enemy system)
  behaviorId: string;      // key into BEHAVIOR_REGISTRY

  // Spawn weighting (higher = more common in spawn pool)
  spawnWeight: number;
  // Minimum match tick before this type can appear (0 = immediately)
  spawnAfterTick: number;
}
