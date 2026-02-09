import Phaser from "phaser";
import type { GameState } from "../../core/state/Types";
import { ARENA_WIDTH, REVIVE_RADIUS } from "../../core/state/Defaults";

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

    // Revive prompt: show near first downed teammate in range of any alive player
    let showPrompt = false;
    if (state.match.mode === "coop") {
      for (let d = 0; d < state.players.length && !showPrompt; d++) {
        const downed = state.players[d];
        if (!downed.downed) continue;
        for (let r = 0; r < state.players.length; r++) {
          if (r === d) continue;
          const rescuer = state.players[r];
          if (!rescuer.alive || rescuer.downed) continue;
          const dx = rescuer.pos.x - downed.pos.x;
          const dy = rescuer.pos.y - downed.pos.y;
          if (dx * dx + dy * dy <= REVIVE_RADIUS * REVIVE_RADIUS) {
            this.revivePrompt.setPosition(downed.pos.x, downed.pos.y - 28);
            showPrompt = true;
            break;
          }
        }
      }
    }
    this.revivePrompt.setVisible(showPrompt);
  }
}
