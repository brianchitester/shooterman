import type { PlayerIntent, PlayerState } from "../../core/state/Types";
import { KeyboardMouseDevice } from "./KeyboardMouseDevice";

const EMPTY_INTENT: PlayerIntent = {
  move: { x: 0, y: 0 },
  aim: { x: 1, y: 0 },
  shoot: false,
  revive: false,
};

export class InputManager {
  private kbm: KeyboardMouseDevice;

  constructor(scene: Phaser.Scene) {
    this.kbm = new KeyboardMouseDevice(scene);
  }

  poll(players: PlayerState[]): PlayerIntent[] {
    const intents: PlayerIntent[] = [];
    for (let i = 0; i < players.length; i++) {
      if (i === 0) {
        intents[i] = this.kbm.poll(players[i].pos);
      } else {
        intents[i] = EMPTY_INTENT;
      }
    }
    return intents;
  }
}
