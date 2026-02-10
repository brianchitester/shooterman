import type { GameState, BulletState, EntityId, Vec2 } from "../../state/Types";

export function spawnBullet(
  state: GameState,
  ownerId: EntityId,
  pos: Vec2,
  aimX: number,
  aimY: number,
  speed: number,
  ttl: number,
  damage: number,
  fromEnemy: boolean,
  weaponId: string,
): BulletState | null {
  // Find inactive bullet slot
  let slot = -1;
  for (let b = 0; b < state.bullets.length; b++) {
    if (!state.bullets[b].active) {
      slot = b;
      break;
    }
  }
  if (slot === -1) return null; // Pool exhausted

  const bullet = state.bullets[slot];
  bullet.id = state.match.nextEntityId++;
  bullet.ownerId = ownerId;
  bullet.pos.x = pos.x;
  bullet.pos.y = pos.y;
  bullet.vel.x = aimX * speed;
  bullet.vel.y = aimY * speed;
  bullet.ttl = ttl;
  bullet.damage = damage;
  bullet.active = true;
  bullet.fromEnemy = fromEnemy;
  bullet.weaponId = weaponId;

  return bullet;
}
