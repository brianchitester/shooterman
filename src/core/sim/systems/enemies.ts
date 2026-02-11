import type { GameState } from "../../state/Types";
import type { EventBus } from "../../events/EventBus";
import { getEnemyDef } from "../../defs/enemies";
import { getBehavior } from "../../defs/behaviors/index";

export function enemyAISystem(state: GameState, dt: number, events: EventBus): void {
  for (let e = 0; e < state.enemies.length; e++) {
    const enemy = state.enemies[e];
    if (!enemy.active) continue;

    // Tick down spawn telegraph
    if (enemy.spawnTimer > 0) {
      enemy.spawnTimer--;
      continue; // Don't move or act while telegraphing
    }

    const def = getEnemyDef(enemy.typeId);
    const behavior = getBehavior(def.behaviorId);
    behavior.update(enemy, def, state, dt, events);
  }

  // Enemy-enemy separation: push overlapping enemies apart
  for (let i = 0; i < state.enemies.length; i++) {
    const a = state.enemies[i];
    if (!a.active || a.spawnTimer > 0) continue;
    for (let j = i + 1; j < state.enemies.length; j++) {
      const b = state.enemies[j];
      if (!b.active || b.spawnTimer > 0) continue;

      const sepDist = a.colliderRadius + b.colliderRadius;
      const sepDistSq = sepDist * sepDist;
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
