export type EntityId = number;

export type DeviceType = "kbm" | "gamepad";

export interface DeviceAssignment {
  type: DeviceType;
  gamepadIndex: number; // -1 for kbm
}

export interface Vec2 {
  x: number;
  y: number;
}

export type Mode = "coop" | "pvp_time";

export type EnemyType = "chaser" | "shooter";

export interface PlayerState {
  id: EntityId;
  slot: number; // 0..6
  pos: Vec2;
  vel: Vec2;
  aim: Vec2; // normalized, fallback if stick is neutral
  hp: number;
  alive: boolean;
  downed: boolean; // co-op "downed" state
  downedTimer: number; // ticks remaining before bleed-out
  reviveProgress: number; // ticks of revive accumulated
  reviverId: EntityId | null;
  respawnTimer: number; // ticks
  invulnTimer: number; // ticks (cannot deal damage while > 0)
  fireCooldown: number; // ticks
  weaponId: string;
  kills: number;
  deaths: number;
  team: number;
}

export interface BulletState {
  id: EntityId;
  ownerId: EntityId;
  pos: Vec2;
  vel: Vec2;
  ttl: number; // ticks
  damage: number;
  active: boolean;
  fromEnemy: boolean;
  weaponId: string;
  pierceRemaining: number; // entities left to pass through (0 = normal)
  lastPierceId: EntityId;  // skip re-hitting this entity after pierce
}

export interface EnemyState {
  id: EntityId;
  type: EnemyType;
  pos: Vec2;
  vel: Vec2;
  hp: number;
  active: boolean;
  spawnTimer: number; // ticks remaining in telegraph (0 = fully spawned)
  fireCooldown: number; // ticks (0 for chasers, active for shooters)
  knockback: number; // px, instant push on bullet hit (per-type)
  score: number; // points awarded on kill (per-type)
}

export type TileType = "empty" | "solid" | "breakable";

export interface TileCell {
  type: TileType;
  hp: number;
}

export interface TileGrid {
  width: number;
  height: number;
  cellSize: number;
  cells: TileCell[]; // row-major
  spawnPoints: ReadonlyArray<{ x: number; y: number }>;
}

export interface MatchState {
  mode: Mode;
  tick: number;
  sharedLives: number;
  score: number;
  rngSeed: number;
  rngState: number;
  nextEntityId: number;
  mapId: string;
  gameOver: boolean;
  spawnCount: number;
}

export interface GameState {
  players: PlayerState[];
  bullets: BulletState[];
  enemies: EnemyState[];
  tiles: TileGrid;
  match: MatchState;
}

export interface PlayerIntent {
  move: Vec2;
  aim: Vec2;
  shoot: boolean;
  revive: boolean;
}
