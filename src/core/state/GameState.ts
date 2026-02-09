import type { GameState, PlayerState, BulletState, EnemyState, TileGrid, TileCell, Mode, MatchState } from "./Types";
import {
  ARENA_WIDTH, ARENA_HEIGHT, TILE_COLS, TILE_ROWS, CELL_SIZE,
  MAX_BULLETS, MAX_ENEMIES, PLAYER_HP, SHARED_LIVES_BASE, SPAWN_POINTS,
  BREAKABLE_TILE_HP,
} from "./Defaults";

function createPlayer(slot: number, nextEntityId: number): PlayerState {
  const spawn = SPAWN_POINTS[slot % SPAWN_POINTS.length];
  return {
    id: nextEntityId,
    slot,
    pos: { x: spawn.x, y: spawn.y },
    vel: { x: 0, y: 0 },
    aim: { x: 1, y: 0 },
    hp: PLAYER_HP,
    alive: true,
    downed: false,
    downedTimer: 0,
    reviveProgress: 0,
    reviverId: null,
    respawnTimer: 0,
    invulnTimer: 0,
    fireCooldown: 0,
    kills: 0,
    deaths: 0,
    team: 0,
  };
}

function createBulletSlot(): BulletState {
  return {
    id: 0,
    ownerId: 0,
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    ttl: 0,
    damage: 0,
    active: false,
    fromEnemy: false,
  };
}

function createEnemySlot(): EnemyState {
  return {
    id: 0,
    type: "chaser",
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    hp: 0,
    active: false,
    spawnTimer: 0,
    fireCooldown: 0,
    knockback: 0,
    score: 0,
  };
}

function createTileGrid(): TileGrid {
  const cells: TileCell[] = [];
  for (let row = 0; row < TILE_ROWS; row++) {
    for (let col = 0; col < TILE_COLS; col++) {
      // Border tiles are solid
      if (row === 0 || row === TILE_ROWS - 1 || col === 0 || col === TILE_COLS - 1) {
        cells[row * TILE_COLS + col] = { type: "solid", hp: 0 };
      }
      // Indestructible pillars at fixed symmetric positions
      else if (
        (row % 4 === 2 && col % 4 === 2) &&
        row > 1 && row < TILE_ROWS - 2 && col > 1 && col < TILE_COLS - 2
      ) {
        cells[row * TILE_COLS + col] = { type: "solid", hp: 0 };
      }
      // Breakable tiles in a pattern (~25%)
      else if ((row + col) % 3 === 0 && row > 1 && row < TILE_ROWS - 2 && col > 1 && col < TILE_COLS - 2) {
        cells[row * TILE_COLS + col] = { type: "breakable", hp: BREAKABLE_TILE_HP };
      }
      // Everything else is empty
      else {
        cells[row * TILE_COLS + col] = { type: "empty", hp: 0 };
      }
    }
  }
  return {
    width: TILE_COLS,
    height: TILE_ROWS,
    cellSize: CELL_SIZE,
    cells,
  };
}

export function createGameState(mode: Mode, playerCount: number, rngSeed: number): GameState {
  let nextEntityId = 1;

  const players: PlayerState[] = [];
  for (let i = 0; i < playerCount; i++) {
    players[i] = createPlayer(i, nextEntityId++);
  }

  const bullets: BulletState[] = [];
  for (let i = 0; i < MAX_BULLETS; i++) {
    bullets[i] = createBulletSlot();
  }

  const enemies: EnemyState[] = [];
  for (let i = 0; i < MAX_ENEMIES; i++) {
    enemies[i] = createEnemySlot();
  }

  const match: MatchState = {
    mode,
    tick: 0,
    sharedLives: mode === "coop" ? SHARED_LIVES_BASE + (playerCount - 1) : 0,
    score: 0,
    rngSeed,
    rngState: rngSeed,
    nextEntityId,
    gameOver: false,
    spawnCount: 0,
  };

  return {
    players,
    bullets,
    enemies,
    tiles: createTileGrid(),
    match,
  };
}

function cloneVec2(v: { x: number; y: number }): { x: number; y: number } {
  return { x: v.x, y: v.y };
}

export function cloneState(state: GameState): GameState {
  const players: PlayerState[] = [];
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i];
    players[i] = {
      ...p,
      pos: cloneVec2(p.pos),
      vel: cloneVec2(p.vel),
      aim: cloneVec2(p.aim),
    };
  }

  const bullets: BulletState[] = [];
  for (let i = 0; i < state.bullets.length; i++) {
    const b = state.bullets[i];
    bullets[i] = {
      ...b,
      pos: cloneVec2(b.pos),
      vel: cloneVec2(b.vel),
    };
  }

  const enemies: EnemyState[] = [];
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    enemies[i] = {
      ...e,
      pos: cloneVec2(e.pos),
      vel: cloneVec2(e.vel),
    };
  }

  const cells: TileCell[] = [];
  for (let i = 0; i < state.tiles.cells.length; i++) {
    const c = state.tiles.cells[i];
    cells[i] = { type: c.type, hp: c.hp };
  }

  return {
    players,
    bullets,
    enemies,
    tiles: {
      width: state.tiles.width,
      height: state.tiles.height,
      cellSize: state.tiles.cellSize,
      cells,
    },
    match: { ...state.match },
  };
}
