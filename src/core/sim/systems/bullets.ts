import type { GameState } from "../../state/Types";

export function bulletSystem(state: GameState, dt: number): void {
  for (let i = 0; i < state.bullets.length; i++) {
    const bullet = state.bullets[i];
    if (!bullet.active) continue;

    // Integrate position
    bullet.pos.x += bullet.vel.x * dt;
    bullet.pos.y += bullet.vel.y * dt;

    // Decrement TTL
    bullet.ttl--;
    if (bullet.ttl <= 0) {
      bullet.active = false;
    }
  }
}
