import type { TileGrid, Vec2 } from "../state/Types";

/**
 * Returns true if a circle at (x,y) with given radius does NOT overlap any
 * solid or breakable tiles. Simple AABB grid query.
 */
export function isTileFree(x: number, y: number, radius: number, tiles: TileGrid): boolean {
  const cs = tiles.cellSize;
  const left = Math.max(0, ((x - radius) / cs) | 0);
  const right = Math.min(tiles.width - 1, ((x + radius) / cs) | 0);
  const top = Math.max(0, ((y - radius) / cs) | 0);
  const bottom = Math.min(tiles.height - 1, ((y + radius) / cs) | 0);

  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      if (tiles.cells[row * tiles.width + col].type !== "empty") return false;
    }
  }
  return true;
}

/**
 * DDA grid raycast — returns true if line from (ax,ay) to (bx,by) has no
 * solid/breakable tile blocking it. Skips the first cell (entity's own cell).
 * Max iterations capped at width+height.
 */
export function hasLineOfSight(
  ax: number, ay: number,
  bx: number, by: number,
  tiles: TileGrid,
): boolean {
  const cs = tiles.cellSize;
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.001) return true;

  const dirX = dx / dist;
  const dirY = dy / dist;

  // Starting cell
  let cellX = (ax / cs) | 0;
  let cellY = (ay / cs) | 0;
  const endCellX = (bx / cs) | 0;
  const endCellY = (by / cs) | 0;

  const stepX = dirX >= 0 ? 1 : -1;
  const stepY = dirY >= 0 ? 1 : -1;

  // Distance along ray to cross one cell width/height
  const tDeltaX = dirX !== 0 ? Math.abs(cs / dirX) : Infinity;
  const tDeltaY = dirY !== 0 ? Math.abs(cs / dirY) : Infinity;

  // Distance to first cell boundary
  let tMaxX: number;
  if (dirX > 0) {
    tMaxX = ((cellX + 1) * cs - ax) / dirX;
  } else if (dirX < 0) {
    tMaxX = (cellX * cs - ax) / dirX;
  } else {
    tMaxX = Infinity;
  }

  let tMaxY: number;
  if (dirY > 0) {
    tMaxY = ((cellY + 1) * cs - ay) / dirY;
  } else if (dirY < 0) {
    tMaxY = (cellY * cs - ay) / dirY;
  } else {
    tMaxY = Infinity;
  }

  const maxIter = tiles.width + tiles.height;
  let first = true;

  for (let i = 0; i < maxIter; i++) {
    // Check current cell (skip the first — entity's own cell)
    if (!first) {
      if (cellX < 0 || cellX >= tiles.width || cellY < 0 || cellY >= tiles.height) return false;
      if (tiles.cells[cellY * tiles.width + cellX].type !== "empty") return false;
    }
    first = false;

    // Reached target cell
    if (cellX === endCellX && cellY === endCellY) return true;

    // Step to next cell
    if (tMaxX < tMaxY) {
      cellX += stepX;
      tMaxX += tDeltaX;
    } else {
      cellY += stepY;
      tMaxY += tDeltaY;
    }
  }

  return true;
}

// --- A* pathfinding (pre-allocated work arrays) ---

// Pre-allocated for 80x60 grids (cellSize 12). Grows lazily if needed.
let _gridCapacity = 4800;
let _gScore = new Float32Array(_gridCapacity);
let _fScore = new Float32Array(_gridCapacity);
let _parent = new Int32Array(_gridCapacity);
let _closed = new Uint8Array(_gridCapacity);
let _inOpen = new Uint8Array(_gridCapacity);
const _open: number[] = [];

function ensureCapacity(needed: number): void {
  if (needed <= _gridCapacity) return;
  _gridCapacity = needed;
  _gScore = new Float32Array(needed);
  _fScore = new Float32Array(needed);
  _parent = new Int32Array(needed);
  _closed = new Uint8Array(needed);
  _inOpen = new Uint8Array(needed);
}

// 8-directional neighbors
const DIRS_X = [-1, 1, 0, 0, -1, -1, 1, 1];
const DIRS_Y = [0, 0, -1, 1, -1, 1, -1, 1];
const DIR_COST = [1, 1, 1, 1, 1.414, 1.414, 1.414, 1.414];

function octileH(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
}

/**
 * A* pathfinding on the tile grid. Returns array of world-space waypoints
 * (cell centers) from start to end, or null if no path exists.
 * The start waypoint is omitted. Path is LOS-smoothed.
 */
