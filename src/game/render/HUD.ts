import Phaser from "phaser";
import type { GameState } from "../../core/state/Types";
import { ARENA_WIDTH, REVIVE_RADIUS, TICKS_PER_SECOND, PVP_MATCH_DURATION, MAX_PLAYERS } from "../../core/state/Defaults";
import { PLAYER_COLORS } from "./RenderFactories";

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
  private timerText!: Phaser.GameObjects.Text;
  private pvpScoreTexts: Phaser.GameObjects.Text[] = [];

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

    // PVP timer — centered top
    this.timerText = scene.add.text(ARENA_WIDTH / 2, 4, "", {
      fontSize: "20px",
      color: "#ffffff",
      fontFamily: "monospace",
    })
      .setOrigin(0.5, 0)
      .setDepth(HUD_DEPTH)
      .setVisible(false);

    // PVP scoreboard — 7 pre-allocated slots, top-left
    this.pvpScoreTexts = [];
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const t = scene.add.text(8, 28 + i * 18, "", {
        fontSize: "14px",
        color: "#ffffff",
        fontFamily: "monospace",
      })
        .setDepth(HUD_DEPTH)
        .setVisible(false);
      this.pvpScoreTexts.push(t);
    }
  }

  update(state: GameState): void {
    if (state.match.mode === "coop") {
      this.livesText.setText(`LIVES: ${state.match.sharedLives}`);
      this.scoreText.setText(`SCORE: ${state.match.score}`);
      this.livesText.setVisible(true);
      this.scoreText.setVisible(true);
      this.timerText.setVisible(false);
      for (let i = 0; i < this.pvpScoreTexts.length; i++) {
        this.pvpScoreTexts[i].setVisible(false);
      }
    } else {
      this.livesText.setVisible(false);
      this.scoreText.setVisible(false);

      // Countdown timer
      const remainTicks = Math.max(0, PVP_MATCH_DURATION - state.match.tick);
      const remainSec = Math.ceil(remainTicks / TICKS_PER_SECOND);
      const minutes = Math.floor(remainSec / 60);
      const seconds = remainSec % 60;
      this.timerText.setText(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      this.timerText.setVisible(true);

      // Scoreboard sorted by kills desc
      const sorted = state.players
        .map((p, _i) => ({ slot: p.slot, kills: p.kills }))
        .sort((a, b) => b.kills - a.kills);

      for (let i = 0; i < this.pvpScoreTexts.length; i++) {
        if (i < sorted.length) {
          const entry = sorted[i];
          this.pvpScoreTexts[i].setText(`P${entry.slot + 1}: ${entry.kills}`);
          const colorNum = PLAYER_COLORS[entry.slot % PLAYER_COLORS.length];
          this.pvpScoreTexts[i].setColor(`#${colorNum.toString(16).padStart(6, "0")}`);
          this.pvpScoreTexts[i].setVisible(true);
        } else {
          this.pvpScoreTexts[i].setVisible(false);
        }
      }
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
