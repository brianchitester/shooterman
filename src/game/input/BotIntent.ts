import type { GameState, PlayerIntent, Vec2 } from "../../core/state/Types";

// --- Per-bot persistent state ---

interface BotMemory {
  aimJitterAngle: number;
  jitterTimer: number;
  shootDelay: number;
  boldness: number; // 0 = very cautious, 1 = very bold
  // Stuck detection
  lastX: number;
  lastY: number;
  stuckTicks: number;
  slideDir: number; // 1 or -1 — which perpendicular to try
}

/** Per-frame tuning derived from boldness. */
interface BotTuning {
  moveScale: number;
  standoffSq: number;
  aimThreshold: number;
  reactionTicks: number;
  jitterRad: number;
  dodgeCorridor: number;
  dodgeStrength: number;
  enemyAvoidRadiusSq: number;
  enemyAvoidStrength: number;
  wDodge: number;
  wEnemyAvoid: number;
}

const memories: BotMemory[] = [];

function newMemory(): BotMemory {
  return {
    aimJitterAngle: 0, jitterTimer: 0, shootDelay: 0,
    boldness: Math.random(),
    lastX: 0, lastY: 0, stuckTicks: 0, slideDir: Math.random() < 0.5 ? 1 : -1,
  };
}

export function resetBotMemory(playerCount: number): void {
  memories.length = 0;
  for (let i = 0; i < playerCount; i++) {
    memories.push(newMemory());
  }
}

// --- Tuning ranges: [cautious, bold] ---

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getTuning(boldness: number): BotTuning {
  const standoff = lerp(160, 80, boldness);
  const enemyAvoidR = lerp(130, 80, boldness);
  return {
    moveScale:          lerp(0.55, 0.78, boldness),
    standoffSq:         standoff * standoff,
    aimThreshold:       lerp(0.92, 0.78, boldness),
    reactionTicks:      lerp(14, 4, boldness) | 0, // integer
    jitterRad:          lerp(12, 5, boldness) * Math.PI / 180,
    dodgeCorridor:      lerp(55, 28, boldness),
    dodgeStrength:      lerp(1.5, 0.7, boldness),
    enemyAvoidRadiusSq: enemyAvoidR * enemyAvoidR,
    enemyAvoidStrength: lerp(1.2, 0.5, boldness),
    wDodge:             lerp(2.8, 1.2, boldness),
    wEnemyAvoid:        lerp(2.0, 0.8, boldness),
  };
}

// Stuck detection / wall sliding
const STUCK_THRESHOLD_SQ = 3 * 3; // if moved less than 3px in the window, consider stuck
const STUCK_CHECK_INTERVAL = 10;  // ticks between position checks
const STUCK_SLIDE_TICKS = 30;     // try sliding one direction for 30 ticks before flipping

// --- Constants (personality-independent) ---

const REVIVE_RANGE_SQ = 200 * 200;
const WOBBLE_MAGNITUDE = 0.15;
const JITTER_REFRESH_TICKS = 15;

// Ally repulsion
const REPULSE_RADIUS_SQ = 90 * 90;
const REPULSE_STRENGTH = 0.6;

// Bullet dodge scan
const DODGE_SCAN_RADIUS_SQ = 180 * 180;

// Weight blending (fixed)
const W_REPULSE = 0.8;
const W_BASE = 1.0;

const EMPTY_INTENT: PlayerIntent = {
  move: { x: 0, y: 0 },
  aim: { x: 1, y: 0 },
  shoot: false,
  revive: false,
};

// --- Main entry ---

