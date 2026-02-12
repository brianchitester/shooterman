import type { EnemyState, GameState } from "../../state/Types";
import type { EnemyDef } from "../../defs/EnemyDef";
import { SPAWN_TELEGRAPH_TICKS } from "../../state/Defaults";

/** Hydrate a pooled enemy slot from its definition. */
export function initEnemyFromDef(
  enemy: EnemyState,
  def: EnemyDef,
  spawnX: number,
  spawnY: number,
  state: GameState,
): void {
  enemy.id = state.match.nextEntityId++;
  enemy.typeId = def.id;
  enemy.pos.x = spawnX;
  enemy.pos.y = spawnY;
  enemy.vel.x = 0;
  enemy.vel.y = 0;
  enemy.hp = def.hp;
  enemy.active = true;
  enemy.spawnTimer = SPAWN_TELEGRAPH_TICKS;
  enemy.fireCooldown = def.ranged?.fireRate ?? 0;
  enemy.knockback = def.knockback;
  enemy.score = def.score;
  enemy.contactDamage = def.contactDamage;
  enemy.colliderRadius = def.colliderRadius;
  enemy.moveSpeed = def.moveSpeed;
  enemy.spinAngle = 0;
  enemy.trailCooldown = 0;
  enemy.trailLastCol = -1;
  enemy.trailLastRow = -1;
}
