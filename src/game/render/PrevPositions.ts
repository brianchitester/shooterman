import type { GameState } from "../../core/state/Types";
import { MAX_PLAYERS, MAX_BULLETS, MAX_ENEMIES } from "../../core/state/Defaults";

export interface PosSnapshot {
  x: number;
  y: number;
}

export interface PrevPositions {
  players: PosSnapshot[];
  bullets: PosSnapshot[];
  enemies: PosSnapshot[];
}

/** Pre-allocate once — reused every frame. */
export function createPrevPositions(): PrevPositions {
  const players: PosSnapshot[] = [];
  for (let i = 0; i < MAX_PLAYERS; i++) {
    players[i] = { x: 0, y: 0 };
  }
  const bullets: PosSnapshot[] = [];
  for (let i = 0; i < MAX_BULLETS; i++) {
    bullets[i] = { x: 0, y: 0 };
  }
  const enemies: PosSnapshot[] = [];
  for (let i = 0; i < MAX_ENEMIES; i++) {
    enemies[i] = { x: 0, y: 0 };
  }
  return { players, bullets, enemies };
}

/** Snapshot current positions into the pre-allocated structure. Zero allocations. */
export function snapshotPositions(state: GameState, out: PrevPositions): void {
  for (let i = 0; i < state.players.length; i++) {
    out.players[i].x = state.players[i].pos.x;
    out.players[i].y = state.players[i].pos.y;
  }
  for (let i = 0; i < state.bullets.length; i++) {
    out.bullets[i].x = state.bullets[i].pos.x;
    out.bullets[i].y = state.bullets[i].pos.y;
  }
  for (let i = 0; i < state.enemies.length; i++) {
    out.enemies[i].x = state.enemies[i].pos.x;
    out.enemies[i].y = state.enemies[i].pos.y;
  }
}
