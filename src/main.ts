import { createGameState } from "./core/state/GameState";
import { createRng } from "./core/sim/rng/seedRng";
import { createEventBus } from "./core/events/EventBus";
import { step } from "./core/sim/tick";
import { TICKS_PER_SECOND } from "./core/state/Defaults";
import type { PlayerIntent } from "./core/state/Types";

const PLAYER_COUNT = 4;
const SEED = 42;
const TOTAL_TICKS = TICKS_PER_SECOND * 60; // 60 seconds

const state = createGameState("coop", PLAYER_COUNT, SEED);
const rng = createRng(SEED);
const events = createEventBus();

// Empty intents for all players
const emptyIntents: PlayerIntent[] = [];
for (let i = 0; i < PLAYER_COUNT; i++) {
  emptyIntents[i] = { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, shoot: false, revive: false };
}

console.log("=== Shooterman M1: Tick Loop Proof of Life ===");
console.log(`Mode: ${state.match.mode} | Players: ${PLAYER_COUNT} | Seed: ${SEED}`);
console.log(`Running ${TOTAL_TICKS} ticks (${TOTAL_TICKS / TICKS_PER_SECOND}s of sim time)...\n`);

for (let tick = 0; tick < TOTAL_TICKS; tick++) {
  step(state, emptyIntents, rng, events);

  // Log summary every second
  if (state.match.tick % TICKS_PER_SECOND === 0) {
    const sec = state.match.tick / TICKS_PER_SECOND;
    let activeEnemies = 0;
    for (let i = 0; i < state.enemies.length; i++) {
      if (state.enemies[i].active) activeEnemies++;
    }
    let activeBullets = 0;
    for (let i = 0; i < state.bullets.length; i++) {
      if (state.bullets[i].active) activeBullets++;
    }
    const evts = events.drain();
    console.log(
      `t=${sec}s | tick=${state.match.tick} | enemies=${activeEnemies} | bullets=${activeBullets} | score=${state.match.score} | lives=${state.match.sharedLives} | events=${evts.length}`
    );
  }
}

const aliveCount = state.players.filter(p => p.alive).length;
const downedCount = state.players.filter(p => p.downed).length;
console.log(`\n=== Final State ===`);
console.log(`Tick: ${state.match.tick} | Score: ${state.match.score} | Lives: ${state.match.sharedLives}`);
console.log(`Players alive: ${aliveCount} | Downed: ${downedCount}`);
console.log(`Next entity ID: ${state.match.nextEntityId}`);
console.log("M1 complete.");
