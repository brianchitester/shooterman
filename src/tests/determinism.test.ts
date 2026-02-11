import { describe, it, expect } from "vitest";
import { createGameState, cloneState } from "../core/state/GameState";
import { createRng } from "../core/sim/rng/seedRng";
import { createEventBus } from "../core/events/EventBus";
import { step } from "../core/sim/tick";
import type { PlayerIntent, GameState } from "../core/state/Types";

function emptyIntents(count: number): PlayerIntent[] {
  const intents: PlayerIntent[] = [];
  for (let i = 0; i < count; i++) {
    intents[i] = { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, shoot: false, revive: false };
  }
  return intents;
}

function shootIntents(count: number): PlayerIntent[] {
  const intents: PlayerIntent[] = [];
  for (let i = 0; i < count; i++) {
    intents[i] = { move: { x: 1, y: 0 }, aim: { x: 1, y: 0 }, shoot: true, revive: false };
  }
  return intents;
}

function runSimulation(mode: "coop" | "pvp_time", playerCount: number, seed: number, ticks: number): GameState {
  const state = createGameState(mode, playerCount, seed);
  const rng = createRng(seed);
  const events = createEventBus();

  for (let t = 0; t < ticks; t++) {
    // Alternate between shooting and moving to exercise more systems
    const intents = t % 3 === 0 ? shootIntents(playerCount) : emptyIntents(playerCount);
    step(state, intents, rng, events);
    events.clear();
    if (state.match.gameOver) break;
  }

  return state;
}

function statesEqual(a: GameState, b: GameState): boolean {
  // Compare match state
  if (a.match.tick !== b.match.tick) return false;
  if (a.match.score !== b.match.score) return false;
  if (a.match.rngState !== b.match.rngState) return false;
  if (a.match.nextEntityId !== b.match.nextEntityId) return false;
  if (a.match.gameOver !== b.match.gameOver) return false;
  if (a.match.sharedLives !== b.match.sharedLives) return false;
  if (a.match.spawnCount !== b.match.spawnCount) return false;

  // Compare players
  if (a.players.length !== b.players.length) return false;
  for (let i = 0; i < a.players.length; i++) {
    const pa = a.players[i];
    const pb = b.players[i];
    if (pa.pos.x !== pb.pos.x || pa.pos.y !== pb.pos.y) return false;
    if (pa.hp !== pb.hp) return false;
    if (pa.alive !== pb.alive) return false;
    if (pa.kills !== pb.kills || pa.deaths !== pb.deaths) return false;
    if (pa.fireCooldown !== pb.fireCooldown) return false;
    if (pa.invulnTimer !== pb.invulnTimer) return false;
    if (pa.weaponId !== pb.weaponId) return false;
  }

  // Compare bullets
  for (let i = 0; i < a.bullets.length; i++) {
    const ba = a.bullets[i];
    const bb = b.bullets[i];
    if (ba.active !== bb.active) return false;
    if (ba.active) {
      if (ba.pos.x !== bb.pos.x || ba.pos.y !== bb.pos.y) return false;
      if (ba.vel.x !== bb.vel.x || ba.vel.y !== bb.vel.y) return false;
      if (ba.ttl !== bb.ttl) return false;
      if (ba.ownerId !== bb.ownerId) return false;
      if (ba.weaponId !== bb.weaponId) return false;
    }
  }

  // Compare enemies
  for (let i = 0; i < a.enemies.length; i++) {
    const ea = a.enemies[i];
    const eb = b.enemies[i];
    if (ea.active !== eb.active) return false;
    if (ea.active) {
      if (ea.pos.x !== eb.pos.x || ea.pos.y !== eb.pos.y) return false;
      if (ea.hp !== eb.hp) return false;
      if (ea.typeId !== eb.typeId) return false;
    }
  }

  // Compare tiles
  for (let i = 0; i < a.tiles.cells.length; i++) {
    if (a.tiles.cells[i].type !== b.tiles.cells[i].type) return false;
    if (a.tiles.cells[i].hp !== b.tiles.cells[i].hp) return false;
  }

  return true;
}

describe("determinism", () => {
  it("two identical co-op simulations produce identical final state (600 ticks)", () => {
    const stateA = runSimulation("coop", 2, 12345, 600);
    const stateB = runSimulation("coop", 2, 12345, 600);

    expect(stateA.match.tick).toBe(stateB.match.tick);
    expect(stateA.match.rngState).toBe(stateB.match.rngState);
    expect(statesEqual(stateA, stateB)).toBe(true);
  });

  it("two identical pvp simulations produce identical final state (600 ticks)", () => {
    const stateA = runSimulation("pvp_time", 2, 99999, 600);
    const stateB = runSimulation("pvp_time", 2, 99999, 600);

    expect(stateA.match.tick).toBe(stateB.match.tick);
    expect(stateA.match.rngState).toBe(stateB.match.rngState);
    expect(statesEqual(stateA, stateB)).toBe(true);
  });

  it("different seeds produce different states", () => {
    const stateA = runSimulation("coop", 2, 111, 600);
    const stateB = runSimulation("coop", 2, 222, 600);

    expect(stateA.match.rngState).not.toBe(stateB.match.rngState);
  });

  it("4-player co-op determinism (600 ticks)", () => {
    const stateA = runSimulation("coop", 4, 42, 600);
    const stateB = runSimulation("coop", 4, 42, 600);

    expect(statesEqual(stateA, stateB)).toBe(true);
  });
});
