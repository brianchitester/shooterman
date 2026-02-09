import type { PlayerIntent, Vec2 } from "../../core/state/Types";

export class KeyboardMouseDevice {
  private scene: Phaser.Scene;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const kb = scene.input.keyboard!;
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyE = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keySpace = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  poll(playerPos: Vec2): PlayerIntent {
    // Movement
    let mx = 0;
    let my = 0;
    if (this.keyA.isDown) mx -= 1;
    if (this.keyD.isDown) mx += 1;
    if (this.keyW.isDown) my -= 1;
    if (this.keyS.isDown) my += 1;

    // Normalize diagonal
    if (mx !== 0 && my !== 0) {
      const inv = 1 / Math.SQRT2;
      mx *= inv;
      my *= inv;
    }

    // Aim towards mouse
    const pointer = this.scene.input.activePointer;
    let ax = pointer.worldX - playerPos.x;
    let ay = pointer.worldY - playerPos.y;
    const len = Math.sqrt(ax * ax + ay * ay);
    if (len > 0.001) {
      ax /= len;
      ay /= len;
    } else {
      ax = 1;
      ay = 0;
    }

    // Shoot
    const shoot = pointer.isDown || this.keySpace.isDown;

    // Revive
    const revive = this.keyE.isDown;

    return {
      move: { x: mx, y: my },
      aim: { x: ax, y: ay },
      shoot,
      revive,
    };
  }
}
