# Adding a New Map

This guide walks through adding a new map to the game. The map system is fully data-driven -- you define a map as a `MapDef` object and register it. No simulation, rendering, or collision code needs to change.

## Quick Start

Open `src/core/defs/maps.ts` and follow these 3 steps:

### 1. Define your map

```ts
export const MAP_MYMAP: MapDef = {
  id: "mymap",              // unique string id
  name: "My Map",           // display name shown in lobby
  cols: 16,                 // number of tile columns
  rows: 12,                 // number of tile rows
  cellSize: 48,             // pixels per tile (always 48)
  spawnPoints: [
    { x: 72, y: 72 },      // player 1 spawn (pixel coords)
    { x: 696, y: 72 },     // player 2 spawn
    // ... up to 7 spawn points for 7 players
  ],
  cells: parseLayout([
    "################",
    "#..............#",
    "#..XX....XX....#",
    "#..............#",
    "#....##..##....#",
    "#..............#",
    "#..............#",
    "#....##..##....#",
    "#..............#",
    "#..XX....XX....#",
    "#..............#",
    "################",
  ].join(""), 16),          // pass cols as second arg
};
```

### 2. Add it to MAP_LIST

Find the `MAP_LIST` array near the bottom of the file and add your map:

```ts
export const MAP_LIST: ReadonlyArray<MapDef> = [MAP_ARENA, MAP_BUNKER, MAP_MYMAP];
```

The registry and `getMapDef()` lookup are built automatically from this list.

### 3. Done

The lobby will now show your map in the UP/DOWN cycle. The camera auto-centers maps smaller than 960x720 in the viewport.

## MapDef Reference

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier, used internally and in saved state |
| `name` | `string` | Human-readable name shown in the lobby |
| `cols` | `number` | Grid width in tiles |
| `rows` | `number` | Grid height in tiles |
| `cellSize` | `number` | Pixel size of each tile (always 48) |
| `spawnPoints` | `{x, y}[]` | Player spawn positions in pixel coordinates |
| `cells` | `TileType[]` | Flat row-major array of tile types, length = cols * rows |

## ASCII Layout

The `parseLayout()` helper converts a visual string into a `TileType[]` array:

| Character | Tile Type | Description |
|-----------|-----------|-------------|
| `#` | `"solid"` | Indestructible wall, blocks all movement and bullets |
| `X` | `"breakable"` | Destructible wall (2 HP), can be shot through after breaking |
| `.` | `"empty"` | Open floor, players and enemies move freely |

Whitespace and newlines are ignored, so you can write each row as a separate string for readability.

## Layout Rules

- **Borders must be solid.** The entire first row, last row, first column, and last column should be `#`. If you leave gaps, entities can escape the map.
- **Spawn points must be on empty tiles.** Place spawn points in open areas, not inside walls. Coordinates are in pixels: `x = col * 48 + 24`, `y = row * 48 + 24` (center of the tile).
- **Provide at least 5 spawn points.** The game supports up to 7 players. If a map has fewer spawn points than players, extra players wrap around to reuse earlier points.
- **Length must match.** `cells` must have exactly `cols * rows` entries. If you use `parseLayout()`, make sure each row string has exactly `cols` characters.

## Map Sizing

- The viewport is fixed at 960x720 pixels.
- A 20x15 map at 48px cells fills the viewport exactly (960x720).
- Smaller maps are auto-centered with dark margins. A 16x12 map (768x576) gets 96px horizontal and 72px vertical margins.
- Maps larger than 960x720 will extend beyond the viewport edges. There is no camera scrolling, so keep the total pixel size (`cols * cellSize` x `rows * cellSize`) at or under 960x720.

## Cell Size and Map Detail

The default `cellSize` is 48, but you can use smaller values for higher-resolution map geometry. A smaller cell size means more tiles in the same screen space, allowing more detailed layouts.

| cellSize | Grid for 960x720 | Tiles | Detail level |
|----------|-------------------|-------|-------------|
| 48 | 20x15 | 300 | Standard |
| 32 | 30x22 | 660 | Fine |
| 24 | 40x30 | 1200 | Very fine |

Entity sizes, speeds, and radii are all in pixels, so they stay the same regardless of cell size. A player is always 32px wide and moves at 250px/s -- only the tile grid gets finer.

**Corridor width matters**: A player is 32px in diameter. At cellSize 24, a 1-tile corridor (24px) is too narrow to walk through. Keep corridors at least `ceil(32 / cellSize)` tiles wide -- 2 tiles at cellSize 24, 1 tile at cellSize 48.

## Spawn Point Coordinates

Spawn points use **pixel coordinates**, not grid coordinates. To place a spawn at the center of grid position (col, row):

```
x = col * cellSize + cellSize / 2
y = row * cellSize + cellSize / 2
```

For example, grid position (1, 1) at cellSize 48:
```
x = 1 * 48 + 24 = 72
y = 1 * 48 + 24 = 72
```

At cellSize 24:
```
x = 1 * 24 + 12 = 36
y = 1 * 24 + 12 = 36
```

## Testing Your Map

Add tests in `src/tests/maps.test.ts` to validate your map:

```ts
describe("MAP_MYMAP", () => {
  it("has correct dimensions", () => {
    expect(MAP_MYMAP.cols).toBe(16);
    expect(MAP_MYMAP.rows).toBe(12);
  });

  it("has cells array of correct length", () => {
    expect(MAP_MYMAP.cells.length).toBe(16 * 12);
  });

  it("border cells are solid", () => {
    const { cols, rows, cells } = MAP_MYMAP;
    for (let col = 0; col < cols; col++) {
      expect(cells[col]).toBe("solid");
      expect(cells[(rows - 1) * cols + col]).toBe("solid");
    }
    for (let row = 0; row < rows; row++) {
      expect(cells[row * cols]).toBe("solid");
      expect(cells[row * cols + cols - 1]).toBe("solid");
    }
  });
});
```

Run tests with `npm test`.

## Files Involved

| File | Role |
|------|------|
| `src/core/defs/MapDef.ts` | `MapDef` interface definition |
| `src/core/defs/maps.ts` | All map definitions, registry, `parseLayout()` |
| `src/tests/maps.test.ts` | Map tests |
