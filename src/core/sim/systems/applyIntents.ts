import type { GameState, PlayerIntent } from "../../state/Types";
import { PLAYER_MOVE_SPEED, DOWNED_CRAWL_SPEED } from "../../state/Defaults";

export function applyIntents(state: GameState, intents: PlayerIntent[], dt: number): void {
  for (let i = 0; i < state.players.length; i++) {
    const player = state.players[i];
    if (!player.alive && !player.downed) continue;

    const intent = intents[i];
    if (intent === undefined) {
      player.vel.x = 0;
      player.vel.y = 0;
      continue;
    }

    // Movement — downed players crawl at reduced speed
    const speed = player.downed ? DOWNED_CRAWL_SPEED : PLAYER_MOVE_SPEED;
    const mx = intent.move.x;
    const my = intent.move.y;

    // Normalize if magnitude > 1
    const mag = Math.sqrt(mx * mx + my * my);
    if (mag > 0) {
      const invMag = mag > 1 ? 1 / mag : 1;
      player.vel.x = mx * invMag * speed;
      player.vel.y = my * invMag * speed;
    } else {
      player.vel.x = 0;
      player.vel.y = 0;
    }

    // Aim — update if stick is non-zero
    const ax = intent.aim.x;
    const ay = intent.aim.y;
    const aimMag = Math.sqrt(ax * ax + ay * ay);
    if (aimMag > 0.1) {
      player.aim.x = ax / aimMag;
      player.aim.y = ay / aimMag;
    }

    // Shoot intent is handled by shooting system (it reads intents directly)
    // Revive intent is handled by livesRespawn system
  }
}
