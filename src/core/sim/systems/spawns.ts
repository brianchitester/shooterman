import type { GameState } from "../../state/Types";
import type { SeededRng } from "../rng/seedRng";
import type { EventBus } from "../../events/EventBus";
import {
  SPAWN_SAFETY_DISTANCE, ENEMY_HP, SPAWN_TELEGRAPH_TICKS,
  SPAWN_RATE_BASE_INTERVAL, SPAWN_RATE_MIN_INTERVAL, SPAWN_RAMP_DURATION,
  SHOOTER_HP, SHOOTER_FIRE_COOLDOWN, SHOOTER_SPAWN_INTERVAL,
  CHASER_KNOCKBACK, CHASER_SCORE, SHOOTER_KNOCKBACK, SHOOTER_SCORE,
} from "../../state/Defaults";
import type { EnemyType } from "../../state/Types";

// Only spawn enemies in co-op (PvP has no enemies)
export function spawnSystem(state: GameState, dt: number, rng: SeededRng, events: EventBus): void {
  if (state.match.mode !== "coop") return;

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

  // 4 edge bands: top, bottom, left, right
  // Each band collects empty cell centers as candidate spawn positions
  const edgeCells: { x: number; y: number }[][] = [[], [], [], []];

  for (let row = 1; row < h - 1; row++) {
    for (let col = 1; col < w - 1; col++) {
      const tile = state.tiles.cells[row * w + col];
      if (tile.type !== "empty") continue;
      const px = col * cs + cs / 2;
      const py = row * cs + cs / 2;
      if (row < band) edgeCells[0].push({ x: px, y: py });             // top
      if (row >= h - band) edgeCells[1].push({ x: px, y: py });        // bottom
      if (col < band) edgeCells[2].push({ x: px, y: py });             // left
      if (col >= w - band) edgeCells[3].push({ x: px, y: py });        // right
    }
  }

  // Rank edges by distance from nearest player (farthest first), skip empty edges
  const edgeOrder: { idx: number; minDist: number }[] = [];
  for (let e = 0; e < 4; e++) {
    if (edgeCells[e].length === 0) continue;
    // Use edge midpoint for distance ranking
    const mid = edgeCells[e][(edgeCells[e].length / 2) | 0];
    let minPlayerDist = Infinity;
    for (let p = 0; p < state.players.length; p++) {
      if (!state.players[p].alive) continue;
      const dx = mid.x - state.players[p].pos.x;
      const dy = mid.y - state.players[p].pos.y;
      const d = dx * dx + dy * dy;
      if (d < minPlayerDist) minPlayerDist = d;
    }
    edgeOrder.push({ idx: e, minDist: minPlayerDist });
  }
  if (edgeOrder.length === 0) return; // No valid edge cells at all
  edgeOrder.sort((a, b) => b.minDist - a.minDist);

  // From the best edge, pick a random empty cell
  const bestEdge = edgeCells[edgeOrder[0].idx];
  const spawnPos = bestEdge[rng.nextInt(0, bestEdge.length - 1)];

  // Safety distance check
  const safeDistSq = SPAWN_SAFETY_DISTANCE * SPAWN_SAFETY_DISTANCE;
  for (let p = 0; p < state.players.length; p++) {
    if (!state.players[p].alive) continue;
    const dx = spawnPos.x - state.players[p].pos.x;
    const dy = spawnPos.y - state.players[p].pos.y;
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

  // Determine enemy type based on spawn count
  const enemyType: EnemyType = state.match.spawnCount % SHOOTER_SPAWN_INTERVAL === (SHOOTER_SPAWN_INTERVAL - 1)
    ? "shooter"
    : "chaser";

  const enemy = state.enemies[slot];
  enemy.id = state.match.nextEntityId++;
  enemy.type = enemyType;
  enemy.pos.x = spawnPos.x;
  enemy.pos.y = spawnPos.y;
  enemy.vel.x = 0;
  enemy.vel.y = 0;
  enemy.hp = enemyType === "shooter" ? SHOOTER_HP : ENEMY_HP;
  enemy.active = true;
  enemy.spawnTimer = SPAWN_TELEGRAPH_TICKS;
  enemy.fireCooldown = enemyType === "shooter" ? SHOOTER_FIRE_COOLDOWN : 0;
  enemy.knockback = enemyType === "shooter" ? SHOOTER_KNOCKBACK : CHASER_KNOCKBACK;
  enemy.score = enemyType === "shooter" ? SHOOTER_SCORE : CHASER_SCORE;

  state.match.spawnCount++;

  events.emit({
    type: "enemy_spawned",
    enemyId: enemy.id,
    pos: { x: spawnPos.x, y: spawnPos.y },
  });
}
