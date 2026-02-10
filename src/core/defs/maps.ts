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
// MAP: Crucible (24x18) — cellSize 40, open + massive breakable center
// ---------------------------------------------------------------------------

export const MAP_CRUCIBLE: MapDef = {
  id: "crucible",
  name: "Crucible",
  cols: 24,
  rows: 18,
  cellSize: 40,
  spawnPoints: [
    { x: 60, y: 60 },     // (1,1) top-left
    { x: 500, y: 60 },    // (12,1) top-center
    { x: 900, y: 60 },    // (22,1) top-right
    { x: 60, y: 380 },    // (1,9) mid-left
    { x: 900, y: 380 },   // (22,9) mid-right
    { x: 220, y: 660 },   // (5,16) bottom-left
    { x: 740, y: 660 },   // (18,16) bottom-right
  ],
  cells: parseLayout([
    "########################",
    "#......................#",
    "#..####..........####..#",
    "#..#XX#..........#XX#..#",
    "#..####..........####..#",
    "#......................#",
    "#......................#",
    "#.....XXXXXXXXXXXX.....#",
    "#.....XXXXXXXXXXXX.....#",
    "#.....XXXXXXXXXXXX.....#",
    "#.....XXXXXXXXXXXX.....#",
    "#......................#",
    "#......................#",
    "#..####..........####..#",
    "#..#XX#..........#XX#..#",
    "#..####..........####..#",
    "#......................#",
    "########################",
  ].join(""), 24),
};

// ---------------------------------------------------------------------------
// MAP: Gridlock (30x22) — cellSize 32, symmetric corridors + cover grid
// ---------------------------------------------------------------------------

export const MAP_GRIDLOCK: MapDef = {
  id: "gridlock",
  name: "Gridlock",
  cols: 30,
  rows: 22,
  cellSize: 32,
  spawnPoints: [
    { x: 48, y: 48 },     // (1,1) top-left
    { x: 464, y: 48 },    // (14,1) top-center
    { x: 912, y: 48 },    // (28,1) top-right
    { x: 48, y: 336 },    // (1,10) mid-left
    { x: 912, y: 336 },   // (28,10) mid-right
    { x: 144, y: 656 },   // (4,20) bottom-left
    { x: 816, y: 656 },   // (25,20) bottom-right
  ],
  cells: parseLayout([
    "##############################",
    "#............................#",
    "#..####................####..#",
    "#..#XX#................#XX#..#",
    "#..####................####..#",
    "#............................#",
    "#............................#",
    "#.........XXXX..XXXX.........#",
    "#.........XXXX..XXXX.........#",
    "#............................#",
    "#.....##.....XXXX.....##.....#",
    "#.....##.....XXXX.....##.....#",
    "#............................#",
    "#.........XXXX..XXXX.........#",
    "#.........XXXX..XXXX.........#",
    "#............................#",
    "#............................#",
    "#..####................####..#",
    "#..#XX#................#XX#..#",
    "#..####................####..#",
    "#............................#",
    "##############################",
  ].join(""), 30),
};

// ---------------------------------------------------------------------------
// MAP: Labyrinth (40x30) — cellSize 24, room grid with corridors
// ---------------------------------------------------------------------------

function generateLabyrinthCells(): TileType[] {
  const cols = 40;
  const rows = 30;
  const cells: TileType[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Border walls
      if (row === 0 || row === rows - 1 || col === 0 || col === cols - 1) {
        cells.push("solid");
      }
      // Vertical divider walls at cols 10, 20, 30 (with 2-tile doorways)
      else if (
        (col === 10 || col === 20 || col === 30) &&
        !(row >= 7 && row <= 8) &&
        !(row >= 14 && row <= 15) &&
        !(row >= 21 && row <= 22)
      ) {
        cells.push("solid");
      }
      // Horizontal divider walls at rows 10, 20 (with 2-tile doorways)
      else if (
        (row === 10 || row === 20) &&
        !(col >= 5 && col <= 6) &&
        !(col >= 15 && col <= 16) &&
        !(col >= 24 && col <= 25) &&
        !(col >= 34 && col <= 35)
      ) {
        cells.push("solid");
      }
      // Breakable 2x2 cover blocks in each room center
      else if (
        (col % 10 === 5 || col % 10 === 6) &&
        (row % 10 === 5 || row % 10 === 6) &&
        col > 0 && col < cols - 1 &&
        row > 0 && row < rows - 1
      ) {
        cells.push("breakable");
      }
      else {
        cells.push("empty");
      }
    }
  }

  return cells;
}

export const MAP_LABYRINTH: MapDef = {
  id: "labyrinth",
  name: "Labyrinth",
  cols: 40,
  rows: 30,
  cellSize: 24,
  spawnPoints: [
    { x: 84, y: 84 },     // (3,3) top-left room
    { x: 468, y: 84 },    // (19,3) top-center
    { x: 852, y: 84 },    // (35,3) top-right room
    { x: 84, y: 372 },    // (3,15) mid-left room
    { x: 804, y: 372 },   // (33,15) mid-right room
    { x: 84, y: 660 },    // (3,27) bottom-left room
    { x: 852, y: 660 },   // (35,27) bottom-right room
  ],
  cells: generateLabyrinthCells(),
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const MAP_LIST: ReadonlyArray<MapDef> = [
  MAP_ARENA, MAP_BUNKER, MAP_CRUCIBLE, MAP_GRIDLOCK, MAP_LABYRINTH,
];

export const MAP_REGISTRY: Record<string, MapDef> = {};
for (const m of MAP_LIST) {
  MAP_REGISTRY[m.id] = m;
}

export function getMapDef(id: string): MapDef {
  return MAP_REGISTRY[id] ?? MAP_ARENA;
}
