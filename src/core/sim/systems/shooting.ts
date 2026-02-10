import type { GameState, PlayerIntent } from "../../state/Types";
import type { SeededRng } from "../rng/seedRng";
import type { EventBus } from "../../events/EventBus";
import { getWeaponDef } from "../../defs/weapons";
import { spawnBullet } from "./spawnBullet";

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
        // Calculate angle offset for spread
        let aimX = player.aim.x;
        let aimY = player.aim.y;
        if (wep.projectileCount > 1 && wep.spreadAngle > 0) {
          const halfArc = wep.spreadAngle / 2;
          const step = wep.spreadAngle / (wep.projectileCount - 1);
          const angle = -halfArc + step * p;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          aimX = player.aim.x * cos - player.aim.y * sin;
          aimY = player.aim.x * sin + player.aim.y * cos;
        }

        const bullet = spawnBullet(
          state, player.id, player.pos,
          aimX, aimY,
          wep.bulletSpeed, wep.bulletTTL, wep.bulletDamage,
          false, player.weaponId,
        );
        if (bullet === null) break; // Pool exhausted

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
