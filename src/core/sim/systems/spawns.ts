import type { GameState } from "../../state/Types";
import type { SeededRng } from "../rng/seedRng";
import type { EventBus } from "../../events/EventBus";
import {
  SPAWN_SAFETY_DISTANCE,
  SPAWN_RATE_BASE_INTERVAL, SPAWN_RATE_MIN_INTERVAL, SPAWN_RAMP_DURATION,
} from "../../state/Defaults";
import type { EnemyDef } from "../../defs/EnemyDef";
import { ENEMY_LIST } from "../../defs/enemies";
import { initEnemyFromDef } from "./initEnemy";

// Pre-allocated flat arrays for edge cell coordinates: [x0, y0, x1, y1, ...]
// Max possible cells per edge = width * height (generous upper bound, allocated once)
const MAX_EDGE_CELLS = 80 * 60; // fits any map up to 80x60
const edgeCellFlat: number[][] = [
  new Array(MAX_EDGE_CELLS * 2),
  new Array(MAX_EDGE_CELLS * 2),
  new Array(MAX_EDGE_CELLS * 2),
  new Array(MAX_EDGE_CELLS * 2),
];
const edgeCellCount: number[] = [0, 0, 0, 0];

// Pre-allocated edge ordering arrays (max 4 edges)
const edgeOrderIdx: number[] = [0, 0, 0, 0];
const edgeOrderDist: number[] = [0, 0, 0, 0];
let edgeOrderCount = 0;

