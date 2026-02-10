import Phaser from "phaser";
import type { GameState } from "../../core/state/Types";
import { MAX_BULLETS, MAX_ENEMIES, MAX_PLAYERS, ARENA_WIDTH, ARENA_HEIGHT } from "../../core/state/Defaults";
import type { PrevPositions } from "./PrevPositions";
import {
  createPlayerGraphic,
  createAimIndicator,
  createBulletGraphic,
  createEnemyBulletGraphic,
  createChaserEnemyGraphic,
  createShooterEnemyGraphic,
  createTileGraphics,
  drawTiles,
} from "./RenderFactories";
import { REVIVE_HOLD_TIME } from "../../core/state/Defaults";

export class RenderWorld {
  private playerGfx: Phaser.GameObjects.Graphics[] = [];
  private aimGfx: Phaser.GameObjects.Graphics[] = [];
  private reviveRingGfx: Phaser.GameObjects.Graphics[] = [];
  private bulletGfx: Phaser.GameObjects.Graphics[] = [];
  private enemyBulletGfx: Phaser.GameObjects.Graphics[] = [];
  private chaserGfx: Phaser.GameObjects.Graphics[] = [];
  private shooterGfx: Phaser.GameObjects.Graphics[] = [];
  private tileGfx!: Phaser.GameObjects.Graphics;

  create(scene: Phaser.Scene, state: GameState): void {
    // Viewport fill — covers margins for maps smaller than the canvas
    const vpBg = scene.add.graphics();
    vpBg.fillStyle(0x0e0e1a, 1);
    vpBg.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    vpBg.setDepth(-1);
    vpBg.setScrollFactor(0);

    // Background — sized to map
    const mapW = state.tiles.width * state.tiles.cellSize;
    const mapH = state.tiles.height * state.tiles.cellSize;
    const bg = scene.add.graphics();
    bg.fillStyle(0x1a1a2e, 1);
    bg.fillRect(0, 0, mapW, mapH);
    bg.setDepth(0);

    // Tile grid
    this.tileGfx = createTileGraphics(scene);
    drawTiles(this.tileGfx, state.tiles);

    // Player pool
    for (let i = 0; i < MAX_PLAYERS; i++) {
      this.playerGfx[i] = createPlayerGraphic(scene, i);
      this.aimGfx[i] = createAimIndicator(scene, i);
      const ring = scene.add.graphics();
      ring.setVisible(false);
      ring.setDepth(5);
      this.reviveRingGfx[i] = ring;
    }

    // Bullet pool — one player-bullet graphic + one enemy-bullet graphic per slot
    for (let i = 0; i < MAX_BULLETS; i++) {
      this.bulletGfx[i] = createBulletGraphic(scene);
      this.enemyBulletGfx[i] = createEnemyBulletGraphic(scene);
    }

    // Enemy pool — one chaser + one shooter graphic per slot
    for (let i = 0; i < MAX_ENEMIES; i++) {
      this.chaserGfx[i] = createChaserEnemyGraphic(scene);
      this.shooterGfx[i] = createShooterEnemyGraphic(scene);
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

        // Aim indicator — hide when downed (can't shoot)
        if (p.downed) {
          aim.setVisible(false);
        } else {
          const angle = Math.atan2(p.aim.y, p.aim.x);
          aim.setPosition(rx, ry);
          aim.setRotation(angle);
          aim.setVisible(true);
        }

        // Revive progress ring
        const ring = this.reviveRingGfx[i];
        if (p.downed && p.reviveProgress > 0) {
          ring.clear();
          ring.lineStyle(3, 0x2ecc71, 0.9);
          const progress = p.reviveProgress / REVIVE_HOLD_TIME;
          ring.beginPath();
          ring.arc(0, 0, 20, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2, false);
          ring.strokePath();
          ring.setPosition(rx, ry);
          ring.setVisible(true);
        } else {
          ring.setVisible(false);
        }
      } else {
        gfx.setVisible(false);
        aim.setVisible(false);
        this.reviveRingGfx[i].setVisible(false);
      }
    }

    // Hide unused player slots
    for (let i = state.players.length; i < MAX_PLAYERS; i++) {
      this.playerGfx[i].setVisible(false);
      this.aimGfx[i].setVisible(false);
      this.reviveRingGfx[i].setVisible(false);
    }

    // Bullets — show correct graphic based on fromEnemy
    for (let i = 0; i < state.bullets.length; i++) {
      const b = state.bullets[i];
      const playerBullet = this.bulletGfx[i];
      const enemyBullet = this.enemyBulletGfx[i];

      if (b.active) {
        // Snap on first frame (slot just activated) to avoid ghost lerp from stale prev
        const snap = !prev.bulletWasActive[i];
        const rx = snap ? b.pos.x : prev.bullets[i].x + (b.pos.x - prev.bullets[i].x) * alpha;
        const ry = snap ? b.pos.y : prev.bullets[i].y + (b.pos.y - prev.bullets[i].y) * alpha;

        if (b.fromEnemy) {
          enemyBullet.setPosition(rx, ry);
          enemyBullet.setVisible(true);
          playerBullet.setVisible(false);
        } else {
          playerBullet.setPosition(rx, ry);
          playerBullet.setVisible(true);
          enemyBullet.setVisible(false);
        }
      } else {
        playerBullet.setVisible(false);
        enemyBullet.setVisible(false);
      }
    }

    // Enemies — show correct graphic based on type
    for (let i = 0; i < state.enemies.length; i++) {
      const e = state.enemies[i];
      const chaser = this.chaserGfx[i];
      const shooter = this.shooterGfx[i];

      if (e.active) {
        // Snap on first frame (slot just activated) to avoid ghost lerp from stale prev
        const snap = !prev.enemyWasActive[i];
        const rx = snap ? e.pos.x : prev.enemies[i].x + (e.pos.x - prev.enemies[i].x) * alpha;
        const ry = snap ? e.pos.y : prev.enemies[i].y + (e.pos.y - prev.enemies[i].y) * alpha;

        // Telegraph: pulse alpha while spawning
        const a = e.spawnTimer > 0
          ? (((e.spawnTimer >> 2) & 1) ? 0.2 : 0.5)
          : 1;

        if (e.type === "shooter") {
          shooter.setPosition(rx, ry);
          shooter.setVisible(true);
          shooter.setAlpha(a);
          // Rotate triangle to face movement direction
          if (e.vel.x !== 0 || e.vel.y !== 0) {
            shooter.setRotation(Math.atan2(e.vel.y, e.vel.x));
          }
          chaser.setVisible(false);
        } else {
          chaser.setPosition(rx, ry);
          chaser.setVisible(true);
          chaser.setAlpha(a);
          shooter.setVisible(false);
        }
      } else {
        chaser.setVisible(false);
        shooter.setVisible(false);
      }
    }
  }
}
