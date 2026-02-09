import type { GameState } from "../../state/Types";
import type { EventBus } from "../../events/EventBus";
import { ENEMY_CONTACT_DAMAGE, HIT_IFRAMES, CELL_SIZE, TILE_COLS, TILE_ROWS, DOWNED_BLEEDOUT_TIMER, PVP_RESPAWN_DELAY } from "../../state/Defaults";

// Simple circle collision radius (half a cell)
const PLAYER_RADIUS = 16;
const ENEMY_RADIUS = 16;
const BULLET_RADIUS = 4;

function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function collisionSystem(state: GameState, events: EventBus): void {
  // Process bullets by array index for deterministic ordering
  for (let b = 0; b < state.bullets.length; b++) {
    const bullet = state.bullets[b];
    if (!bullet.active) continue;

    let consumed = false;

    // 1) Bullets vs Enemies — enemy bullets skip this entirely
    if (!bullet.fromEnemy) {
      for (let e = 0; e < state.enemies.length; e++) {
        if (consumed) break;
        const enemy = state.enemies[e];
        if (!enemy.active || enemy.spawnTimer > 0) continue;

        const hitDist = BULLET_RADIUS + ENEMY_RADIUS;
        if (distSq(bullet.pos.x, bullet.pos.y, enemy.pos.x, enemy.pos.y) < hitDist * hitDist) {
          enemy.hp -= bullet.damage;

          // Knockback: instant position push along bullet direction
          const bvLen = Math.sqrt(bullet.vel.x * bullet.vel.x + bullet.vel.y * bullet.vel.y);
          if (bvLen > 0 && enemy.knockback > 0) {
            enemy.pos.x += (bullet.vel.x / bvLen) * enemy.knockback;
            enemy.pos.y += (bullet.vel.y / bvLen) * enemy.knockback;
          }

          events.emit({
            type: "hit_enemy",
            bulletId: bullet.id,
            enemyId: enemy.id,
            damage: bullet.damage,
          });

          if (enemy.hp <= 0) {
            enemy.active = false;
            events.emit({
              type: "enemy_killed",
              enemyId: enemy.id,
              killerBulletOwnerId: bullet.ownerId,
            });

            // Award score in co-op, kills in PvP
            if (state.match.mode === "coop") {
              state.match.score += enemy.score;
            } else {
              // Find the bullet owner and credit the kill
              for (let p = 0; p < state.players.length; p++) {
                if (state.players[p].id === bullet.ownerId) {
                  state.players[p].kills++;
                  break;
                }
              }
            }
          }

          bullet.active = false;
          consumed = true;
        }
      }
    }
    if (consumed) continue;

    // 2) Bullets vs Players
    for (let p = 0; p < state.players.length; p++) {
      if (consumed) break;
      const player = state.players[p];
      if (!player.alive) continue;

      if (bullet.fromEnemy) {
        // Enemy bullets always hit players (skip self-damage and friendly-fire checks)
        // Still respect invuln timer
        if (player.invulnTimer > 0) continue;
      } else {
        // No self-damage
        if (player.id === bullet.ownerId) continue;
        // Co-op: friendly fire OFF (all teammates)
        if (state.match.mode === "coop") continue;
        // PvP: invulnerable players are immune
        if (player.invulnTimer > 0) continue;
      }

      const hitDist = BULLET_RADIUS + PLAYER_RADIUS;
      if (distSq(bullet.pos.x, bullet.pos.y, player.pos.x, player.pos.y) < hitDist * hitDist) {
        player.hp -= bullet.damage;
        events.emit({
          type: "hit_player",
          bulletId: bullet.id,
          playerId: player.id,
          damage: bullet.damage,
        });

        if (player.hp <= 0) {
          player.hp = 0;
          if (state.match.mode === "coop") {
            // Co-op: player goes downed instead of dying immediately
            player.downed = true;
            player.alive = false;
            player.downedTimer = DOWNED_BLEEDOUT_TIMER;
            events.emit({
              type: "player_downed",
              playerId: player.id,
              pos: { x: player.pos.x, y: player.pos.y },
            });
          } else {
            player.alive = false;
            player.deaths++;
            player.respawnTimer = PVP_RESPAWN_DELAY;

            // Credit killer (only for player bullets)
            if (!bullet.fromEnemy) {
              for (let k = 0; k < state.players.length; k++) {
                if (state.players[k].id === bullet.ownerId) {
                  state.players[k].kills++;
                  break;
                }
              }
            }
          }
        }

        bullet.active = false;
        consumed = true;
      }
    }
    if (consumed) continue;

    // 3) Bullets vs Tiles (both player and enemy bullets)
    const cellX = (bullet.pos.x / CELL_SIZE) | 0;
    const cellY = (bullet.pos.y / CELL_SIZE) | 0;
    if (cellX >= 0 && cellX < TILE_COLS && cellY >= 0 && cellY < TILE_ROWS) {
      const idx = cellY * TILE_COLS + cellX;
      const tile = state.tiles.cells[idx];
      if (tile.type === "breakable") {
        tile.hp -= bullet.damage;
        if (tile.hp <= 0) {
          tile.type = "empty";
          tile.hp = 0;
          events.emit({ type: "tile_destroyed", col: cellX, row: cellY });
        } else {
          events.emit({ type: "tile_damaged", col: cellX, row: cellY, remainingHp: tile.hp });
        }
        bullet.active = false;
        consumed = true;
      } else if (tile.type === "solid") {
        // Solid tiles absorb bullets but don't take damage
        bullet.active = false;
        consumed = true;
      }
    }
  }

  // 4) Enemies vs Players (contact damage)
  for (let e = 0; e < state.enemies.length; e++) {
    const enemy = state.enemies[e];
    if (!enemy.active || enemy.spawnTimer > 0) continue;

    for (let p = 0; p < state.players.length; p++) {
      const player = state.players[p];
      if (!player.alive) continue;
      if (player.invulnTimer > 0) continue;

      const contactDist = ENEMY_RADIUS + PLAYER_RADIUS;
      if (distSq(enemy.pos.x, enemy.pos.y, player.pos.x, player.pos.y) < contactDist * contactDist) {
        player.hp -= ENEMY_CONTACT_DAMAGE;
        player.invulnTimer = HIT_IFRAMES; // Brief i-frames after contact hit

        if (player.hp <= 0) {
          player.hp = 0;
          if (state.match.mode === "coop") {
            // Co-op: player goes downed instead of dying immediately
            player.downed = true;
            player.alive = false;
            player.downedTimer = DOWNED_BLEEDOUT_TIMER;
            events.emit({
              type: "player_downed",
              playerId: player.id,
              pos: { x: player.pos.x, y: player.pos.y },
            });
          } else {
            player.alive = false;
            player.deaths++;
            player.respawnTimer = PVP_RESPAWN_DELAY;
          }
        }
      }
    }
  }
}
