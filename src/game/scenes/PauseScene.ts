import Phaser from "phaser";

export class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: "PauseScene" });
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h / 2;

    // Semi-transparent backdrop
    this.add.rectangle(cx, cy, w, h, 0x000000, 0.6);

    this.add
      .text(cx, cy - 30, "PAUSED", {
        fontSize: "40px",
        color: "#ffffff",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy + 25, "Click to Resume", {
        fontSize: "18px",
        color: "#aaaaaa",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    const resume = () => {
      this.scene.resume("MatchScene");
      this.scene.stop();
    };

    this.input.once("pointerdown", resume);
    this.input.keyboard!.on("keydown-ESC", () => {
      // Use once-style by removing after first trigger
      this.input.keyboard!.removeAllListeners("keydown-ESC");
      resume();
    });
  }
}
