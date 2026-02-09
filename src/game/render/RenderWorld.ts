import Phaser from "phaser";
import type { GameState } from "../../core/state/Types";
import { ARENA_WIDTH, ARENA_HEIGHT, MAX_BULLETS, MAX_ENEMIES, MAX_PLAYERS } from "../../core/state/Defaults";
import type { PrevPositions } from "./PrevPositions";
import {
  createPlayerGraphic,
  createAimIndicator,
  createBulletGraphic,
  createEnemyGraphic,
  createTileGraphics,
  drawTiles,
} from "./RenderFactories";

export class RenderWorld {
  private playerGfx: Phaser.GameObjects.Graphics[] = [];
  private aimGfx: Phaser.GameObjects.Graphics[] = [];
  private bulletGfx: Phaser.GameObjects.Graphics[] = [];
  private enemyGfx: Phaser.GameObjects.Graphics[] = [];
  private tileGfx!: Phaser.GameObjects.Graphics;

  create(scene: Phaser.Scene, state: GameState): void {
    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x1a1a2e, 1);
    bg.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    bg.setDepth(0);

    // Tile grid
    this.tileGfx = createTileGraphics(scene);
    drawTiles(this.tileGfx, state.tiles);

    // Player pool
    for (let i = 0; i < MAX_PLAYERS; i++) {
      this.playerGfx[i] = createPlayerGraphic(scene, i);
      this.aimGfx[i] = createAimIndicator(scene, i);
    }

    // Bullet pool
    for (let i = 0; i < MAX_BULLETS; i++) {
      this.bulletGfx[i] = createBulletGraphic(scene);
    }

    // Enemy pool
    for (let i = 0; i < MAX_ENEMIES; i++) {
      this.enemyGfx[i] = createEnemyGraphic(scene);
    }
  }

  update(state: GameState, prev: PrevPositions, alpha: number): void {
    // Redraw tile grid (destroyed tiles disappear)
    drawTiles(this.tileGfx, state.tiles);

    // Players
    for (let i = 0; i < state.players.length; i++) {
      const p = state.players[i];
      const gfx = this.playerGfx[i];
      const aim = this.aimGfx[i];

      if (p.alive || p.downed) {
        const rx = prev.players[i].x + (p.pos.x - prev.players[i].x) * alpha;
        const ry = prev.players[i].y + (p.pos.y - prev.players[i].y) * alpha;
        gfx.setPosition(rx, ry);
        gfx.setVisible(true);

        // Dim downed players
        gfx.setAlpha(p.downed ? 0.5 : 1);

        // Flash during invuln
        if (p.invulnTimer > 0) {
          gfx.setAlpha(((p.invulnTimer >> 2) & 1) ? 0.3 : 1);
        }

        // Aim indicator
        const angle = Math.atan2(p.aim.y, p.aim.x);
        aim.setPosition(rx, ry);
        aim.setRotation(angle);
        aim.setVisible(true);
      } else {
        gfx.setVisible(false);
        aim.setVisible(false);
      }
    }

    // Hide unused player slots
    for (let i = state.players.length; i < MAX_PLAYERS; i++) {
      this.playerGfx[i].setVisible(false);
      this.aimGfx[i].setVisible(false);
    }

    // Bullets
    for (let i = 0; i < state.bullets.length; i++) {
      const b = state.bullets[i];
      const gfx = this.bulletGfx[i];

      if (b.active) {
        const rx = prev.bullets[i].x + (b.pos.x - prev.bullets[i].x) * alpha;
        const ry = prev.bullets[i].y + (b.pos.y - prev.bullets[i].y) * alpha;
        gfx.setPosition(rx, ry);
        gfx.setVisible(true);
      } else {
        gfx.setVisible(false);
      }
    }

    // Enemies
    for (let i = 0; i < state.enemies.length; i++) {
      const e = state.enemies[i];
      const gfx = this.enemyGfx[i];

      if (e.active) {
        const rx = prev.enemies[i].x + (e.pos.x - prev.enemies[i].x) * alpha;
        const ry = prev.enemies[i].y + (e.pos.y - prev.enemies[i].y) * alpha;
        gfx.setPosition(rx, ry);
        gfx.setVisible(true);
      } else {
        gfx.setVisible(false);
      }
    }
  }
}
