import type { EnemyBehavior } from "../EnemyBehavior";
import { resolveCircleTile } from "../../sim/tileCollision";
import { findNearestPlayer } from "../../sim/systems/enemyUtils";

/** Chaser: beeline toward nearest player at moveSpeed. */
export const chaseBehavior: EnemyBehavior = {
  id: "chase",
  update(enemy, _def, state, dt) {
    const target = findNearestPlayer(enemy, state);
    if (!target) {
      enemy.vel.x = 0;
      enemy.vel.y = 0;
      return;
    }

    const dx = target.x - enemy.pos.x;
    const dy = target.y - enemy.pos.y;
    if (target.dist > 1) {
      enemy.vel.x = (dx / target.dist) * enemy.moveSpeed;
      enemy.vel.y = (dy / target.dist) * enemy.moveSpeed;
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
