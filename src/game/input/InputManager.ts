import type { PlayerIntent, GameState, DeviceAssignment } from "../../core/state/Types";
import { KeyboardMouseDevice } from "./KeyboardMouseDevice";
import { GamepadDevice } from "./GamepadDevice";
import { botPoll } from "./BotIntent";

const EMPTY_INTENT: PlayerIntent = {
  move: { x: 0, y: 0 },
  aim: { x: 1, y: 0 },
  shoot: false,
  revive: false,
};

export class InputManager {
  private scene: Phaser.Scene;
  private kbm: KeyboardMouseDevice;
  private gamepad: GamepadDevice;
  private assignments: DeviceAssignment[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.kbm = new KeyboardMouseDevice(scene);
    this.gamepad = new GamepadDevice(scene);
  }

  setAssignments(a: DeviceAssignment[]): void {
    this.assignments = a;
  }

  getAssignments(): DeviceAssignment[] {
    return this.assignments;
  }

  poll(state: GameState): PlayerIntent[] {
    const intents: PlayerIntent[] = [];
    for (let i = 0; i < state.players.length; i++) {
      const assignment = this.assignments[i];
      if (!assignment) {
        intents[i] = EMPTY_INTENT;
      } else if (assignment.type === "kbm") {
        intents[i] = this.kbm.poll(state.players[i].pos);
      } else if (assignment.type === "cpu") {
        intents[i] = botPoll(state, i);
      } else {
        intents[i] = this.gamepad.pollByIndex(assignment.gamepadIndex) ?? EMPTY_INTENT;
      }
    }
    return intents;
  }

  /** Check if an unassigned device has a button/key pressed. Returns the assignment or null. */
  detectUnassignedPress(): DeviceAssignment | null {
    // Check all connected gamepads
    if (this.scene.input.gamepad) {
      const pads = this.scene.input.gamepad.gamepads;
      if (pads.length > 0) {
        for (let gi = 0; gi < pads.length; gi++) {
          if (!pads[gi] || !pads[gi].connected) continue;
          // Skip if already assigned
          let assigned = false;
          for (let a = 0; a < this.assignments.length; a++) {
            if (this.assignments[a].type === "gamepad" && this.assignments[a].gamepadIndex === gi) {
              assigned = true;
              break;
            }
          }
          if (assigned) continue;
          if (this.gamepad.isAnyButtonPressed(gi)) {
            return { type: "gamepad", gamepadIndex: gi };
          }
        }
      }
    }

    // Check KB/M — if not already assigned and any movement key pressed
    let kbmAssigned = false;
    for (let a = 0; a < this.assignments.length; a++) {
      if (this.assignments[a].type === "kbm") {
        kbmAssigned = true;
        break;
      }
    }
    if (!kbmAssigned) {
      const kbmIntent = this.kbm.poll({ x: 0, y: 0 });
      if (kbmIntent.move.x !== 0 || kbmIntent.move.y !== 0 || kbmIntent.shoot || kbmIntent.revive) {
        return { type: "kbm", gamepadIndex: -1 };
      }
    }

    return null;
  }
}