// Only spawn enemies in co-op (PvP has no enemies)
export function spawnSystem(state: GameState, dt: number, rng: SeededRng, events: EventBus): void {
  if (state.match.mode !== "coop") return;

  // Don't spawn if all players are downed or dead
  let anyUp = false;
  for (let i = 0; i < state.players.length; i++) {
    if (state.players[i].alive && !state.players[i].downed) { anyUp = true; break; }
  }
  if (!anyUp) return;

  const playerCount = state.players.length;

  // Calculate spawn interval (ramps from 3s to 1s over 60s)
  const t = Math.min(state.match.tick / SPAWN_RAMP_DURATION, 1);
  const interval = SPAWN_RATE_BASE_INTERVAL + (SPAWN_RATE_MIN_INTERVAL - SPAWN_RATE_BASE_INTERVAL) * t;
  // Apply player count multiplier
  const adjustedInterval = interval / (0.5 + 0.5 * playerCount);

  // Check if it's time to spawn (integer tick-based)
  if (state.match.tick % Math.max(Math.round(adjustedInterval), 1) !== 0) return;

  // Collect empty cells in edge bands (first/last few rows and columns)
  const cs = state.tiles.cellSize;
  const w = state.tiles.width;
  const h = state.tiles.height;
  const band = Math.max(3, Math.ceil(h * 0.1)); // ~10% of map depth, min 3 rows/cols

  // Reset edge cell counts
  edgeCellCount[0] = 0;
  edgeCellCount[1] = 0;
  edgeCellCount[2] = 0;
  edgeCellCount[3] = 0;

  for (let row = 1; row < h - 1; row++) {
    for (let col = 1; col < w - 1; col++) {
      const tile = state.tiles.cells[row * w + col];
      if (tile.type !== "empty") continue;
      const px = col * cs + cs / 2;
      const py = row * cs + cs / 2;
      if (row < band) {
        const c = edgeCellCount[0];
        edgeCellFlat[0][c * 2] = px;
        edgeCellFlat[0][c * 2 + 1] = py;
        edgeCellCount[0] = c + 1;
      }
      if (row >= h - band) {
        const c = edgeCellCount[1];
        edgeCellFlat[1][c * 2] = px;
        edgeCellFlat[1][c * 2 + 1] = py;
        edgeCellCount[1] = c + 1;
      }
      if (col < band) {
        const c = edgeCellCount[2];
        edgeCellFlat[2][c * 2] = px;
        edgeCellFlat[2][c * 2 + 1] = py;
        edgeCellCount[2] = c + 1;
      }
      if (col >= w - band) {
        const c = edgeCellCount[3];
        edgeCellFlat[3][c * 2] = px;
        edgeCellFlat[3][c * 2 + 1] = py;
        edgeCellCount[3] = c + 1;
      }
    }
  }

  // Rank edges by distance from nearest player (farthest first), skip empty edges
  edgeOrderCount = 0;
  for (let e = 0; e < 4; e++) {
    const count = edgeCellCount[e];
    if (count === 0) continue;
    // Use edge midpoint for distance ranking
    const midIdx = (count / 2) | 0;
    const midX = edgeCellFlat[e][midIdx * 2];
    const midY = edgeCellFlat[e][midIdx * 2 + 1];
    let minPlayerDist = Infinity;
    for (let p = 0; p < state.players.length; p++) {
      if (!state.players[p].alive) continue;
      const dx = midX - state.players[p].pos.x;
      const dy = midY - state.players[p].pos.y;
      const d = dx * dx + dy * dy;
      if (d < minPlayerDist) minPlayerDist = d;
    }
    // Insertion sort (<=4 elements) — descending by distance
    let insertAt = edgeOrderCount;
    for (let j = 0; j < edgeOrderCount; j++) {
      if (minPlayerDist > edgeOrderDist[j]) {
        insertAt = j;
        break;
      }
    }
    // Shift elements right
    for (let j = edgeOrderCount; j > insertAt; j--) {
      edgeOrderIdx[j] = edgeOrderIdx[j - 1];
      edgeOrderDist[j] = edgeOrderDist[j - 1];
    }
    edgeOrderIdx[insertAt] = e;
    edgeOrderDist[insertAt] = minPlayerDist;
    edgeOrderCount++;
  }
  if (edgeOrderCount === 0) return; // No valid edge cells at all

  // From the best edge, pick a random empty cell
  const bestEdge = edgeOrderIdx[0];
  const bestCount = edgeCellCount[bestEdge];
  const slot2 = rng.nextInt(0, bestCount - 1);
  const spawnX = edgeCellFlat[bestEdge][slot2 * 2];
  const spawnY = edgeCellFlat[bestEdge][slot2 * 2 + 1];

  // Safety distance check
  const safeDistSq = SPAWN_SAFETY_DISTANCE * SPAWN_SAFETY_DISTANCE;
  for (let p = 0; p < state.players.length; p++) {
    if (!state.players[p].alive) continue;
    const dx = spawnX - state.players[p].pos.x;
    const dy = spawnY - state.players[p].pos.y;
    if (dx * dx + dy * dy < safeDistSq) return; // Too close, skip this spawn
  }

  // Find inactive enemy slot
  let slot = -1;
  for (let i = 0; i < state.enemies.length; i++) {
    if (!state.enemies[i].active) {
      slot = i;
      break;
    }
  }
  if (slot === -1) return; // Pool full

  // Build weighted spawn pool from eligible enemy types
  const def = pickEnemyDef(state.match.tick, rng);
  initEnemyFromDef(state.enemies[slot], def, spawnX, spawnY, state);

  state.match.spawnCount++;

  events.emit({
    type: "enemy_spawned",
    enemyId: state.enemies[slot].id,
    pos: { x: spawnX, y: spawnY },
  });
}

/** Pick an enemy def using weighted random selection from eligible types. */
function pickEnemyDef(tick: number, rng: SeededRng): EnemyDef {
  // Filter to types eligible at current tick
  let totalWeight = 0;
  for (let i = 0; i < ENEMY_LIST.length; i++) {
    if (tick >= ENEMY_LIST[i].spawnAfterTick) {
      totalWeight += ENEMY_LIST[i].spawnWeight;
    }
  }

  // Fallback: if nothing eligible (shouldn't happen), return first
  if (totalWeight <= 0) return ENEMY_LIST[0];

  let roll = rng.nextInt(0, totalWeight - 1);
  for (let i = 0; i < ENEMY_LIST.length; i++) {
    const def = ENEMY_LIST[i];
    if (tick < def.spawnAfterTick) continue;
    roll -= def.spawnWeight;
    if (roll < 0) return def;
  }

  return ENEMY_LIST[0];
}
