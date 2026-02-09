import Phaser from "phaser";

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameOverScene" });
  }

  create(data: { score: number }): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h / 2;

    // Semi-transparent backdrop (same as PauseScene)
    this.add.rectangle(cx, cy, w, h, 0x000000, 0.6);

    this.add
      .text(cx, cy - 50, "GAME OVER", {
        fontSize: "48px",
        color: "#e74c3c",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy + 10, `FINAL SCORE: ${data.score}`, {
        fontSize: "20px",
        color: "#ffffff",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    const newGameText = this.add
      .text(cx, cy + 60, "New Game", {
        fontSize: "24px",
        color: "#2ecc71",
        fontFamily: "monospace",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    newGameText.on("pointerover", () => newGameText.setColor("#3dff8a"));
    newGameText.on("pointerout", () => newGameText.setColor("#2ecc71"));

    const startNewGame = () => {
      this.scene.stop("MatchScene");
      this.scene.stop();
      this.scene.start("MatchScene");
    };

    newGameText.on("pointerdown", startNewGame);
    this.input.keyboard!.once("keydown", startNewGame);
  }
}
