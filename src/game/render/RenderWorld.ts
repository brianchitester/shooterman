import Phaser from "phaser";
import type { GameState } from "../../core/state/Types";
import type { GameEvent } from "../../core/events/Events";
import { MAX_BULLETS, MAX_ENEMIES, MAX_PLAYERS, ARENA_WIDTH, ARENA_HEIGHT } from "../../core/state/Defaults";
import type { PrevPositions } from "./PrevPositions";
import {
  createPlayerGraphic,
  createAimIndicator,
  createBulletGraphic,
  drawBulletShape,
  createEnemyGraphic,
  drawEnemyShape,
  createTileGraphics,
  drawTiles,
} from "./RenderFactories";
import { REVIVE_HOLD_TIME } from "../../core/state/Defaults";
import type { MapColorScheme } from "../../core/defs/MapDef";
import { getMapDef } from "../../core/defs/maps";
import { getEnemyDef, ENEMY_CHASER } from "../../core/defs/enemies";

interface FlashEffect {
  x: number;
  y: number;
  radius: number;
  maxTtl: number;
  ttl: number;
  color: number;
  active: boolean;
}

const FLASH_POOL_SIZE = 32;

export class RenderWorld {
  private playerGfx: Phaser.GameObjects.Graphics[] = [];
  private aimGfx: Phaser.GameObjects.Graphics[] = [];
  private reviveRingGfx: Phaser.GameObjects.Graphics[] = [];
  private bulletGfx: Phaser.GameObjects.Graphics[] = [];
  private bulletFromEnemy: boolean[] = [];
  private enemyGfx: Phaser.GameObjects.Graphics[] = [];
  private enemyTypeCache: string[] = []; // track typeId to know when to redraw
  private tileGfx!: Phaser.GameObjects.Graphics;
  private colors!: MapColorScheme;
  private tilesDirty = true;
  private flashPool: FlashEffect[] = [];
  private flashGfx!: Phaser.GameObjects.Graphics;

  create(scene: Phaser.Scene, state: GameState): void {
    // Resolve per-map color scheme
    const mapDef = getMapDef(state.match.mapId);
    this.colors = mapDef.colors;

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
    bg.fillStyle(this.colors.background, 1);
    bg.fillRect(0, 0, mapW, mapH);
    bg.setDepth(0);

    // Tile grid
    this.tileGfx = createTileGraphics(scene);
    this.tilesDirty = true;

    // Player pool
    for (let i = 0; i < MAX_PLAYERS; i++) {
      this.playerGfx[i] = createPlayerGraphic(scene, i);
      this.aimGfx[i] = createAimIndicator(scene, i);
      const ring = scene.add.graphics();
      ring.setVisible(false);
      ring.setDepth(5);
      this.reviveRingGfx[i] = ring;
    }

    // Bullet pool — single graphic per slot, recolored on fromEnemy change
    for (let i = 0; i < MAX_BULLETS; i++) {
      this.bulletGfx[i] = createBulletGraphic(scene);
      this.bulletFromEnemy[i] = false;
    }

    // Enemy pool — single graphic per slot, drawn from def on first use
    for (let i = 0; i < MAX_ENEMIES; i++) {
      this.enemyGfx[i] = createEnemyGraphic(scene, ENEMY_CHASER);
      this.enemyTypeCache[i] = "";
    }

    // Flash VFX pool
    for (let i = 0; i < FLASH_POOL_SIZE; i++) {
      this.flashPool[i] = { x: 0, y: 0, radius: 0, maxTtl: 1, ttl: 0, color: 0, active: false };
    }
    this.flashGfx = scene.add.graphics();
    this.flashGfx.setDepth(10);
  }

