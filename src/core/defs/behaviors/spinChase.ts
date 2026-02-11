import type { EnemyBehavior } from "../EnemyBehavior";
import { resolveCircleTile } from "../../sim/tileCollision";
import { spawnBullet } from "../../sim/systems/spawnBullet";
import { findNearestPlayer } from "../../sim/systems/enemyUtils";

const SPIN_SPEED = Math.PI * 2.5; // radians/s — ~2.5 full rotations per second

/**
 * Spin-chase: slowly chases nearest player while firing bullets
 * in a continuously rotating circular pattern.
 */
export const spinChaseBehavior: EnemyBehavior = {
  id: "spin_chase",
  update(enemy, def, state, dt) {
    // --- Chase movement (same as chase behavior) ---
    const target = findNearestPlayer(enemy, state);
    if (!target) {
      enemy.vel.x = 0;
      enemy.vel.y = 0;
    } else {
      const dx = target.x - enemy.pos.x;
      const dy = target.y - enemy.pos.y;
      if (target.dist > 1) {
        enemy.vel.x = (dx / target.dist) * enemy.moveSpeed;
        enemy.vel.y = (dy / target.dist) * enemy.moveSpeed;
      } else {
        enemy.vel.x = 0;
        enemy.vel.y = 0;
      }
    }

    enemy.pos.x += enemy.vel.x * dt;
    enemy.pos.y += enemy.vel.y * dt;

    const resolved = resolveCircleTile(
      enemy.pos.x, enemy.pos.y, enemy.colliderRadius, state.tiles,
    );
    enemy.pos.x = resolved.x;
    enemy.pos.y = resolved.y;

    // --- Spinning fire ---
    enemy.spinAngle += SPIN_SPEED * dt;
    // Keep angle bounded to avoid precision drift
    if (enemy.spinAngle > Math.PI * 2) {
      enemy.spinAngle -= Math.PI * 2;
    }

    if (enemy.fireCooldown > 0) {
      enemy.fireCooldown--;
    }

    const ranged = def.ranged;
    if (ranged && enemy.fireCooldown <= 0) {
      const aimX = Math.cos(enemy.spinAngle);
      const aimY = Math.sin(enemy.spinAngle);

      const bullet = spawnBullet(
        state, enemy.id, enemy.pos,
        aimX, aimY,
        ranged.bulletSpeed, ranged.bulletTTL, ranged.bulletDamage,
        true, ranged.weaponId,
      );
      if (bullet !== null) {
        enemy.fireCooldown = ranged.fireRate;
      }
    }
  },
};
