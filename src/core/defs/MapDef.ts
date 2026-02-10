import type { TileType } from "../state/Types";

export interface MapDef {
  id: string;
  name: string;
  cols: number;
  rows: number;
  cellSize: number;
  spawnPoints: ReadonlyArray<{ x: number; y: number }>;
  cells: ReadonlyArray<TileType>;  // row-major, length = cols * rows
}
