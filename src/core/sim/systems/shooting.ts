import type { GameState, PlayerIntent } from "../../state/Types";
import type { SeededRng } from "../rng/seedRng";
import type { EventBus } from "../../events/EventBus";
import { getWeaponDef } from "../../defs/weapons";

export function shootingSystem(
  state: GameState,
  intents: PlayerIntent[],
  dt: number,
  rng: SeededRng,
  events: EventBus,
): void {
  for (let i = 0; i < state.players.length; i++) {
    const player = state.players[i];

    // Decrement fire cooldown
    if (player.fireCooldown > 0) {
      player.fireCooldown--;
    }

    if (!player.alive || player.downed) continue;

    const intent = intents[i];
    if (intent === undefined) continue;

    // Cannot shoot while invulnerable
    if (player.invulnTimer > 0) continue;

    if (intent.shoot && player.fireCooldown <= 0) {
      const wep = getWeaponDef(player.weaponId);

      for (let p = 0; p < wep.projectileCount; p++) {
        // Find an inactive bullet slot
        let slot = -1;
        for (let b = 0; b < state.bullets.length; b++) {
          if (!state.bullets[b].active) {
            slot = b;
            break;
          }
        }
        if (slot === -1) break; // Pool exhausted

        // Calculate angle offset for spread
        let aimX = player.aim.x;
        let aimY = player.aim.y;
        if (wep.projectileCount > 1 && wep.spreadAngle > 0) {
          const halfArc = wep.spreadAngle / 2;
          const step = wep.spreadAngle / (wep.projectileCount - 1);
          const angle = -halfArc + step * p;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const rx = player.aim.x * cos - player.aim.y * sin;
          const ry = player.aim.x * sin + player.aim.y * cos;
          aimX = rx;
          aimY = ry;
        }

        const bullet = state.bullets[slot];
        bullet.id = state.match.nextEntityId++;
        bullet.ownerId = player.id;
        bullet.pos.x = player.pos.x;
        bullet.pos.y = player.pos.y;
        bullet.vel.x = aimX * wep.bulletSpeed;
        bullet.vel.y = aimY * wep.bulletSpeed;
        bullet.ttl = wep.bulletTTL;
        bullet.damage = wep.bulletDamage;
        bullet.active = true;
        bullet.fromEnemy = false;
        bullet.weaponId = player.weaponId;

        events.emit({
          type: "bullet_fired",
          bulletId: bullet.id,
          ownerId: player.id,
          pos: { x: bullet.pos.x, y: bullet.pos.y },
        });
      }

      player.fireCooldown = wep.fireRate;
    }
  }
}
