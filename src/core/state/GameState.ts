import type { GameState, PlayerState, BulletState, EnemyState, TileGrid, TileCell, Mode, MatchState } from "./Types";
import type { MapDef } from "../defs/MapDef";
import { MAP_ARENA } from "../defs/maps";
import {
  MAX_BULLETS, MAX_ENEMIES, PLAYER_HP, SHARED_LIVES_BASE,
  BREAKABLE_TILE_HP, SPAWN_INVULN_DURATION,
} from "./Defaults";

export function createPlayer(
  slot: number,
  nextEntityId: number,
  spawnPoints: ReadonlyArray<{ x: number; y: number }>,
): PlayerState {
  const spawn = spawnPoints[slot % spawnPoints.length];
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
    weaponId: "auto",
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
    weaponId: "auto",
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

function buildTileGrid(mapDef: MapDef): TileGrid {
  const cells: TileCell[] = [];
  for (let i = 0; i < mapDef.cells.length; i++) {
    const t = mapDef.cells[i];
    switch (t) {
      case "solid":
        cells[i] = { type: "solid", hp: 0 };
        break;
      case "breakable":
        cells[i] = { type: "breakable", hp: BREAKABLE_TILE_HP };
        break;
      default:
        cells[i] = { type: "empty", hp: 0 };
        break;
    }
  }
  return {
    width: mapDef.cols,
    height: mapDef.rows,
    cellSize: mapDef.cellSize,
    cells,
    spawnPoints: mapDef.spawnPoints,
  };
}

export function createGameState(
  mode: Mode,
  playerCount: number,
  rngSeed: number,
  mapDef: MapDef = MAP_ARENA,
): GameState {
  let nextEntityId = 1;

  const tiles = buildTileGrid(mapDef);

  const players: PlayerState[] = [];
  for (let i = 0; i < playerCount; i++) {
    players[i] = createPlayer(i, nextEntityId++, tiles.spawnPoints);
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
    mapId: mapDef.id,
    gameOver: false,
    spawnCount: 0,
  };

  return {
    players,
    bullets,
    enemies,
    tiles,
    match,
  };
}

export function addPlayerToState(state: GameState): PlayerState {
  const slot = state.players.length;
  const id = state.match.nextEntityId++;
  const player = createPlayer(slot, id, state.tiles.spawnPoints);
  player.invulnTimer = SPAWN_INVULN_DURATION;
  state.players.push(player);
  if (state.match.mode === "coop") {
    state.match.sharedLives += 1;
  }
  return player;
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
      spawnPoints: state.tiles.spawnPoints,
    },
    match: { ...state.match },
  };
}
