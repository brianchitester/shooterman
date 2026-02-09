import type { GameState, EnemyState } from "../../state/Types";
import {
  CHASER_MOVE_SPEED,
  SHOOTER_MOVE_SPEED, SHOOTER_PREFERRED_RANGE, SHOOTER_FIRE_COOLDOWN,
  SHOOTER_BULLET_SPEED, SHOOTER_BULLET_DAMAGE, SHOOTER_BULLET_TTL,
} from "../../state/Defaults";
import { resolveCircleTile } from "../tileCollision";

const ENEMY_COLLIDER_RADIUS = 12;

/** Find nearest alive player. Returns target pos + distance, or null. */
function findNearestPlayer(
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

function updateChaser(enemy: EnemyState, state: GameState, dt: number): void {
  const target = findNearestPlayer(enemy, state);
  if (!target) {
    enemy.vel.x = 0;
    enemy.vel.y = 0;
    return;
  }

  const dx = target.x - enemy.pos.x;
  const dy = target.y - enemy.pos.y;
  if (target.dist > 1) {
    enemy.vel.x = (dx / target.dist) * CHASER_MOVE_SPEED;
    enemy.vel.y = (dy / target.dist) * CHASER_MOVE_SPEED;
  } else {
    enemy.vel.x = 0;
    enemy.vel.y = 0;
  }

  enemy.pos.x += enemy.vel.x * dt;
  enemy.pos.y += enemy.vel.y * dt;

  const resolved = resolveCircleTile(
    enemy.pos.x, enemy.pos.y, ENEMY_COLLIDER_RADIUS, state.tiles,
  );
  enemy.pos.x = resolved.x;
  enemy.pos.y = resolved.y;
}

function updateShooter(enemy: EnemyState, state: GameState, dt: number): void {
  const target = findNearestPlayer(enemy, state);
  if (!target) {
    enemy.vel.x = 0;
    enemy.vel.y = 0;
    return;
  }

  const dx = target.x - enemy.pos.x;
  const dy = target.y - enemy.pos.y;
  const dist = target.dist;

  // Movement: maintain preferred range
  let moveX = 0;
  let moveY = 0;

  if (dist > 1) {
    const dirX = dx / dist;
    const dirY = dy / dist;

    if (dist < SHOOTER_PREFERRED_RANGE * 0.8) {
      // Too close — flee
      moveX = -dirX;
      moveY = -dirY;
    } else if (dist > SHOOTER_PREFERRED_RANGE * 1.2) {
      // Too far — approach
      moveX = dirX;
      moveY = dirY;
    } else {
      // In range — strafe perpendicular
      moveX = -dirY;
      moveY = dirX;
    }

    enemy.vel.x = moveX * SHOOTER_MOVE_SPEED;
    enemy.vel.y = moveY * SHOOTER_MOVE_SPEED;
  } else {
    enemy.vel.x = 0;
    enemy.vel.y = 0;
  }

  enemy.pos.x += enemy.vel.x * dt;
  enemy.pos.y += enemy.vel.y * dt;

  const resolved = resolveCircleTile(
    enemy.pos.x, enemy.pos.y, ENEMY_COLLIDER_RADIUS, state.tiles,
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

    // Find inactive bullet slot
    let slot = -1;
    for (let b = 0; b < state.bullets.length; b++) {
      if (!state.bullets[b].active) {
        slot = b;
        break;
      }
    }

    if (slot !== -1) {
      const bullet = state.bullets[slot];
      bullet.id = state.match.nextEntityId++;
      bullet.ownerId = enemy.id;
      bullet.pos.x = enemy.pos.x;
      bullet.pos.y = enemy.pos.y;
      bullet.vel.x = aimX * SHOOTER_BULLET_SPEED;
      bullet.vel.y = aimY * SHOOTER_BULLET_SPEED;
      bullet.ttl = SHOOTER_BULLET_TTL;
      bullet.damage = SHOOTER_BULLET_DAMAGE;
      bullet.active = true;
      bullet.fromEnemy = true;

      enemy.fireCooldown = SHOOTER_FIRE_COOLDOWN;
    }
  }
}

export function enemyAISystem(state: GameState, dt: number): void {
  for (let e = 0; e < state.enemies.length; e++) {
    const enemy = state.enemies[e];
    if (!enemy.active) continue;

    // Tick down spawn telegraph
    if (enemy.spawnTimer > 0) {
      enemy.spawnTimer--;
      continue; // Don't move or act while telegraphing
    }

    switch (enemy.type) {
      case "chaser":
        updateChaser(enemy, state, dt);
        break;
      case "shooter":
        updateShooter(enemy, state, dt);
        break;
    }
  }

  // Enemy-enemy separation: push overlapping enemies apart
  const sepDist = ENEMY_COLLIDER_RADIUS * 2;
  const sepDistSq = sepDist * sepDist;
  for (let i = 0; i < state.enemies.length; i++) {
    const a = state.enemies[i];
    if (!a.active || a.spawnTimer > 0) continue;
    for (let j = i + 1; j < state.enemies.length; j++) {
      const b = state.enemies[j];
      if (!b.active || b.spawnTimer > 0) continue;

      const dx = b.pos.x - a.pos.x;
      const dy = b.pos.y - a.pos.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < sepDistSq && dSq > 0) {
        const d = Math.sqrt(dSq);
        const overlap = (sepDist - d) * 0.5;
        const nx = dx / d;
        const ny = dy / d;
        a.pos.x -= nx * overlap;
        a.pos.y -= ny * overlap;
        b.pos.x += nx * overlap;
        b.pos.y += ny * overlap;
      }
    }
  }
}
