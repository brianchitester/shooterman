import type { EnemyBehavior } from "../EnemyBehavior";
import { resolveCircleTile } from "../../sim/tileCollision";
import { spawnBullet } from "../../sim/systems/spawnBullet";
import { findNearestPlayer } from "../../sim/systems/enemyUtils";

/** Strafe-shooter: maintain preferred range, strafe perpendicular, fire periodically. */
export const strafeShootBehavior: EnemyBehavior = {
  id: "strafe_shoot",
  update(enemy, def, state, dt) {
    const target = findNearestPlayer(enemy, state);
    if (!target) {
      enemy.vel.x = 0;
      enemy.vel.y = 0;
      return;
    }

    const dx = target.x - enemy.pos.x;
    const dy = target.y - enemy.pos.y;
    const dist = target.dist;
    const ranged = def.ranged!;

    // Movement: maintain preferred range
    let moveX = 0;
    let moveY = 0;

    if (dist > 1) {
      const dirX = dx / dist;
      const dirY = dy / dist;

      if (dist < ranged.preferredRange * 0.8) {
        // Too close — flee
        moveX = -dirX;
        moveY = -dirY;
      } else if (dist > ranged.preferredRange * 1.2) {
        // Too far — approach
        moveX = dirX;
        moveY = dirY;
      } else {
        // In range — strafe perpendicular
        moveX = -dirY;
        moveY = dirX;
      }

      enemy.vel.x = moveX * enemy.moveSpeed;
      enemy.vel.y = moveY * enemy.moveSpeed;
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

    // Fire cooldown
    if (enemy.fireCooldown > 0) {
      enemy.fireCooldown--;
    }

    // Shoot at target when cooldown is ready
    if (enemy.fireCooldown <= 0 && dist > 1) {
      const aimX = dx / dist;
      const aimY = dy / dist;

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
