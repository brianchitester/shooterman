import Phaser from "phaser";
import type { GameState } from "../../core/state/Types";
import type { SeededRng } from "../../core/sim/rng/seedRng";
import type { EventBus } from "../../core/events/EventBus";
import { ENEMY_LIST } from "../../core/defs/enemies";
import { WEAPON_LIST } from "../../core/defs/weapons";
import { initEnemyFromDef } from "../../core/sim/systems/initEnemy";
import { TICKS_PER_SECOND } from "../../core/state/Defaults";

export class DevHotkeys {
  private scene: Phaser.Scene;
  private overlayText: Phaser.GameObjects.Text;
  private showOverlay = false;
  private godMode = false;
  private wantsSpawn = false;
  private wantsCycle = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.overlayText = scene.add.text(4, 4, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#00ff00",
      backgroundColor: "#000000aa",
      padding: { x: 4, y: 4 },
    });
    this.overlayText.setDepth(100);
    this.overlayText.setScrollFactor(0);
    this.overlayText.setVisible(false);

    const kb = scene.input.keyboard!;

    kb.on("keydown-F1", (e: KeyboardEvent) => {
      e.preventDefault();
      this.showOverlay = !this.showOverlay;
      this.overlayText.setVisible(this.showOverlay);
    });

    kb.on("keydown-F2", (e: KeyboardEvent) => {
      e.preventDefault();
      this.wantsSpawn = true;
    });

    kb.on("keydown-F3", (e: KeyboardEvent) => {
      e.preventDefault();
      this.godMode = !this.godMode;
    });

    kb.on("keydown-F4", (e: KeyboardEvent) => {
      e.preventDefault();
      this.wantsCycle = true;
    });
  }

  update(state: GameState, rng: SeededRng, eventBus: EventBus): void {
    // Process deferred actions
    if (this.wantsSpawn) {
      this.wantsSpawn = false;
      this.spawnRandomEnemy(state, rng, eventBus);
    }

    if (this.wantsCycle) {
      this.wantsCycle = false;
      this.cycleWeapons(state);
    }

    // God mode: keep all players at high HP/invuln
    if (this.godMode) {
      for (let i = 0; i < state.players.length; i++) {
        const p = state.players[i];
        if (p.alive || p.downed) {
          p.hp = 999;
          p.invulnTimer = 9999;
        }
      }
    }

    // Update overlay
    if (this.showOverlay) {
      const tick = state.match.tick;
      const secs = (tick / TICKS_PER_SECOND).toFixed(1);
      const fps = Math.round(this.scene.game.loop.actualFps);

      let activeBullets = 0;
      for (let i = 0; i < state.bullets.length; i++) {
        if (state.bullets[i].active) activeBullets++;
      }
      let activeEnemies = 0;
      for (let i = 0; i < state.enemies.length; i++) {
        if (state.enemies[i].active) activeEnemies++;
      }

      const weaponId = state.players.length > 0 ? state.players[0].weaponId : "none";

      const lines = [
        `Tick: ${tick}  Time: ${secs}s  FPS: ${fps}`,
        `Players: ${state.players.length}  Bullets: ${activeBullets}  Enemies: ${activeEnemies}`,
        `Weapon: ${weaponId}  Score: ${state.match.score}  God: ${this.godMode ? "ON" : "OFF"}`,
        `F1:overlay F2:spawn F3:god F4:weapon`,
      ];
      this.overlayText.setText(lines.join("\n"));
    }
  }

  private spawnRandomEnemy(state: GameState, rng: SeededRng, eventBus: EventBus): void {
    // Find inactive slot
    let slot = -1;
    for (let i = 0; i < state.enemies.length; i++) {
      if (!state.enemies[i].active) {
        slot = i;
        break;
      }
    }
    if (slot === -1) return;

    // Random enemy type
    const def = ENEMY_LIST[rng.nextInt(0, ENEMY_LIST.length - 1)];

    // Random position in open area (avoid edges)
    const cs = state.tiles.cellSize;
    const w = state.tiles.width;
    const h = state.tiles.height;
    const margin = 3;

    // Try up to 20 times to find an empty cell
    for (let attempt = 0; attempt < 20; attempt++) {
      const col = rng.nextInt(margin, w - margin - 1);
      const row = rng.nextInt(margin, h - margin - 1);
      if (state.tiles.cells[row * w + col].type !== "empty") continue;

      const px = col * cs + cs / 2;
      const py = row * cs + cs / 2;

      // Skip telegraph for debug spawns (set spawnTimer to 0)
      initEnemyFromDef(state.enemies[slot], def, px, py, state);
      state.enemies[slot].spawnTimer = 0;

      eventBus.emit({
        type: "enemy_spawned",
        enemyId: state.enemies[slot].id,
        pos: { x: px, y: py },
      });
      return;
    }
  }

  private cycleWeapons(state: GameState): void {
    if (state.players.length === 0) return;
    const currentId = state.players[0].weaponId;
    let idx = 0;
    for (let i = 0; i < WEAPON_LIST.length; i++) {
      if (WEAPON_LIST[i].id === currentId) {
        idx = i;
        break;
      }
    }
    const nextIdx = (idx + 1) % WEAPON_LIST.length;
    const nextId = WEAPON_LIST[nextIdx].id;
    for (let i = 0; i < state.players.length; i++) {
      state.players[i].weaponId = nextId;
    }
  }
}
