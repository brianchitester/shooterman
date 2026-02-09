import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { MatchScene } from "./scenes/MatchScene";
import { ARENA_WIDTH, ARENA_HEIGHT } from "../core/state/Defaults";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: ARENA_WIDTH,
  height: ARENA_HEIGHT,
  backgroundColor: "#1a1a2e",
  pixelArt: true,
  antialias: false,
  scene: [BootScene, MatchScene],
  input: {
    keyboard: true,
    mouse: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};
