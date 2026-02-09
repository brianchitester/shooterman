import Phaser from "phaser";
import type { TileGrid, EnemyType } from "../../core/state/Types";
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
const ENEMY_BULLET_COLOR = 0xda70d6; // orchid — distinct from player bullets
const CHASER_COLOR = 0x8b0000;
const SHOOTER_COLOR = 0x6a0dad; // purple

const TILE_SOLID_COLOR = 0x444444;
const TILE_BREAKABLE_COLOR = 0x8b6914;
const TILE_BREAKABLE_DAMAGED_COLOR = 0x5c470e;

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

export function createEnemyBulletGraphic(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(ENEMY_BULLET_COLOR, 1);
  g.fillCircle(0, 0, BULLET_RADIUS);
  g.setVisible(false);
  g.setDepth(4);
  return g;
}

export function createChaserEnemyGraphic(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(CHASER_COLOR, 1);
  g.fillCircle(0, 0, ENEMY_RADIUS);
  g.setVisible(false);
  g.setDepth(2);
  return g;
}

export function createShooterEnemyGraphic(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(SHOOTER_COLOR, 1);
  // Equilateral triangle pointing right, ~12px "radius" equivalent
  const r = ENEMY_RADIUS;
  g.fillTriangle(
    r, 0,                                   // right tip
    -r * 0.5, -r * 0.866,                   // top-left
    -r * 0.5, r * 0.866,                    // bottom-left
  );
  g.setVisible(false);
  g.setDepth(2);
  return g;
}

export function createEnemyGraphicByType(scene: Phaser.Scene, type: EnemyType): Phaser.GameObjects.Graphics {
  switch (type) {
    case "chaser": return createChaserEnemyGraphic(scene);
    case "shooter": return createShooterEnemyGraphic(scene);
  }
}

export function createTileGraphics(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.setDepth(1);
  return g;
}

export function drawTiles(g: Phaser.GameObjects.Graphics, tiles: TileGrid): void {
  g.clear();
  for (let row = 0; row < tiles.height; row++) {
    for (let col = 0; col < tiles.width; col++) {
      const cell = tiles.cells[row * tiles.width + col];
      if (cell.type === "solid") {
        g.fillStyle(TILE_SOLID_COLOR, 1);
        g.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      } else if (cell.type === "breakable") {
        const color = cell.hp < 2 ? TILE_BREAKABLE_DAMAGED_COLOR : TILE_BREAKABLE_COLOR;
        g.fillStyle(color, 1);
        g.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        // Crack lines on damaged tiles
        if (cell.hp < 2) {
          g.lineStyle(1, 0x3a2f0a, 0.6);
          const x = col * CELL_SIZE;
          const y = row * CELL_SIZE;
          g.lineBetween(x + 8, y + 4, x + CELL_SIZE - 12, y + CELL_SIZE - 8);
          g.lineBetween(x + CELL_SIZE - 10, y + 10, x + 6, y + CELL_SIZE - 6);
        }
      }
    }
  }
}
