import { describe, it, expect } from "vitest";
import {
  getMapDef, MAP_ARENA, MAP_BUNKER, MAP_CRUCIBLE, MAP_GRIDLOCK, MAP_LABYRINTH,
  MAP_LIST, MAP_REGISTRY,
} from "../core/defs/maps";
import type { MapDef } from "../core/defs/MapDef";
import { createGameState } from "../core/state/GameState";
import { createRng } from "../core/sim/rng/seedRng";
import { createEventBus } from "../core/events/EventBus";
import { step } from "../core/sim/tick";
import type { PlayerIntent } from "../core/state/Types";
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

describe("MAP_BUNKER", () => {
  it("has correct dimensions", () => {
    expect(MAP_BUNKER.cols).toBe(16);
    expect(MAP_BUNKER.rows).toBe(12);
    expect(MAP_BUNKER.cellSize).toBe(48);
  });

  it("has cells array of correct length", () => {
    expect(MAP_BUNKER.cells.length).toBe(16 * 12);
  });

  it("has at least 5 spawn points", () => {
    expect(MAP_BUNKER.spawnPoints.length).toBeGreaterThanOrEqual(5);
  });

  it("border cells are solid", () => {
    const { cols, rows, cells } = MAP_BUNKER;
    // Top row
    for (let col = 0; col < cols; col++) {
      expect(cells[col]).toBe("solid");
    }
    // Bottom row
    for (let col = 0; col < cols; col++) {
      expect(cells[(rows - 1) * cols + col]).toBe("solid");
    }
    // Left/right edges
    for (let row = 0; row < rows; row++) {
      expect(cells[row * cols]).toBe("solid");
      expect(cells[row * cols + cols - 1]).toBe("solid");
    }
  });

  it("has breakable tiles in interior", () => {
    let breakableCount = 0;
    for (let i = 0; i < MAP_BUNKER.cells.length; i++) {
      if (MAP_BUNKER.cells[i] === "breakable") breakableCount++;
    }
    expect(breakableCount).toBeGreaterThan(0);
  });

  it("getMapDef('bunker') returns MAP_BUNKER", () => {
    expect(getMapDef("bunker")).toBe(MAP_BUNKER);
  });
});

describe("MAP_LIST registry", () => {
  it("contains all 5 maps", () => {
    expect(MAP_LIST.length).toBe(5);
  });

  it("all maps have unique ids", () => {
    const ids = MAP_LIST.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("createGameState with MAP_BUNKER", () => {
  it("builds correct TileGrid", () => {
    const state = createGameState("coop", 2, 42, MAP_BUNKER);
    expect(state.tiles.width).toBe(16);
    expect(state.tiles.height).toBe(12);
    expect(state.tiles.cellSize).toBe(48);
    expect(state.tiles.cells.length).toBe(192);
    expect(state.match.mapId).toBe("bunker");
  });

  it("players spawn at bunker spawn points", () => {
    const state = createGameState("coop", 3, 42, MAP_BUNKER);
    for (let i = 0; i < 3; i++) {
      expect(state.players[i].pos.x).toBe(MAP_BUNKER.spawnPoints[i].x);
      expect(state.players[i].pos.y).toBe(MAP_BUNKER.spawnPoints[i].y);
    }
  });

  it("runs 600 ticks deterministically on bunker", () => {
    function runSim(seed: number) {
      const state = createGameState("coop", 2, seed, MAP_BUNKER);
      const rng = createRng(seed);
      const events = createEventBus();
      const intents: PlayerIntent[] = [
        { move: { x: 1, y: 0 }, aim: { x: 1, y: 0 }, shoot: true, revive: false },
        { move: { x: -1, y: 0 }, aim: { x: -1, y: 0 }, shoot: true, revive: false },
      ];
      for (let t = 0; t < 600; t++) {
        step(state, intents, rng, events);
        events.drain();
      }
      return state;
    }

    const a = runSim(99);
    const b = runSim(99);

    expect(a.match.tick).toBe(b.match.tick);
    expect(a.match.score).toBe(b.match.score);
    for (let i = 0; i < a.players.length; i++) {
      expect(a.players[i].pos.x).toBe(b.players[i].pos.x);
      expect(a.players[i].pos.y).toBe(b.players[i].pos.y);
      expect(a.players[i].hp).toBe(b.players[i].hp);
    }
  });
});

// --- Generic validation helper for new maps ---

function validateMapDef(map: MapDef) {
  describe(`${map.name} (${map.cols}x${map.rows}, cellSize ${map.cellSize})`, () => {
    it("has correct cell count", () => {
      expect(map.cells.length).toBe(map.cols * map.rows);
    });

    it("fits within 960x720 viewport", () => {
      expect(map.cols * map.cellSize).toBeLessThanOrEqual(960);
      expect(map.rows * map.cellSize).toBeLessThanOrEqual(720);
    });

    it("has at least 5 spawn points", () => {
      expect(map.spawnPoints.length).toBeGreaterThanOrEqual(5);
    });

    it("border cells are solid", () => {
      const { cols, rows, cells } = map;
      for (let col = 0; col < cols; col++) {
        expect(cells[col]).toBe("solid");
        expect(cells[(rows - 1) * cols + col]).toBe("solid");
      }
      for (let row = 0; row < rows; row++) {
        expect(cells[row * cols]).toBe("solid");
        expect(cells[row * cols + cols - 1]).toBe("solid");
      }
    });

    it("has breakable tiles", () => {
      let count = 0;
      for (let i = 0; i < map.cells.length; i++) {
        if (map.cells[i] === "breakable") count++;
      }
      expect(count).toBeGreaterThan(0);
    });

    it("spawn points are on empty tiles", () => {
      for (const sp of map.spawnPoints) {
        const col = Math.floor(sp.x / map.cellSize);
        const row = Math.floor(sp.y / map.cellSize);
        const idx = row * map.cols + col;
        expect(map.cells[idx]).toBe("empty");
      }
    });

    it("spawn points are within map bounds", () => {
      const maxX = map.cols * map.cellSize;
      const maxY = map.rows * map.cellSize;
      for (const sp of map.spawnPoints) {
        expect(sp.x).toBeGreaterThan(0);
        expect(sp.x).toBeLessThan(maxX);
        expect(sp.y).toBeGreaterThan(0);
        expect(sp.y).toBeLessThan(maxY);
      }
    });

    it("registry lookup works", () => {
      expect(getMapDef(map.id)).toBe(map);
    });

    it("runs 600 ticks deterministically", () => {
      function runSim(seed: number) {
        const state = createGameState("coop", 2, seed, map);
        const rng = createRng(seed);
        const events = createEventBus();
        const intents: PlayerIntent[] = [
          { move: { x: 1, y: 0 }, aim: { x: 1, y: 0 }, shoot: true, revive: false },
          { move: { x: -1, y: 0 }, aim: { x: -1, y: 0 }, shoot: true, revive: false },
        ];
        for (let t = 0; t < 600; t++) {
          step(state, intents, rng, events);
          events.drain();
        }
        return state;
      }

      const a = runSim(77);
      const b = runSim(77);
      expect(a.match.tick).toBe(b.match.tick);
      expect(a.match.score).toBe(b.match.score);
      for (let i = 0; i < a.players.length; i++) {
        expect(a.players[i].pos.x).toBe(b.players[i].pos.x);
        expect(a.players[i].pos.y).toBe(b.players[i].pos.y);
      }
    });
  });
}

validateMapDef(MAP_CRUCIBLE);
validateMapDef(MAP_GRIDLOCK);
validateMapDef(MAP_LABYRINTH);
