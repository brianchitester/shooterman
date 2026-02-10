// Arena layout
export const TICKS_PER_SECOND = 60;
export const ARENA_WIDTH = 960;
export const ARENA_HEIGHT = 720;
export const TILE_COLS = 20;
export const TILE_ROWS = 15;
export const CELL_SIZE = 48;

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
export const ENEMY_RADIUS = 16;
export const BULLET_RADIUS = 4;

// Player bullet balance now in src/core/defs/weapons.ts (WeaponDef)

// Enemy balance
export const ENEMY_HP = 2;
export const ENEMY_CONTACT_DAMAGE = 2;
export const CHASER_MOVE_SPEED = 120; // px/s
export const CHASER_KNOCKBACK = 24; // px, instant push on bullet hit
export const CHASER_SCORE = 100;

// Shooter enemy balance
export const SHOOTER_MOVE_SPEED = 80; // px/s
export const SHOOTER_HP = 3;
export const SHOOTER_PREFERRED_RANGE = 200; // px
export const SHOOTER_FIRE_COOLDOWN = 90; // ticks (1.5s)
export const SHOOTER_BULLET_SPEED = 350; // px/s
export const SHOOTER_BULLET_DAMAGE = 1;
export const SHOOTER_BULLET_TTL = 90; // ticks (1.5s)
export const SHOOTER_KNOCKBACK = 12; // px, less knockback than chaser (heavier)
export const PLAYER_KNOCKBACK = 12; // px, PvP bullet hit knockback
export const SHOOTER_SCORE = 200; // tougher enemy, worth more
export const SHOOTER_SPAWN_INTERVAL = 10; // every 10th spawn

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

// Spawn points (7 pre-defined positions along arena edges)
export const SPAWN_POINTS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 96, y: 48 },    // top-left
  { x: 480, y: 48 },   // top-center
  { x: 864, y: 48 },   // top-right
  { x: 48, y: 360 },   // mid-left
  { x: 912, y: 360 },  // mid-right
  { x: 192, y: 672 },  // bottom-left
  { x: 768, y: 672 },  // bottom-right
];
