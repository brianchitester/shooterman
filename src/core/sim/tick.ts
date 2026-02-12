import type { GameState, PlayerIntent } from "../state/Types";
import type { SeededRng } from "./rng/seedRng";
import type { EventBus } from "../events/EventBus";
import { DT } from "../state/Defaults";
import { applyIntents } from "./systems/applyIntents";
import { movementSystem } from "./systems/movement";
import { shootingSystem } from "./systems/shooting";
import { bulletSystem } from "./systems/bullets";
import { collisionSystem } from "./systems/collisions";
import { enemyAISystem } from "./systems/enemies";
import { trailSystem } from "./systems/trail";
import { spawnSystem } from "./systems/spawns";
import { livesRespawnSystem } from "./systems/livesRespawn";
import { modeRulesSystem } from "./systems/modeRules";

export function step(
  state: GameState,
  intents: PlayerIntent[],
  rng: SeededRng,
  events: EventBus,
): void {
  if (state.match.gameOver) return;

  applyIntents(state, intents, DT);
  movementSystem(state, DT);
  shootingSystem(state, intents, DT, rng, events);
  bulletSystem(state, DT);
  collisionSystem(state, events);
  enemyAISystem(state, DT, events);
  trailSystem(state, events);
  spawnSystem(state, DT, rng, events);
  livesRespawnSystem(state, intents, DT, events);
  modeRulesSystem(state, DT);

  // Sync RNG state back to match for determinism snapshot
  state.match.rngState = rng.state();
  state.match.tick++;
}
