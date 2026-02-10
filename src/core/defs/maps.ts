import type { MapDef, MapColorScheme } from "./MapDef";
import type { TileType } from "../state/Types";

export const DEFAULT_MAP_COLORS: MapColorScheme = {
  background: 0x1a1a2e,
  solid: 0x444444,
  breakable: 0x8b6914,
  breakableDamaged: 0x5c470e,
  crack: 0x3a2f0a,
};

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
  colors: {
    background: 0x1a1a2e,
    solid: 0x444444,
    breakable: 0x8b6914,
    breakableDamaged: 0x5c470e,
    crack: 0x3a2f0a,
  },
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
  colors: {
    background: 0x0e1a0e,
    solid: 0x2d4a2d,
    breakable: 0x556b2f,
    breakableDamaged: 0x3a4a1e,
    crack: 0x2a3510,
  },
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
  colors: {
    background: 0x1a0e0e,
    solid: 0x4a2d2d,
    breakable: 0x8b2500,
    breakableDamaged: 0x5c1a00,
    crack: 0x3a1000,
  },
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
  colors: {
    background: 0x0a0a1e,
    solid: 0x1a3a5c,
    breakable: 0x2980b9,
    breakableDamaged: 0x1a5276,
    crack: 0x0e3a52,
  },
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
  colors: {
    background: 0x1a1a16,
    solid: 0x4a4a3a,
    breakable: 0x6b6b4a,
    breakableDamaged: 0x4a4a32,
    crack: 0x33331e,
  },
};

// ---------------------------------------------------------------------------
// MAP: Fortress (80x60) — cellSize 12, dense breakable fill
// ---------------------------------------------------------------------------

function generateFortressCells(): TileType[] {
  const cols = 80;
  const rows = 60;
  const cells: TileType[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Border walls
      if (row === 0 || row === rows - 1 || col === 0 || col === cols - 1) {
        cells.push("solid");
        continue;
      }

      // 4-wide corridors: horizontal at rows 14-17, 29-32, 44-47
      const inHCorridor =
        (row >= 14 && row <= 17) ||
        (row >= 29 && row <= 32) ||
        (row >= 44 && row <= 47);

      // 4-wide corridors: vertical at cols 19-22, 39-42, 59-62
      const inVCorridor =
        (col >= 19 && col <= 22) ||
        (col >= 39 && col <= 42) ||
        (col >= 59 && col <= 62);

      if (inHCorridor || inVCorridor) {
        // Corridors are always open — override everything
        cells.push("empty");
      }
      // Solid 2x2 pillars on a 12-cell grid (permanent landmarks)
      else if (
        row % 12 < 2 && col % 12 < 2 &&
        row >= 2 && row <= rows - 3 && col >= 2 && col <= cols - 3
      ) {
        cells.push("solid");
      }
      // Everything else: breakable
      else {
        cells.push("breakable");
      }
    }
  }

  return cells;
}

export const MAP_FORTRESS: MapDef = {
  id: "fortress",
  name: "Fortress",
  cols: 80,
  rows: 60,
  cellSize: 12,
  spawnPoints: [
    { x: 246, y: 186 },   // (20,15) top-left intersection
    { x: 726, y: 186 },   // (60,15) top-right intersection
    { x: 486, y: 366 },   // (40,30) dead center
    { x: 246, y: 546 },   // (20,45) bottom-left intersection
    { x: 726, y: 546 },   // (60,45) bottom-right intersection
    { x: 54, y: 366 },    // (4,30) far left corridor
    { x: 918, y: 366 },   // (76,30) far right corridor
  ],
  cells: generateFortressCells(),
  colors: {
    background: 0x140e1a,
    solid: 0x3a2d4a,
    breakable: 0x5b3a7a,
    breakableDamaged: 0x3d2652,
    crack: 0x2a1a3a,
  },
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const MAP_LIST: ReadonlyArray<MapDef> = [
  MAP_ARENA, MAP_BUNKER, MAP_CRUCIBLE, MAP_GRIDLOCK, MAP_LABYRINTH, MAP_FORTRESS,
];

export const MAP_REGISTRY: Record<string, MapDef> = {};
for (const m of MAP_LIST) {
  MAP_REGISTRY[m.id] = m;
}

export function getMapDef(id: string): MapDef {
  return MAP_REGISTRY[id] ?? MAP_ARENA;
}