export function botPoll(state: GameState, playerIndex: number): PlayerIntent {
  const player = state.players[playerIndex];
  if (!player) return EMPTY_INTENT;

  // Ensure memory exists (mid-match join)
  while (memories.length <= playerIndex) {
    memories.push(newMemory());
  }
  const mem = memories[playerIndex];
  const tune = getTuning(mem.boldness);

  // Dead and respawning — no input
  if (!player.alive && !player.downed) return EMPTY_INTENT;

  // Refresh aim jitter
  mem.jitterTimer--;
  if (mem.jitterTimer <= 0) {
    mem.aimJitterAngle = (Math.random() * 2 - 1) * tune.jitterRad;
    mem.jitterTimer = JITTER_REFRESH_TICKS;
  }

  // Downed — crawl toward nearest alive ally
  if (player.downed) {
    const ally = findNearestAlivePlayerExcept(state, playerIndex);
    if (ally) {
      const dir = dirTo(player.pos, ally);
      return { move: { x: dir.x * tune.moveScale, y: dir.y * tune.moveScale }, aim: dir, shoot: false, revive: false };
    }
    return EMPTY_INTENT;
  }

  // Get base intent from behavior
  const isPvp = state.match.mode === "pvp_time";
  const base = isPvp
    ? pvpBehavior(state, playerIndex, mem, tune)
    : coopBehavior(state, playerIndex, mem, tune);

  // Layer: bullet dodge
  const dodge = getBulletDodge(state, player.pos, tune);

  // Layer: enemy proximity avoidance
  const enemyAvoid = getEnemyAvoidance(state, player.pos, tune);

  // Layer: ally repulsion
  const repulse = getAllyRepulsion(state, playerIndex);

  // Blend move vectors
  let mx = base.move.x * W_BASE + dodge.x * tune.wDodge + enemyAvoid.x * tune.wEnemyAvoid + repulse.x * W_REPULSE;
  let my = base.move.y * W_BASE + dodge.y * tune.wDodge + enemyAvoid.y * tune.wEnemyAvoid + repulse.y * W_REPULSE;

  // --- Stuck detection: if position barely changed, slide along wall ---
  const pdx = player.pos.x - mem.lastX;
  const pdy = player.pos.y - mem.lastY;
  const movedSq = pdx * pdx + pdy * pdy;

  // Periodic position snapshot
  mem.stuckTicks++;
  if (mem.stuckTicks % STUCK_CHECK_INTERVAL === 0) {
    if (movedSq < STUCK_THRESHOLD_SQ) {
      // Still stuck — if we've been stuck long enough, flip slide direction
      if (mem.stuckTicks > STUCK_SLIDE_TICKS) {
        mem.slideDir *= -1;
        mem.stuckTicks = 1; // reset counter but stay in stuck mode
      }
    } else {
      // Unstuck — reset
      mem.stuckTicks = 0;
    }
    mem.lastX = player.pos.x;
    mem.lastY = player.pos.y;
  }

  // When stuck, rotate move 90 degrees to slide along the wall
  if (mem.stuckTicks >= STUCK_CHECK_INTERVAL) {
    const slideMx = -my * mem.slideDir;
    const slideMy = mx * mem.slideDir;
    // Blend: mostly slide, a little original direction to keep trying
    mx = slideMx * 0.8 + mx * 0.2;
    my = slideMy * 0.8 + my * 0.2;
  }

  // Clamp to moveScale
  const mag = Math.sqrt(mx * mx + my * my);
  if (mag > tune.moveScale) {
    const inv = tune.moveScale / mag;
    mx *= inv;
    my *= inv;
  }

  return {
    move: { x: mx, y: my },
    aim: base.aim,
    shoot: base.shoot,
    revive: base.revive,
  };
}

// --- Co-op behavior ---

function coopBehavior(state: GameState, playerIndex: number, mem: BotMemory, tune: BotTuning): PlayerIntent {
  const player = state.players[playerIndex];

  // Priority 1: revive downed ally within range
  const downedAlly = findNearestDownedAlly(state, playerIndex);
  if (downedAlly) {
    const dx = downedAlly.x - player.pos.x;
    const dy = downedAlly.y - player.pos.y;
    const distSq = dx * dx + dy * dy;
    if (distSq <= REVIVE_RANGE_SQ) {
      const dir = dirTo(player.pos, downedAlly);
      return { move: { x: dir.x * tune.moveScale, y: dir.y * tune.moveScale }, aim: dir, shoot: false, revive: true };
    }
    // Move toward downed ally
    const dir = dirTo(player.pos, downedAlly);
    const wobbled = addWobble(dir);
    return { move: { x: wobbled.x * tune.moveScale, y: wobbled.y * tune.moveScale }, aim: dir, shoot: false, revive: false };
  }

  // Priority 2: chase and shoot nearest enemy
  const enemy = findNearestEnemy(state, player.pos);
  if (enemy) {
    return chaseAndShoot(player.pos, enemy, mem, tune);
  }

  // Fallback: wander
  return wander(mem, tune);
}

