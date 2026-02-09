import type { PlayerIntent } from "../../core/state/Types";

const STICK_DEADZONE = 0.15;

export class GamepadDevice {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Returns the first connected gamepad, or null. */
  getPad(): Phaser.Input.Gamepad.Gamepad | null {
    if (!this.scene.input.gamepad) return null;
    const pads = this.scene.input.gamepad.gamepads;
    for (let i = 0; i < pads.length; i++) {
      if (pads[i] && pads[i].connected) return pads[i];
    }
    return null;
  }

  poll(): PlayerIntent | null {
    const pad = this.getPad();
    if (!pad) return null;

    // Left stick — movement
    let mx = pad.leftStick.x;
    let my = pad.leftStick.y;
    if (Math.abs(mx) < STICK_DEADZONE) mx = 0;
    if (Math.abs(my) < STICK_DEADZONE) my = 0;

    // Normalize if magnitude > 1
    const mLen = Math.sqrt(mx * mx + my * my);
    if (mLen > 1) {
      mx /= mLen;
      my /= mLen;
    }

    // Right stick — aim + auto-shoot
    let ax = pad.rightStick.x;
    let ay = pad.rightStick.y;
    const aLen = Math.sqrt(ax * ax + ay * ay);
    const shooting = aLen >= STICK_DEADZONE;

    if (shooting) {
      ax /= aLen;
      ay /= aLen;
    } else {
      // No aim input — keep a default aim direction (right)
      ax = 1;
      ay = 0;
    }

    // Revive — any face button (A/B/X/Y on Switch Pro = buttons 0-3)
    const revive = pad.A || pad.B || pad.X || pad.Y;

    return {
      move: { x: mx, y: my },
      aim: { x: ax, y: ay },
      shoot: shooting,
      revive,
    };
  }
}
