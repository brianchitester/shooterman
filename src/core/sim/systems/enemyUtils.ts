import type { EnemyState, GameState } from "../../state/Types";

/** Find nearest alive player. Returns target pos + distance, or null. */
export function findNearestPlayer(
  enemy: EnemyState,
  state: GameState,
): { x: number; y: number; dist: number } | null {
  let nearestDistSq = Infinity;
  let nearestX = 0;
  let nearestY = 0;
  let hasTarget = false;

  for (let p = 0; p < state.players.length; p++) {
    const player = state.players[p];
    if (!player.alive) continue;

    const dx = player.pos.x - enemy.pos.x;
    const dy = player.pos.y - enemy.pos.y;
    const d = dx * dx + dy * dy;
    if (d < nearestDistSq) {
      nearestDistSq = d;
      nearestX = player.pos.x;
      nearestY = player.pos.y;
      hasTarget = true;
    }
  }

  if (!hasTarget) return null;
  return { x: nearestX, y: nearestY, dist: Math.sqrt(nearestDistSq) };
}