// --- PvP behavior ---

function pvpBehavior(state: GameState, playerIndex: number, mem: BotMemory, tune: BotTuning): PlayerIntent {
  const player = state.players[playerIndex];

  // Chase nearest alive enemy player
  const target = findNearestAlivePlayerExcept(state, playerIndex);
  if (target) {
    return chaseAndShoot(player.pos, target, mem, tune);
  }

  return wander(mem, tune);
}

// --- Shared chase + shoot logic ---

function chaseAndShoot(selfPos: Vec2, targetPos: Vec2, mem: BotMemory, tune: BotTuning): PlayerIntent {
  const dir = dirTo(selfPos, targetPos);
  const jitteredAim = addAimJitter(dir, mem.aimJitterAngle);

  // Check alignment
  const dot = dir.x * jitteredAim.x + dir.y * jitteredAim.y;

  let shoot = false;
  if (dot >= tune.aimThreshold) {
    if (mem.shootDelay <= 0) {
      shoot = true;
    } else {
      mem.shootDelay--;
    }
  } else {
    mem.shootDelay = tune.reactionTicks;
  }

  // Standoff: strafe when close, approach when far
  const dx = targetPos.x - selfPos.x;
  const dy = targetPos.y - selfPos.y;
  const distSq = dx * dx + dy * dy;
  let move: Vec2;
  if (distSq < tune.standoffSq) {
    move = { x: -dir.y * tune.moveScale, y: dir.x * tune.moveScale };
  } else {
    move = addWobble(dir);
    move.x *= tune.moveScale;
    move.y *= tune.moveScale;
  }

  return { move, aim: jitteredAim, shoot, revive: false };
}

// --- Wander ---

function wander(mem: BotMemory, tune: BotTuning): PlayerIntent {
  const angle = mem.aimJitterAngle * 5;
  const s = tune.moveScale * 0.4;
  const mx = Math.cos(angle) * s;
  const my = Math.sin(angle) * s;
  return {
    move: { x: mx, y: my },
    aim: { x: mx || 1, y: my },
    shoot: false,
    revive: false,
  };
}

// --- Bullet dodge ---

function getBulletDodge(state: GameState, selfPos: Vec2, tune: BotTuning): Vec2 {
  let dodgeX = 0;
  let dodgeY = 0;

  for (let i = 0; i < state.bullets.length; i++) {
    const b = state.bullets[i];
    if (!b.active || !b.fromEnemy) continue;

    const toSelfX = selfPos.x - b.pos.x;
    const toSelfY = selfPos.y - b.pos.y;
    const distSq = toSelfX * toSelfX + toSelfY * toSelfY;
    if (distSq > DODGE_SCAN_RADIUS_SQ) continue;

    const bSpeed = Math.sqrt(b.vel.x * b.vel.x + b.vel.y * b.vel.y);
    if (bSpeed < 0.001) continue;
    const bDirX = b.vel.x / bSpeed;
    const bDirY = b.vel.y / bSpeed;
    const dot = toSelfX * bDirX + toSelfY * bDirY;
    if (dot <= 0) continue;

    const cross = toSelfX * bDirY - toSelfY * bDirX;
    const perpDist = Math.abs(cross);
    if (perpDist > tune.dodgeCorridor) continue;

    const sign = cross >= 0 ? 1 : -1;
    const urgency = tune.dodgeStrength * (1 - perpDist / tune.dodgeCorridor);
    dodgeX += -bDirY * sign * urgency;
    dodgeY += bDirX * sign * urgency;
  }

  return { x: dodgeX, y: dodgeY };
}

// --- Enemy proximity avoidance ---

function getEnemyAvoidance(state: GameState, selfPos: Vec2, tune: BotTuning): Vec2 {
  let ax = 0;
  let ay = 0;
  const avoidRadius = Math.sqrt(tune.enemyAvoidRadiusSq);

  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (!e.active || e.spawnTimer > 0) continue;

    const dx = selfPos.x - e.pos.x;
    const dy = selfPos.y - e.pos.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < tune.enemyAvoidRadiusSq && distSq > 0.001) {
      const dist = Math.sqrt(distSq);
      const strength = tune.enemyAvoidStrength * (1 - dist / avoidRadius);
      ax += (dx / dist) * strength;
      ay += (dy / dist) * strength;
    }
  }

  return { x: ax, y: ay };
}

