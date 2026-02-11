import type { EnemyBehavior } from "../EnemyBehavior";
import { resolveCircleTile } from "../../sim/tileCollision";
import { findNearestPlayer } from "../../sim/systems/enemyUtils";

const ORBIT_RADIUS = 120; // px — distance to orbit around player
const ORBIT_SPEED_FACTOR = 1.5; // tangential speed multiplier

/**
 * Orbit: circles the nearest player at a fixed radius.
 * If too far, approaches. If too close, backs off. When in range, orbits.
 */
export const orbitBehavior: EnemyBehavior = {
  id: "orbit",
  update(enemy, _def, state, dt) {
    const target = findNearestPlayer(enemy, state);
    if (!target) {
      enemy.vel.x = 0;
      enemy.vel.y = 0;
      return;
    }

    const dx = target.x - enemy.pos.x;
    const dy = target.y - enemy.pos.y;
    const dist = target.dist;

    let moveX = 0;
    let moveY = 0;

    if (dist > 1) {
      const dirX = dx / dist;
      const dirY = dy / dist;

      if (dist > ORBIT_RADIUS * 1.3) {
        // Too far — approach
        moveX = dirX;
        moveY = dirY;
      } else if (dist < ORBIT_RADIUS * 0.7) {
        // Too close — back off
        moveX = -dirX;
        moveY = -dirY;
      } else {
        // In range — orbit (perpendicular to target)
        moveX = -dirY * ORBIT_SPEED_FACTOR;
        moveY = dirX * ORBIT_SPEED_FACTOR;
      }

      const len = Math.sqrt(moveX * moveX + moveY * moveY);
      if (len > 0) {
        enemy.vel.x = (moveX / len) * enemy.moveSpeed;
        enemy.vel.y = (moveY / len) * enemy.moveSpeed;
      }
    } else {
      enemy.vel.x = 0;
      enemy.vel.y = 0;
    }

    enemy.pos.x += enemy.vel.x * dt;
    enemy.pos.y += enemy.vel.y * dt;

    const resolved = resolveCircleTile(
      enemy.pos.x, enemy.pos.y, enemy.colliderRadius, state.tiles,
    );
    enemy.pos.x = resolved.x;
    enemy.pos.y = resolved.y;
  },
};
