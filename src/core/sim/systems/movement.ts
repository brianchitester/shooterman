import type { GameState } from "../../state/Types";
import { resolveCircleTile } from "../tileCollision";

const PLAYER_COLLIDER_RADIUS = 14;

export function movementSystem(state: GameState, dt: number): void {
  const cellSize = state.tiles.cellSize;
  const arenaW = state.tiles.width * cellSize;
  const arenaH = state.tiles.height * cellSize;

  for (let i = 0; i < state.players.length; i++) {
    const player = state.players[i];
    if (!player.alive && !player.downed) continue;

    player.pos.x += player.vel.x * dt;
    player.pos.y += player.vel.y * dt;

    // Resolve tile collisions (solid + breakable)
    const resolved = resolveCircleTile(
      player.pos.x, player.pos.y, PLAYER_COLLIDER_RADIUS, state.tiles,
    );
    player.pos.x = resolved.x;
    player.pos.y = resolved.y;

    // Clamp to arena bounds (inside the border tiles)
    const minX = cellSize;
    const minY = cellSize;
    const maxX = arenaW - cellSize;
    const maxY = arenaH - cellSize;

    if (player.pos.x < minX) player.pos.x = minX;
    if (player.pos.x > maxX) player.pos.x = maxX;
    if (player.pos.y < minY) player.pos.y = minY;
    if (player.pos.y > maxY) player.pos.y = maxY;
  }
}
