import Phaser from "phaser";
import type { Mode } from "../../core/state/Types";
import { PLAYER_COLORS } from "../render/RenderFactories";

interface PvpPlayerResult {
  slot: number;
  kills: number;
  deaths: number;
  isCpu?: boolean;
}

interface GameOverData {
  mode: Mode;
  score: number;
  players: PvpPlayerResult[];
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameOverScene" });
  }

  create(data: GameOverData): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h / 2;

    // Semi-transparent backdrop (same as PauseScene)
    this.add.rectangle(cx, cy, w, h, 0x000000, 0.6);

    if (data.mode === "pvp_time") {
      this.createPvpResults(data, cx, cy);
    } else {
      this.createCoopResults(data, cx, cy);
    }

    const newGameText = this.add
      .text(cx, cy + 140, "New Game", {
        fontSize: "24px",
        color: "#2ecc71",
        fontFamily: "monospace",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    newGameText.on("pointerover", () => newGameText.setColor("#3dff8a"));
    newGameText.on("pointerout", () => newGameText.setColor("#2ecc71"));

    const startNewGame = () => {
      this.input.keyboard!.removeAllListeners();
      if (this.input.gamepad) this.input.gamepad.removeAllListeners();
      this.scene.stop("MatchScene");
      this.scene.stop();
      this.scene.start("LobbyScene");
    };

    newGameText.on("pointerdown", startNewGame);
    this.input.keyboard!.once("keydown", startNewGame);

    // Gamepad: face buttons (A/B/X/Y = 0-3) or Start (9)
    if (this.input.gamepad) {
      this.input.gamepad.on("down", (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
        if (button.index <= 3 || button.index === 9) startNewGame();
      });
    }
  }

  private createCoopResults(data: GameOverData, cx: number, cy: number): void {
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
  }

  private createPvpResults(data: GameOverData, cx: number, cy: number): void {
    this.add
      .text(cx, cy - 100, "TIME'S UP!", {
        fontSize: "48px",
        color: "#f1c40f",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // Sort by kills desc, tiebreak by fewest deaths
    const ranked = [...data.players].sort((a, b) => {
      if (b.kills !== a.kills) return b.kills - a.kills;
      return a.deaths - b.deaths;
    });

    const startY = cy - 40;
    for (let i = 0; i < ranked.length; i++) {
      const p = ranked[i];
      const colorNum = PLAYER_COLORS[p.slot % PLAYER_COLORS.length];
      const colorHex = `#${colorNum.toString(16).padStart(6, "0")}`;
      const isWinner = i === 0;

      const label = p.isCpu ? "CPU" : `P${p.slot + 1}`;
      const line = `${label}  ${p.kills} kills  ${p.deaths} deaths`;
      this.add
        .text(cx, startY + i * 28, line, {
          fontSize: isWinner ? "20px" : "16px",
          color: colorHex,
          fontFamily: "monospace",
        })
        .setOrigin(0.5);
    }
  }
}
