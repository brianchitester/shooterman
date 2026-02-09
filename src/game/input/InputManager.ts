import type { PlayerIntent, PlayerState } from "../../core/state/Types";
import { KeyboardMouseDevice } from "./KeyboardMouseDevice";
import { GamepadDevice } from "./GamepadDevice";

const EMPTY_INTENT: PlayerIntent = {
  move: { x: 0, y: 0 },
  aim: { x: 1, y: 0 },
  shoot: false,
  revive: false,
};

export class InputManager {
  private kbm: KeyboardMouseDevice;
  private gamepad: GamepadDevice;

  constructor(scene: Phaser.Scene) {
    this.kbm = new KeyboardMouseDevice(scene);
    this.gamepad = new GamepadDevice(scene);
  }

  poll(players: PlayerState[]): PlayerIntent[] {
    const intents: PlayerIntent[] = [];
    for (let i = 0; i < players.length; i++) {
      if (i === 0) {
        // Gamepad overrides keyboard when connected
        const gpIntent = this.gamepad.poll();
        intents[i] = gpIntent ?? this.kbm.poll(players[i].pos);
      } else {
        intents[i] = EMPTY_INTENT;
      }
    }
    return intents;
  }
}
