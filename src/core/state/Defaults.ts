// Timing
export const TICKS_PER_SECOND = 60;

// Viewport (canvas size — maps may be equal or smaller)
export const ARENA_WIDTH = 960;
export const ARENA_HEIGHT = 720;

// Map layout constants now in src/core/defs/maps.ts (MapDef)

// Pool sizes
export const MAX_PLAYERS = 7;
export const MAX_BULLETS = 256;
export const MAX_ENEMIES = 100;

// Player balance
export const PLAYER_HP = 3;
export const PLAYER_MOVE_SPEED = 250; // px/s
export const DOWNED_CRAWL_SPEED = 75; // px/s (30% of normal)

// Collision radii
export const PLAYER_RADIUS = 16;
// Enemy radius now per-type via EnemyDef.colliderRadius
export const BULLET_RADIUS = 4;

// Player bullet balance now in src/core/defs/weapons.ts (WeaponDef)

// Enemy balance — per-type stats are now in src/core/defs/enemies.ts (EnemyDef)
export const ENEMY_CONTACT_DAMAGE = 2; // kept for test backward compat; prefer EnemyDef.contactDamage
export const PLAYER_KNOCKBACK = 12; // px, PvP bullet hit knockback

// Tile balance
export const BREAKABLE_TILE_HP = 2;

// PvP match
export const PVP_MATCH_DURATION = 7200; // ticks (120s × 60)

// Respawn / invuln
export const PVP_RESPAWN_DELAY = 30; // ticks (0.5s)
export const SPAWN_INVULN_DURATION = 90; // ticks (1.5s)
export const HIT_IFRAMES = 6; // ticks (0.1s)

// Co-op downed / revive
export const DOWNED_BLEEDOUT_TIMER = 480; // ticks (8.0s)
export const REVIVE_HOLD_TIME = 90; // ticks (1.5s)
export const REVIVE_RADIUS = 56; // px (~1.2 tiles)

// Co-op shared lives: 3 + (playerCount - 1)
export const SHARED_LIVES_BASE = 3;

// Enemy spawn scaling
export const SPAWN_SAFETY_DISTANCE = 150; // px
export const SPAWN_TELEGRAPH_TICKS = 30; // ticks (0.5s)
export const SPAWN_RATE_BASE_INTERVAL = 180; // ticks (3s) at t=0
export const SPAWN_RATE_MIN_INTERVAL = 60; // ticks (1s) at t=60s
export const SPAWN_RAMP_DURATION = 3600; // ticks (60s) over which spawn rate ramps
export const ENEMY_CAP_BASE = 5;
export const ENEMY_CAP_PER_PLAYER = 3;