export function findPath(
  startX: number, startY: number,
  endX: number, endY: number,
  tiles: TileGrid,
): Vec2[] | null {
  const cs = tiles.cellSize;
  const w = tiles.width;
  const h = tiles.height;
  const total = w * h;
  ensureCapacity(total);

  const sc = Math.max(0, Math.min(w - 1, (startX / cs) | 0));
  const sr = Math.max(0, Math.min(h - 1, (startY / cs) | 0));
  const ec = Math.max(0, Math.min(w - 1, (endX / cs) | 0));
  const er = Math.max(0, Math.min(h - 1, (endY / cs) | 0));

  const startIdx = sr * w + sc;
  const endIdx = er * w + ec;

  if (startIdx === endIdx) return [];
  if (tiles.cells[endIdx].type !== "empty") return null;

  // Reset work arrays
  for (let i = 0; i < total; i++) {
    _gScore[i] = Infinity;
    _fScore[i] = Infinity;
    _parent[i] = -1;
    _closed[i] = 0;
    _inOpen[i] = 0;
  }

  _gScore[startIdx] = 0;
  _fScore[startIdx] = octileH(sc, sr, ec, er);
  _open.length = 0;
  _open.push(startIdx);
  _inOpen[startIdx] = 1;

  while (_open.length > 0) {
    // Find lowest f in open set
    let bestI = 0;
    for (let i = 1; i < _open.length; i++) {
      if (_fScore[_open[i]] < _fScore[_open[bestI]]) bestI = i;
    }
    const cur = _open[bestI];
    if (cur === endIdx) break;

    // Remove from open (swap with last)
    _open[bestI] = _open[_open.length - 1];
    _open.pop();
    _inOpen[cur] = 0;
    _closed[cur] = 1;

    const cr = (cur / w) | 0;
    const cc = cur % w;

    for (let d = 0; d < 8; d++) {
      const nr = cr + DIRS_Y[d];
      const nc = cc + DIRS_X[d];
      if (nr < 0 || nr >= h || nc < 0 || nc >= w) continue;

      const nIdx = nr * w + nc;
      if (_closed[nIdx] || tiles.cells[nIdx].type !== "empty") continue;

      // Prevent diagonal corner-cutting
      if (d >= 4) {
        if (tiles.cells[cr * w + nc].type !== "empty") continue;
        if (tiles.cells[nr * w + cc].type !== "empty") continue;
      }

      const tentG = _gScore[cur] + DIR_COST[d];
      if (tentG < _gScore[nIdx]) {
        _parent[nIdx] = cur;
        _gScore[nIdx] = tentG;
        _fScore[nIdx] = tentG + octileH(nc, nr, ec, er);
        if (!_inOpen[nIdx]) {
          _open.push(nIdx);
          _inOpen[nIdx] = 1;
        }
      }
    }
  }

  if (_parent[endIdx] === -1) return null;

  // Reconstruct raw path
  const raw: Vec2[] = [];
  let idx = endIdx;
  while (idx !== -1) {
    const r = (idx / w) | 0;
    const c = idx % w;
    raw.push({ x: c * cs + cs / 2, y: r * cs + cs / 2 });
    idx = _parent[idx];
  }
  raw.reverse();

  // Skip start cell (bot is already there)
  if (raw.length > 0) raw.shift();
  if (raw.length <= 1) return raw;

  // LOS-based smoothing: skip intermediate waypoints when direct LOS exists
  const smoothed: Vec2[] = [raw[0]];
  let ci = 0;
  while (ci < raw.length - 1) {
    let farthest = ci + 1;
    for (let j = raw.length - 1; j > ci + 1; j--) {
      if (hasLineOfSight(raw[ci].x, raw[ci].y, raw[j].x, raw[j].y, tiles)) {
        farthest = j;
        break;
      }
    }
    smoothed.push(raw[farthest]);
    ci = farthest;
  }

  return smoothed;
}

/**
 * Resolves a circle entity against solid/breakable tiles.
 * Pushes the entity out of any overlapping non-empty tiles.
 * Writes resolved position into `out` and returns it.
 */
export function resolveCircleTile(
  posX: number,
  posY: number,
  radius: number,
  tiles: TileGrid,
  out: Vec2,
): Vec2 {
  const cs = tiles.cellSize;

  // Check all cells the entity could overlap
  const left = Math.max(0, ((posX - radius) / cs) | 0);
  const right = Math.min(tiles.width - 1, ((posX + radius) / cs) | 0);
  const top = Math.max(0, ((posY - radius) / cs) | 0);
  const bottom = Math.min(tiles.height - 1, ((posY + radius) / cs) | 0);

  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      const cell = tiles.cells[row * tiles.width + col];
      if (cell.type === "empty") continue;

      // AABB of the tile
      const tileLeft = col * cs;
      const tileTop = row * cs;
      const tileRight = tileLeft + cs;
      const tileBottom = tileTop + cs;

      // Closest point on AABB to circle center
      const closestX = Math.max(tileLeft, Math.min(posX, tileRight));
      const closestY = Math.max(tileTop, Math.min(posY, tileBottom));

      const dx = posX - closestX;
      const dy = posY - closestY;
      const distSq = dx * dx + dy * dy;

      if (distSq < radius * radius && distSq > 0) {
        const dist = Math.sqrt(distSq);
        const overlap = radius - dist;
        posX += (dx / dist) * overlap;
        posY += (dy / dist) * overlap;
      } else if (distSq === 0) {
        // Center is inside the tile — push out via shortest axis
        const overlapLeft = posX - tileLeft + radius;
        const overlapRight = tileRight - posX + radius;
        const overlapTop = posY - tileTop + radius;
        const overlapBottom = tileBottom - posY + radius;
        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

        if (minOverlap === overlapLeft) posX = tileLeft - radius;
        else if (minOverlap === overlapRight) posX = tileRight + radius;
        else if (minOverlap === overlapTop) posY = tileTop - radius;
        else posY = tileBottom + radius;
      }
    }
  }

  out.x = posX;
  out.y = posY;
  return out;
}
