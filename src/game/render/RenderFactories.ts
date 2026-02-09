import Phaser from "phaser";
import type { TileGrid } from "../../core/state/Types";
import { CELL_SIZE } from "../../core/state/Defaults";

export const PLAYER_COLORS: readonly number[] = [
  0xe74c3c, // Red
  0x3498db, // Blue
  0x2ecc71, // Green
  0xf1c40f, // Yellow
  0x9b59b6, // Purple
  0xe67e22, // Orange
  0x1abc9c, // Cyan
];

const PLAYER_RADIUS = 14;  // 28px diameter
const BULLET_RADIUS = 3;   // 6px diameter
const ENEMY_RADIUS = 12;   // 24px diameter

const BULLET_COLOR = 0xff8c00;
const ENEMY_COLOR = 0x8b0000;

const TILE_SOLID_COLOR = 0x444444;
const TILE_BREAKABLE_COLOR = 0x8b6914;

export function createPlayerGraphic(scene: Phaser.Scene, slot: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(PLAYER_COLORS[slot % PLAYER_COLORS.length], 1);
  g.fillCircle(0, 0, PLAYER_RADIUS);
  g.setVisible(false);
  g.setDepth(3);
  return g;
}

export function createAimIndicator(scene: Phaser.Scene, slot: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.lineStyle(2, PLAYER_COLORS[slot % PLAYER_COLORS.length], 0.8);
  g.lineBetween(0, 0, PLAYER_RADIUS + 8, 0);
  g.setVisible(false);
  g.setDepth(4);
  return g;
}

export function createBulletGraphic(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(BULLET_COLOR, 1);
  g.fillCircle(0, 0, BULLET_RADIUS);
  g.setVisible(false);
  g.setDepth(4);
  return g;
}

export function createEnemyGraphic(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(ENEMY_COLOR, 1);
  g.fillCircle(0, 0, ENEMY_RADIUS);
  g.setVisible(false);
  g.setDepth(2);
  return g;
}

export function createTileGraphics(scene: Phaser.Scene, tiles: TileGrid): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.setDepth(1);

  for (let row = 0; row < tiles.height; row++) {
    for (let col = 0; col < tiles.width; col++) {
      const cell = tiles.cells[row * tiles.width + col];
      if (cell.type === "solid") {
        g.fillStyle(TILE_SOLID_COLOR, 1);
        g.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      } else if (cell.type === "breakable") {
        g.fillStyle(TILE_BREAKABLE_COLOR, 1);
        g.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }
  }

  return g;
}
