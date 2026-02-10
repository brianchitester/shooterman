import type { MapDef } from "./MapDef";
import type { TileType } from "../state/Types";

/**
 * Parse a visual ASCII layout into a TileType array.
 * '#' = solid, 'X' = breakable, '.' = empty
 * Whitespace between rows is ignored; each row must have exactly `cols` chars.
 */
export function parseLayout(layout: string, cols: number): TileType[] {
  const cells: TileType[] = [];
  for (let i = 0; i < layout.length; i++) {
    const ch = layout[i];
    if (ch === "#") cells.push("solid");
    else if (ch === "X") cells.push("breakable");
    else if (ch === ".") cells.push("empty");
    // skip whitespace / newlines
  }
  return cells;
}

// ---------------------------------------------------------------------------
// MAP: Arena (20x15) — the original
// ---------------------------------------------------------------------------

/** Reproduce the current procedural arena layout as static data. */
function generateArenaCells(): TileType[] {
  const cols = 20;
  const rows = 15;
  const cells: TileType[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (row === 0 || row === rows - 1 || col === 0 || col === cols - 1) {
        cells.push("solid");
      } else if (
        (row % 4 === 2 && col % 4 === 2) &&
        row > 1 && row < rows - 2 && col > 1 && col < cols - 2
      ) {
        cells.push("solid");
      } else if (
        (row + col) % 3 === 0 &&
        row > 1 && row < rows - 2 && col > 1 && col < cols - 2
      ) {
        cells.push("breakable");
      } else {
        cells.push("empty");
      }
    }
  }

  return cells;
}

export const MAP_ARENA: MapDef = {
  id: "arena",
  name: "Arena",
  cols: 20,
  rows: 15,
  cellSize: 48,
  spawnPoints: [
    { x: 96, y: 48 },    // top-left
    { x: 480, y: 48 },   // top-center
    { x: 864, y: 48 },   // top-right
    { x: 48, y: 360 },   // mid-left
    { x: 912, y: 360 },  // mid-right
    { x: 192, y: 672 },  // bottom-left
    { x: 768, y: 672 },  // bottom-right
  ],
  cells: generateArenaCells(),
};

// ---------------------------------------------------------------------------
// MAP: Bunker (16x12) — compact, corridors + rooms
// ---------------------------------------------------------------------------

export const MAP_BUNKER: MapDef = {
  id: "bunker",
  name: "Bunker",
  cols: 16,
  rows: 12,
  cellSize: 48,
  spawnPoints: [
    { x: 384, y: 72 },   // top-center
    { x: 72, y: 288 },   // mid-left
    { x: 696, y: 288 },  // mid-right
    { x: 168, y: 504 },  // bottom-left
    { x: 600, y: 504 },  // bottom-right
  ],
  cells: parseLayout([
    "################",
    "#..............#",
    "#.##.XX..XX.##.#",
    "#..............#",
    "#.XX.##..##.XX.#",
    "#......XX......#",
    "#......XX......#",
    "#.XX.##..##.XX.#",
    "#..............#",
    "#.##.XX..XX.##.#",
    "#..............#",
    "################",
  ].join(""), 16),
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const MAP_LIST: ReadonlyArray<MapDef> = [MAP_ARENA, MAP_BUNKER];

export const MAP_REGISTRY: Record<string, MapDef> = {};
for (const m of MAP_LIST) {
  MAP_REGISTRY[m.id] = m;
}

export function getMapDef(id: string): MapDef {
  return MAP_REGISTRY[id] ?? MAP_ARENA;
}
