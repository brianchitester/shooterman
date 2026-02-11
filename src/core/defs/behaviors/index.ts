import type { EnemyBehavior } from "../EnemyBehavior";
import { chaseBehavior } from "./chase";
import { strafeShootBehavior } from "./strafeShoot";
import { orbitBehavior } from "./orbit";
import { spinChaseBehavior } from "./spinChase";

const BEHAVIOR_REGISTRY: Record<string, EnemyBehavior> = {};

function register(b: EnemyBehavior): void {
  BEHAVIOR_REGISTRY[b.id] = b;
}

// Register all built-in behaviors
register(chaseBehavior);
register(strafeShootBehavior);
register(orbitBehavior);
register(spinChaseBehavior);

export function getBehavior(id: string): EnemyBehavior {
  const b = BEHAVIOR_REGISTRY[id];
  if (!b) throw new Error(`Unknown enemy behavior: "${id}"`);
  return b;
}

export function registerBehavior(b: EnemyBehavior): void {
  register(b);
}