// --- Ally repulsion ---

function getAllyRepulsion(state: GameState, selfIndex: number): Vec2 {
  const self = state.players[selfIndex];
  let rx = 0;
  let ry = 0;
  const repulseRadius = Math.sqrt(REPULSE_RADIUS_SQ);

  for (let i = 0; i < state.players.length; i++) {
    if (i === selfIndex) continue;
    const other = state.players[i];
    if (!other.alive || other.downed) continue;

    const dx = self.pos.x - other.pos.x;
    const dy = self.pos.y - other.pos.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < REPULSE_RADIUS_SQ && distSq > 0.001) {
      const dist = Math.sqrt(distSq);
      const strength = REPULSE_STRENGTH * (1 - dist / repulseRadius);
      rx += (dx / dist) * strength;
      ry += (dy / dist) * strength;
    }
  }

  return { x: rx, y: ry };
}

// --- Helper functions ---

function findNearestEnemy(state: GameState, selfPos: Vec2): Vec2 | null {
  let nearestDistSq = Infinity;
  let nearestX = 0;
  let nearestY = 0;
  let found = false;

  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (!e.active || e.spawnTimer > 0) continue;
    const dx = e.pos.x - selfPos.x;
    const dy = e.pos.y - selfPos.y;
    const d = dx * dx + dy * dy;
    if (d < nearestDistSq) {
      nearestDistSq = d;
      nearestX = e.pos.x;
      nearestY = e.pos.y;
      found = true;
    }
  }

  return found ? { x: nearestX, y: nearestY } : null;
}

function findNearestAlivePlayerExcept(state: GameState, selfIndex: number): Vec2 | null {
  let nearestDistSq = Infinity;
  let nearestX = 0;
  let nearestY = 0;
  let found = false;
  const self = state.players[selfIndex];

  for (let i = 0; i < state.players.length; i++) {
    if (i === selfIndex) continue;
    const p = state.players[i];
    if (!p.alive || p.downed) continue;
    const dx = p.pos.x - self.pos.x;
    const dy = p.pos.y - self.pos.y;
    const d = dx * dx + dy * dy;
    if (d < nearestDistSq) {
      nearestDistSq = d;
      nearestX = p.pos.x;
      nearestY = p.pos.y;
      found = true;
    }
  }

  return found ? { x: nearestX, y: nearestY } : null;
}

function findNearestDownedAlly(state: GameState, selfIndex: number): Vec2 | null {
  let nearestDistSq = Infinity;
  let nearestX = 0;
  let nearestY = 0;
  let found = false;
  const self = state.players[selfIndex];

  for (let i = 0; i < state.players.length; i++) {
    if (i === selfIndex) continue;
    const p = state.players[i];
    if (!p.downed) continue;
    const dx = p.pos.x - self.pos.x;
    const dy = p.pos.y - self.pos.y;
    const d = dx * dx + dy * dy;
    if (d < nearestDistSq) {
      nearestDistSq = d;
      nearestX = p.pos.x;
      nearestY = p.pos.y;
      found = true;
    }
  }

  return found ? { x: nearestX, y: nearestY } : null;
}

function dirTo(from: Vec2, to: Vec2): Vec2 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.001) return { x: 1, y: 0 };
  return { x: dx / len, y: dy / len };
}

function addAimJitter(aim: Vec2, angle: number): Vec2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const x = aim.x * cos - aim.y * sin;
  const y = aim.x * sin + aim.y * cos;
  return { x, y };
}

function addWobble(dir: Vec2): Vec2 {
  const px = -dir.y * WOBBLE_MAGNITUDE;
  const py = dir.x * WOBBLE_MAGNITUDE;
  const x = dir.x + px;
  const y = dir.y + py;
  const len = Math.sqrt(x * x + y * y);
  if (len < 0.001) return dir;
  return { x: x / len, y: y / len };
}
