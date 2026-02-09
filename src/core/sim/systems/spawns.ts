import type { GameState } from "../../state/Types";
import type { SeededRng } from "../rng/seedRng";
import type { EventBus } from "../../events/EventBus";
import {
  ARENA_WIDTH, ARENA_HEIGHT, CELL_SIZE,
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

  // Pick a spawn position at the arena edges
  // 4 cardinal edge zones — pick zone farthest from nearest player
  const zones = [
    { x: rng.nextInt(CELL_SIZE * 2, ARENA_WIDTH - CELL_SIZE * 2), y: CELL_SIZE + 4 },          // top
    { x: rng.nextInt(CELL_SIZE * 2, ARENA_WIDTH - CELL_SIZE * 2), y: ARENA_HEIGHT - CELL_SIZE - 4 }, // bottom
    { x: CELL_SIZE + 4, y: rng.nextInt(CELL_SIZE * 2, ARENA_HEIGHT - CELL_SIZE * 2) },          // left
    { x: ARENA_WIDTH - CELL_SIZE - 4, y: rng.nextInt(CELL_SIZE * 2, ARENA_HEIGHT - CELL_SIZE * 2) }, // right
  ];

  // Find zone farthest from nearest player
  let bestZone = 0;
  let bestMinDist = -1;

  for (let z = 0; z < zones.length; z++) {
    let minPlayerDist = Infinity;
    for (let p = 0; p < state.players.length; p++) {
      if (!state.players[p].alive) continue;
      const dx = zones[z].x - state.players[p].pos.x;
      const dy = zones[z].y - state.players[p].pos.y;
      const d = dx * dx + dy * dy;
      if (d < minPlayerDist) minPlayerDist = d;
    }
    if (minPlayerDist > bestMinDist) {
      bestMinDist = minPlayerDist;
      bestZone = z;
    }
  }

  const spawnPos = zones[bestZone];

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
