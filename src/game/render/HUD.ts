import Phaser from "phaser";
import type { GameState } from "../../core/state/Types";
import { ARENA_WIDTH, ARENA_HEIGHT, REVIVE_RADIUS } from "../../core/state/Defaults";

const HUD_DEPTH = 10;
const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: "16px",
  color: "#ffffff",
  fontFamily: "monospace",
};

export class HUD {
  private livesText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private revivePrompt!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private gameOverScore!: Phaser.GameObjects.Text;

  create(scene: Phaser.Scene): void {
    this.livesText = scene.add.text(8, 4, "", TEXT_STYLE).setDepth(HUD_DEPTH);
    this.scoreText = scene.add.text(ARENA_WIDTH - 8, 4, "", TEXT_STYLE)
      .setOrigin(1, 0)
      .setDepth(HUD_DEPTH);

    this.revivePrompt = scene.add.text(0, 0, "[E] Revive", {
      fontSize: "12px",
      color: "#2ecc71",
      fontFamily: "monospace",
    })
      .setOrigin(0.5)
      .setDepth(HUD_DEPTH)
      .setVisible(false);

    const cx = ARENA_WIDTH / 2;
    const cy = ARENA_HEIGHT / 2;

    this.gameOverText = scene.add.text(cx, cy - 20, "GAME OVER", {
      fontSize: "48px",
      color: "#e74c3c",
      fontFamily: "monospace",
    })
      .setOrigin(0.5)
      .setDepth(HUD_DEPTH)
      .setVisible(false);

    this.gameOverScore = scene.add.text(cx, cy + 30, "", {
      fontSize: "20px",
      color: "#ffffff",
      fontFamily: "monospace",
    })
      .setOrigin(0.5)
      .setDepth(HUD_DEPTH)
      .setVisible(false);
  }

  update(state: GameState): void {
    if (state.match.mode === "coop") {
      this.livesText.setText(`LIVES: ${state.match.sharedLives}`);
      this.scoreText.setText(`SCORE: ${state.match.score}`);
      this.livesText.setVisible(true);
      this.scoreText.setVisible(true);
    } else {
      this.livesText.setVisible(false);
      this.scoreText.setVisible(false);
    }

    // Revive prompt: show near downed teammates when player 0 is alive and in range
    let showPrompt = false;
    const p0 = state.players[0];
    if (p0 && p0.alive && !p0.downed && state.match.mode === "coop") {
      for (let i = 1; i < state.players.length; i++) {
        const other = state.players[i];
        if (!other.downed) continue;
        const dx = p0.pos.x - other.pos.x;
        const dy = p0.pos.y - other.pos.y;
        if (dx * dx + dy * dy <= REVIVE_RADIUS * REVIVE_RADIUS) {
          this.revivePrompt.setPosition(other.pos.x, other.pos.y - 28);
          showPrompt = true;
          break;
        }
      }
    }
    this.revivePrompt.setVisible(showPrompt);

    // Game over
    if (state.match.gameOver) {
      this.gameOverText.setVisible(true);
      this.gameOverScore.setText(`FINAL SCORE: ${state.match.score}`);
      this.gameOverScore.setVisible(true);
    }
  }
}
