import Phaser from "phaser";
import type { TileGrid } from "../../core/state/Types";
import type { MapColorScheme } from "../../core/defs/MapDef";
import type { EnemyDef } from "../../core/defs/EnemyDef";
import { PLAYER_RADIUS } from "../../core/state/Defaults";

export const PLAYER_COLORS: readonly number[] = [
  0xe74c3c, // Red
  0x3498db, // Blue
  0x2ecc71, // Green
  0xf1c40f, // Yellow
  0x9b59b6, // Purple
  0xe67e22, // Orange
  0x1abc9c, // Cyan
];
const BULLET_RADIUS = 3;   // 6px diameter

export const BULLET_COLOR = 0xff8c00;
export const ENEMY_BULLET_COLOR = 0xda70d6; // orchid — distinct from player bullets


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

export function drawBulletShape(g: Phaser.GameObjects.Graphics, fromEnemy: boolean): void {
  g.clear();
  g.fillStyle(fromEnemy ? ENEMY_BULLET_COLOR : BULLET_COLOR, 1);
  g.fillCircle(0, 0, BULLET_RADIUS);
}

/** Draw an enemy shape into a Graphics object based on its EnemyDef visual. */
export function drawEnemyShape(g: Phaser.GameObjects.Graphics, def: EnemyDef): void {
  g.clear();
  const r = def.colliderRadius;
  g.fillStyle(def.visual.color, 1);

  switch (def.visual.shape) {
    case "circle":
      g.fillCircle(0, 0, r);
      break;
    case "triangle": {
      g.fillTriangle(
        r, 0,                       // right tip
        -r * 0.5, -r * 0.866,      // top-left
        -r * 0.5, r * 0.866,       // bottom-left
      );
      break;
    }
    case "diamond": {
      g.fillTriangle(r, 0, 0, -r, -r, 0);
      g.fillTriangle(r, 0, 0, r, -r, 0);
      break;
    }
    case "square":
      g.fillRect(-r, -r, r * 2, r * 2);
      break;
  }
}

/** Create a Graphics object for an enemy, drawn from its EnemyDef. */
export function createEnemyGraphic(scene: Phaser.Scene, def: EnemyDef): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  drawEnemyShape(g, def);
  g.setVisible(false);
  g.setDepth(2);
  return g;
}

export function createTileGraphics(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.setDepth(1);
  return g;
}

export function drawTiles(g: Phaser.GameObjects.Graphics, tiles: TileGrid, colors: MapColorScheme): void {
  g.clear();
  const cs = tiles.cellSize;
  for (let row = 0; row < tiles.height; row++) {
    for (let col = 0; col < tiles.width; col++) {
      const cell = tiles.cells[row * tiles.width + col];
      if (cell.type === "solid") {
        g.fillStyle(colors.solid, 1);
        g.fillRect(col * cs, row * cs, cs, cs);
      } else if (cell.type === "breakable") {
        const color = cell.hp < 2 ? colors.breakableDamaged : colors.breakable;
        g.fillStyle(color, 1);
        g.fillRect(col * cs, row * cs, cs, cs);
        // Crack lines on damaged tiles
        if (cell.hp < 2) {
          g.lineStyle(1, colors.crack, 0.6);
          const x = col * cs;
          const y = row * cs;
          g.lineBetween(x + cs * 0.17, y + cs * 0.08, x + cs * 0.75, y + cs * 0.83);
          g.lineBetween(x + cs * 0.79, y + cs * 0.21, x + cs * 0.13, y + cs * 0.88);
        }
      }
    }
  }
}
