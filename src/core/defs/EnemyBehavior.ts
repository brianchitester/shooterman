import type { EnemyState, GameState } from "../state/Types";
import type { EnemyDef } from "./EnemyDef";
import type { EventBus } from "../events/EventBus";

/** Pure function that updates one enemy per tick. No Phaser imports. */
export type EnemyUpdateFn = (
  enemy: EnemyState,
  def: EnemyDef,
  state: GameState,
  dt: number,
  events: EventBus,
) => void;

export interface EnemyBehavior {
  id: string;
  update: EnemyUpdateFn;
}
