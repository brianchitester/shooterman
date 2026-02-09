import { describe, it, expect } from "vitest";
import { createGameState, addPlayerToState } from "../core/state/GameState";
import { PLAYER_HP, SPAWN_INVULN_DURATION, SHARED_LIVES_BASE } from "../core/state/Defaults";

describe("addPlayerToState", () => {
  it("creates player at correct slot", () => {
    const state = createGameState("coop", 1, 42);
    expect(state.players.length).toBe(1);

    const newPlayer = addPlayerToState(state);
    expect(state.players.length).toBe(2);
    expect(newPlayer.slot).toBe(1);
    expect(newPlayer.alive).toBe(true);
    expect(newPlayer.hp).toBe(PLAYER_HP);
  });

  it("gives spawn invuln", () => {
    const state = createGameState("coop", 1, 42);
    const newPlayer = addPlayerToState(state);
    expect(newPlayer.invulnTimer).toBe(SPAWN_INVULN_DURATION);
  });

  it("increments shared lives in co-op", () => {
    const state = createGameState("coop", 1, 42);
    const initialLives = state.match.sharedLives;
    expect(initialLives).toBe(SHARED_LIVES_BASE); // base + (1-1)

    addPlayerToState(state);
    expect(state.match.sharedLives).toBe(initialLives + 1);
  });

  it("does not change lives in PvP", () => {
    const state = createGameState("pvp_time", 1, 42);
    expect(state.match.sharedLives).toBe(0);

    addPlayerToState(state);
    expect(state.match.sharedLives).toBe(0);
  });

  it("assigns correct entity ID", () => {
    const state = createGameState("coop", 1, 42);
    const prevNextId = state.match.nextEntityId;

    const newPlayer = addPlayerToState(state);
    expect(newPlayer.id).toBe(prevNextId);
    expect(state.match.nextEntityId).toBe(prevNextId + 1);
  });
});
