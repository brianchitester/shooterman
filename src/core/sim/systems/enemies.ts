import type { GameState } from "../../state/Types";
import { CHASER_MOVE_SPEED } from "../../state/Defaults";
import { resolveCircleTile } from "../tileCollision";

const ENEMY_COLLIDER_RADIUS = 12;

export function enemyAISystem(state: GameState, dt: number): void {
  for (let e = 0; e < state.enemies.length; e++) {
    const enemy = state.enemies[e];
    if (!enemy.active) continue;

    // Tick down spawn telegraph
    if (enemy.spawnTimer > 0) {
      enemy.spawnTimer--;
      continue; // Don't move or act while telegraphing
    }

    // Find nearest alive player
    let nearestDistSq = Infinity;
    let nearestX = enemy.pos.x;
    let nearestY = enemy.pos.y;
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

    if (!hasTarget) {
      enemy.vel.x = 0;
      enemy.vel.y = 0;
      continue;
    }

    // Steer toward target
    const dx = nearestX - enemy.pos.x;
    const dy = nearestY - enemy.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
      enemy.vel.x = (dx / dist) * CHASER_MOVE_SPEED;
      enemy.vel.y = (dy / dist) * CHASER_MOVE_SPEED;
    } else {
      enemy.vel.x = 0;
      enemy.vel.y = 0;
    }

    // Integrate position
    enemy.pos.x += enemy.vel.x * dt;
    enemy.pos.y += enemy.vel.y * dt;

    // Resolve tile collisions
    const resolved = resolveCircleTile(
      enemy.pos.x, enemy.pos.y, ENEMY_COLLIDER_RADIUS, state.tiles,
    );
    enemy.pos.x = resolved.x;
    enemy.pos.y = resolved.y;
  }
}
