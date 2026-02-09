import type { GameState, PlayerIntent } from "../../state/Types";
import type { SeededRng } from "../rng/seedRng";
import type { EventBus } from "../../events/EventBus";
import { BULLET_SPEED, BULLET_TTL, BULLET_DAMAGE, FIRE_COOLDOWN } from "../../state/Defaults";

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
      // Find an inactive bullet slot
      let slot = -1;
      for (let b = 0; b < state.bullets.length; b++) {
        if (!state.bullets[b].active) {
          slot = b;
          break;
        }
      }
      if (slot === -1) continue; // Pool exhausted

      const bullet = state.bullets[slot];
      bullet.id = state.match.nextEntityId++;
      bullet.ownerId = player.id;
      bullet.pos.x = player.pos.x;
      bullet.pos.y = player.pos.y;
      bullet.vel.x = player.aim.x * BULLET_SPEED;
      bullet.vel.y = player.aim.y * BULLET_SPEED;
      bullet.ttl = BULLET_TTL;
      bullet.damage = BULLET_DAMAGE;
      bullet.active = true;

      player.fireCooldown = FIRE_COOLDOWN;

      events.emit({
        type: "bullet_fired",
        bulletId: bullet.id,
        ownerId: player.id,
        pos: { x: bullet.pos.x, y: bullet.pos.y },
      });
    }
  }
}
