import type { TileGrid } from "../state/Types";
import { CELL_SIZE } from "../state/Defaults";

/**
 * Resolves a circle entity against solid/breakable tiles.
 * Pushes the entity out of any overlapping non-empty tiles.
 * Mutates posX/posY and returns the resolved position.
 */
export function resolveCircleTile(
  posX: number,
  posY: number,
  radius: number,
  tiles: TileGrid,
): { x: number; y: number } {
  // Check all cells the entity could overlap
  const left = Math.max(0, ((posX - radius) / CELL_SIZE) | 0);
  const right = Math.min(tiles.width - 1, ((posX + radius) / CELL_SIZE) | 0);
  const top = Math.max(0, ((posY - radius) / CELL_SIZE) | 0);
  const bottom = Math.min(tiles.height - 1, ((posY + radius) / CELL_SIZE) | 0);

  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      const cell = tiles.cells[row * tiles.width + col];
      if (cell.type === "empty") continue;

      // AABB of the tile
      const tileLeft = col * CELL_SIZE;
      const tileTop = row * CELL_SIZE;
      const tileRight = tileLeft + CELL_SIZE;
      const tileBottom = tileTop + CELL_SIZE;

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

  return { x: posX, y: posY };
}
