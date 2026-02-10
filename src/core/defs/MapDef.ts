import type { TileType } from "../state/Types";

export interface MapColorScheme {
  background: number;      // arena fill
  solid: number;           // solid tile fill
  breakable: number;       // breakable tile full HP
  breakableDamaged: number; // breakable tile low HP
  crack: number;           // crack lines on damaged tiles
}

export interface MapDef {
  id: string;
  name: string;
  cols: number;
  rows: number;
  cellSize: number;
  spawnPoints: ReadonlyArray<{ x: number; y: number }>;
  cells: ReadonlyArray<TileType>;  // row-major, length = cols * rows
  colors?: MapColorScheme;
}
