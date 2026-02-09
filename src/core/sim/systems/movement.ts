import type { GameState } from "../../state/Types";
import { ARENA_WIDTH, ARENA_HEIGHT, CELL_SIZE } from "../../state/Defaults";
import { resolveCircleTile } from "../tileCollision";

const PLAYER_COLLIDER_RADIUS = 14;

export function movementSystem(state: GameState, dt: number): void {
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
    const minX = CELL_SIZE;
    const minY = CELL_SIZE;
    const maxX = ARENA_WIDTH - CELL_SIZE;
    const maxY = ARENA_HEIGHT - CELL_SIZE;

    if (player.pos.x < minX) player.pos.x = minX;
    if (player.pos.x > maxX) player.pos.x = maxX;
    if (player.pos.y < minY) player.pos.y = minY;
    if (player.pos.y > maxY) player.pos.y = maxY;
  }
}
