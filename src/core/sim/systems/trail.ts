import type { GameState } from "../../state/Types";
import type { EventBus } from "../../events/EventBus";
import { getEnemyDef } from "../../defs/enemies";
import { MAX_ENEMIES } from "../../state/Defaults";

/** Upper bound for trail tiles per enemy. Must be >= any EnemyDef.trail.maxTrailTiles. */
const MAX_RING = 32;

// Pre-allocated ring buffers — one per enemy pool slot (zero GC).
// Stores (col, row) of placed trail tiles in FIFO order.
const ringCols: Int16Array[] = [];
const ringRows: Int16Array[] = [];
const ringHead = new Int32Array(MAX_ENEMIES); // next write index
const ringCount = new Int32Array(MAX_ENEMIES); // current size

for (let i = 0; i < MAX_ENEMIES; i++) {
  ringCols[i] = new Int16Array(MAX_RING);
  ringRows[i] = new Int16Array(MAX_RING);
}

export function trailSystem(state: GameState, events: EventBus): void {
  const tiles = state.tiles;
  const cs = tiles.cellSize;
  const gridW = tiles.width;
  const gridH = tiles.height;

  for (let i = 0; i < state.enemies.length; i++) {
    const enemy = state.enemies[i];
    if (!enemy.active) continue;

    const def = getEnemyDef(enemy.typeId);
    if (!def.trail) continue;

    // Skip enemies still in spawn telegraph
    if (enemy.spawnTimer > 0) continue;

    const trail = def.trail;

    // Fresh enemy in this slot — reset ring buffer and seed last-cell
    if (enemy.trailLastCol === -1) {
      ringHead[i] = 0;
      ringCount[i] = 0;
      enemy.trailLastCol = Math.floor(enemy.pos.x / cs);
      enemy.trailLastRow = Math.floor(enemy.pos.y / cs);
      continue; // don't place a tile on the first frame
    }

    // Decrement cooldown
    if (enemy.trailCooldown > 0) {
      enemy.trailCooldown--;
    }

    // Current grid cell
    const col = Math.floor(enemy.pos.x / cs);
    const row = Math.floor(enemy.pos.y / cs);

    // Cell hasn't changed — nothing to do
    if (col === enemy.trailLastCol && row === enemy.trailLastRow) continue;

    const vacatedCol = enemy.trailLastCol;
    const vacatedRow = enemy.trailLastRow;

    // Update last cell to current (regardless of whether we place a tile)
    enemy.trailLastCol = col;
    enemy.trailLastRow = row;

    // Check cooldown
    if (enemy.trailCooldown > 0) continue;

    // Bounds check on vacated cell
    if (vacatedCol < 0 || vacatedCol >= gridW || vacatedRow < 0 || vacatedRow >= gridH) continue;

    // Only place on empty cells
    const cellIdx = vacatedRow * gridW + vacatedCol;
    if (tiles.cells[cellIdx].type !== "empty") continue;

    // Player safety: skip if any alive player is too close to the tile center
    const tileCenterX = vacatedCol * cs + cs / 2;
    const tileCenterY = vacatedRow * cs + cs / 2;
    const safeR2 = trail.playerSafeRadius * trail.playerSafeRadius;
    let tooClose = false;
    for (let p = 0; p < state.players.length; p++) {
      const player = state.players[p];
      if (!player.alive) continue;
      const dx = player.pos.x - tileCenterX;
      const dy = player.pos.y - tileCenterY;
      if (dx * dx + dy * dy < safeR2) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    // FIFO cap: auto-decay oldest trail tile when at max
    if (ringCount[i] >= trail.maxTrailTiles) {
      const oldest = (ringHead[i] - ringCount[i] + MAX_RING) % MAX_RING;
      const oldCol = ringCols[i][oldest];
      const oldRow = ringRows[i][oldest];
      const oldIdx = oldRow * gridW + oldCol;
      // Only decay if still breakable (player may have already destroyed it)
      if (tiles.cells[oldIdx].type === "breakable") {
        tiles.cells[oldIdx].type = "empty";
        tiles.cells[oldIdx].hp = 0;
        events.emit({ type: "tile_destroyed", col: oldCol, row: oldRow });
      }
      ringCount[i]--;
    }

    // Place the breakable tile
    tiles.cells[cellIdx].type = "breakable";
    tiles.cells[cellIdx].hp = trail.tileHp;

    // Record in ring buffer
    ringCols[i][ringHead[i]] = vacatedCol;
    ringRows[i][ringHead[i]] = vacatedRow;
    ringHead[i] = (ringHead[i] + 1) % MAX_RING;
    ringCount[i]++;

    // Reset cooldown
    enemy.trailCooldown = trail.cooldownTicks;

    // Emit event for renderer
    events.emit({ type: "tile_created", col: vacatedCol, row: vacatedRow, hp: trail.tileHp });
  }
}