  update(state: GameState, prev: PrevPositions, alpha: number, events: GameEvent[] = []): void {
    // Process events: set dirty flag + spawn VFX flashes
    for (let i = 0; i < events.length; i++) {
      const evt = events[i];
      switch (evt.type) {
        case "tile_damaged":
        case "tile_destroyed":
        case "tile_created":
          this.tilesDirty = true;
          break;
      }

      // Spawn flash VFX
      switch (evt.type) {
        case "hit_enemy": {
          const enemy = this.findEnemy(state, evt.enemyId);
          if (enemy) this.spawnFlash(enemy.pos.x, enemy.pos.y, 8, 6, 0xffffff);
          break;
        }
        case "enemy_killed": {
          const enemy = this.findEnemy(state, evt.enemyId);
          if (enemy) this.spawnFlash(enemy.pos.x, enemy.pos.y, 16, 10, 0xff8800);
          break;
        }
        case "tile_destroyed": {
          const cs = state.tiles.cellSize;
          this.spawnFlash(evt.col * cs + cs / 2, evt.row * cs + cs / 2, 6, 8, 0xffcc00);
          break;
        }
        case "tile_created": {
          const cs = state.tiles.cellSize;
          this.spawnFlash(evt.col * cs + cs / 2, evt.row * cs + cs / 2, 6, 8, 0x2d8659);
          break;
        }
        case "hit_player": {
          const player = this.findPlayer(state, evt.playerId);
          if (player) this.spawnFlash(player.pos.x, player.pos.y, 10, 6, 0xff4444);
          break;
        }
      }
    }

    // Redraw tile grid only when dirty
    if (this.tilesDirty) {
      drawTiles(this.tileGfx, state.tiles, this.colors);
      this.tilesDirty = false;
    }

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

    // Bullets — single graphic per slot, recolor when fromEnemy changes
    for (let i = 0; i < state.bullets.length; i++) {
      const b = state.bullets[i];
      const gfx = this.bulletGfx[i];

      if (b.active) {
        // Recolor if fromEnemy state changed
        if (b.fromEnemy !== this.bulletFromEnemy[i]) {
          drawBulletShape(gfx, b.fromEnemy);
          this.bulletFromEnemy[i] = b.fromEnemy;
        }

        // Snap on first frame (slot just activated) to avoid ghost lerp from stale prev
        const snap = !prev.bulletWasActive[i];
        const rx = snap ? b.pos.x : prev.bullets[i].x + (b.pos.x - prev.bullets[i].x) * alpha;
        const ry = snap ? b.pos.y : prev.bullets[i].y + (b.pos.y - prev.bullets[i].y) * alpha;

        gfx.setPosition(rx, ry);
        gfx.setVisible(true);
      } else {
        gfx.setVisible(false);
      }
    }

    // Enemies — single graphic per slot, redraw shape if type changed
    for (let i = 0; i < state.enemies.length; i++) {
      const e = state.enemies[i];
      const gfx = this.enemyGfx[i];

      if (e.active) {
        // Redraw graphic if enemy type changed (new spawn in this slot)
        if (this.enemyTypeCache[i] !== e.typeId) {
          const def = getEnemyDef(e.typeId);
          drawEnemyShape(gfx, def);
          this.enemyTypeCache[i] = e.typeId;
        }

        // Snap on first frame (slot just activated) to avoid ghost lerp from stale prev
        const snap = !prev.enemyWasActive[i];
        const rx = snap ? e.pos.x : prev.enemies[i].x + (e.pos.x - prev.enemies[i].x) * alpha;
        const ry = snap ? e.pos.y : prev.enemies[i].y + (e.pos.y - prev.enemies[i].y) * alpha;

        // Telegraph: pulse alpha while spawning
        const a = e.spawnTimer > 0
          ? (((e.spawnTimer >> 2) & 1) ? 0.2 : 0.5)
          : 1;

        gfx.setPosition(rx, ry);
        gfx.setVisible(true);
        gfx.setAlpha(a);

        // Rotate to velocity direction for types that want it
        const def = getEnemyDef(e.typeId);
        if (def.visual.rotateToVelocity && (e.vel.x !== 0 || e.vel.y !== 0)) {
          gfx.setRotation(Math.atan2(e.vel.y, e.vel.x));
        }
      } else {
        gfx.setVisible(false);
        // Clear type cache so next activation redraws
        if (this.enemyTypeCache[i] !== "") {
          this.enemyTypeCache[i] = "";
        }
      }
    }

    // Flash VFX — clear and redraw active flashes
    this.flashGfx.clear();
    for (let i = 0; i < FLASH_POOL_SIZE; i++) {
      const f = this.flashPool[i];
      if (!f.active) continue;
      const a = f.ttl / f.maxTtl;
      this.flashGfx.fillStyle(f.color, a);
      this.flashGfx.fillCircle(f.x, f.y, f.radius);
      f.ttl--;
      if (f.ttl <= 0) f.active = false;
    }
  }

  private spawnFlash(x: number, y: number, radius: number, ttl: number, color: number): void {
    for (let i = 0; i < FLASH_POOL_SIZE; i++) {
      const f = this.flashPool[i];
      if (f.active) continue;
      f.x = x;
      f.y = y;
      f.radius = radius;
      f.maxTtl = ttl;
      f.ttl = ttl;
      f.color = color;
      f.active = true;
      return;
    }
  }

  private findEnemy(state: GameState, id: number): { pos: { x: number; y: number } } | null {
    for (let i = 0; i < state.enemies.length; i++) {
      if (state.enemies[i].id === id) return state.enemies[i];
    }
    return null;
  }

  private findPlayer(state: GameState, id: number): { pos: { x: number; y: number } } | null {
    for (let i = 0; i < state.players.length; i++) {
      if (state.players[i].id === id) return state.players[i];
    }
    return null;
  }
}
