import type { MapDef } from "./MapDef";
import type { TileType } from "../state/Types";

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

export const MAP_REGISTRY: Record<string, MapDef> = {
  [MAP_ARENA.id]: MAP_ARENA,
};

export function getMapDef(id: string): MapDef {
  return MAP_REGISTRY[id] ?? MAP_ARENA;
}
