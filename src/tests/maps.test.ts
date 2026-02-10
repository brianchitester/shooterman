import { describe, it, expect } from "vitest";
import { getMapDef, MAP_ARENA, MAP_REGISTRY } from "../core/defs/maps";
import { createGameState } from "../core/state/GameState";
import { BREAKABLE_TILE_HP } from "../core/state/Defaults";

describe("MapDef registry", () => {
  it("getMapDef('arena') returns MAP_ARENA", () => {
    const map = getMapDef("arena");
    expect(map).toBe(MAP_ARENA);
  });

  it("getMapDef('unknown') falls back to arena", () => {
    const map = getMapDef("unknown");
    expect(map).toBe(MAP_ARENA);
  });

  it("all registry entries have matching id", () => {
    for (const [key, def] of Object.entries(MAP_REGISTRY)) {
      expect(def.id).toBe(key);
    }
  });
});

describe("MAP_ARENA", () => {
  it("has correct dimensions", () => {
    expect(MAP_ARENA.cols).toBe(20);
    expect(MAP_ARENA.rows).toBe(15);
    expect(MAP_ARENA.cellSize).toBe(48);
  });

  it("has cells array of correct length", () => {
    expect(MAP_ARENA.cells.length).toBe(20 * 15);
  });

  it("has 7 spawn points", () => {
    expect(MAP_ARENA.spawnPoints.length).toBe(7);
  });

  it("border cells are solid", () => {
    // Top row
    for (let col = 0; col < 20; col++) {
      expect(MAP_ARENA.cells[col]).toBe("solid");
    }
    // Bottom row
    for (let col = 0; col < 20; col++) {
      expect(MAP_ARENA.cells[14 * 20 + col]).toBe("solid");
    }
    // Left/right edges
    for (let row = 0; row < 15; row++) {
      expect(MAP_ARENA.cells[row * 20]).toBe("solid");
      expect(MAP_ARENA.cells[row * 20 + 19]).toBe("solid");
    }
  });

  it("has breakable tiles in interior", () => {
    let breakableCount = 0;
    for (let i = 0; i < MAP_ARENA.cells.length; i++) {
      if (MAP_ARENA.cells[i] === "breakable") breakableCount++;
    }
    expect(breakableCount).toBeGreaterThan(0);
  });
});

describe("createGameState with MapDef", () => {
  it("builds correct TileGrid from MAP_ARENA", () => {
    const state = createGameState("coop", 2, 42, MAP_ARENA);
    expect(state.tiles.width).toBe(20);
    expect(state.tiles.height).toBe(15);
    expect(state.tiles.cellSize).toBe(48);
    expect(state.tiles.cells.length).toBe(300);
    expect(state.tiles.spawnPoints.length).toBe(7);
  });

  it("stores mapId in match state", () => {
    const state = createGameState("coop", 2, 42, MAP_ARENA);
    expect(state.match.mapId).toBe("arena");
  });

  it("breakable tiles have correct HP", () => {
    const state = createGameState("coop", 1, 42, MAP_ARENA);
    for (let i = 0; i < state.tiles.cells.length; i++) {
      if (state.tiles.cells[i].type === "breakable") {
        expect(state.tiles.cells[i].hp).toBe(BREAKABLE_TILE_HP);
      }
    }
  });

  it("default mapDef produces same state as explicit MAP_ARENA", () => {
    const stateDefault = createGameState("coop", 2, 42);
    const stateExplicit = createGameState("coop", 2, 42, MAP_ARENA);

    expect(stateDefault.tiles.width).toBe(stateExplicit.tiles.width);
    expect(stateDefault.tiles.height).toBe(stateExplicit.tiles.height);
    expect(stateDefault.tiles.cells.length).toBe(stateExplicit.tiles.cells.length);
    expect(stateDefault.match.mapId).toBe(stateExplicit.match.mapId);

    for (let i = 0; i < stateDefault.tiles.cells.length; i++) {
      expect(stateDefault.tiles.cells[i].type).toBe(stateExplicit.tiles.cells[i].type);
      expect(stateDefault.tiles.cells[i].hp).toBe(stateExplicit.tiles.cells[i].hp);
    }
  });

  it("players spawn at map spawn points", () => {
    const state = createGameState("coop", 3, 42, MAP_ARENA);
    for (let i = 0; i < 3; i++) {
      expect(state.players[i].pos.x).toBe(MAP_ARENA.spawnPoints[i].x);
      expect(state.players[i].pos.y).toBe(MAP_ARENA.spawnPoints[i].y);
    }
  });
});
