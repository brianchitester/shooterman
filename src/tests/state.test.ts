import { describe, it, expect } from "vitest";
import { createGameState, cloneState } from "../core/state/GameState";
import { MAX_BULLETS, MAX_ENEMIES, PLAYER_HP, SHARED_LIVES_BASE } from "../core/state/Defaults";
import { MAP_ARENA } from "../core/defs/maps";

describe("createGameState", () => {
  it("creates correct number of players", () => {
    const state = createGameState("coop", 4, 42);
    expect(state.players.length).toBe(4);
  });

  it("pre-allocates bullet pool", () => {
    const state = createGameState("coop", 2, 42);
    expect(state.bullets.length).toBe(MAX_BULLETS);
    for (let i = 0; i < state.bullets.length; i++) {
      expect(state.bullets[i].active).toBe(false);
    }
  });

  it("pre-allocates enemy pool", () => {
    const state = createGameState("coop", 2, 42);
    expect(state.enemies.length).toBe(MAX_ENEMIES);
    for (let i = 0; i < state.enemies.length; i++) {
      expect(state.enemies[i].active).toBe(false);
    }
  });

  it("creates tile grid with correct dimensions", () => {
    const state = createGameState("coop", 1, 42);
    expect(state.tiles.width).toBe(MAP_ARENA.cols);
    expect(state.tiles.height).toBe(MAP_ARENA.rows);
    expect(state.tiles.cells.length).toBe(MAP_ARENA.cols * MAP_ARENA.rows);
  });

  it("sets default player values", () => {
    const state = createGameState("pvp_time", 3, 42);
    for (let i = 0; i < state.players.length; i++) {
      const p = state.players[i];
      expect(p.hp).toBe(PLAYER_HP);
      expect(p.alive).toBe(true);
      expect(p.downed).toBe(false);
      expect(p.slot).toBe(i);
      expect(p.kills).toBe(0);
      expect(p.deaths).toBe(0);
    }
  });

  it("sets co-op shared lives correctly", () => {
    const state = createGameState("coop", 4, 42);
    expect(state.match.sharedLives).toBe(SHARED_LIVES_BASE + 3);
  });

  it("sets pvp shared lives to 0", () => {
    const state = createGameState("pvp_time", 4, 42);
    expect(state.match.sharedLives).toBe(0);
  });

  it("assigns unique entity IDs to players", () => {
    const state = createGameState("coop", 7, 42);
    const ids = new Set(state.players.map(p => p.id));
    expect(ids.size).toBe(7);
  });

  it("stores rngSeed in match state", () => {
    const state = createGameState("coop", 1, 12345);
    expect(state.match.rngSeed).toBe(12345);
    expect(state.match.rngState).toBe(12345);
  });

  it("has border tiles as solid", () => {
    const state = createGameState("coop", 1, 42);
    // Top-left corner
    expect(state.tiles.cells[0].type).toBe("solid");
    // Bottom-right corner
    expect(state.tiles.cells[MAP_ARENA.rows * MAP_ARENA.cols - 1].type).toBe("solid");
  });
});

describe("cloneState", () => {
  it("produces a deep copy", () => {
    const state = createGameState("coop", 2, 42);
    const clone = cloneState(state);

    // Modify original
    state.players[0].pos.x = 999;
    state.match.tick = 100;
    state.tiles.cells[10].hp = 99;

    // Clone unaffected
    expect(clone.players[0].pos.x).not.toBe(999);
    expect(clone.match.tick).toBe(0);
    expect(clone.tiles.cells[10].hp).not.toBe(99);
  });
});
