import type { GameState } from "../../state/Types";

export function modeRulesSystem(state: GameState, dt: number): void {
  if (state.match.mode === "coop") {
    coopRules(state);
  } else {
    pvpRules(state);
  }
}

function coopRules(state: GameState): void {
  // Check game over: 0 shared lives AND all players are not alive and not downed
  if (state.match.sharedLives > 0) return;

  let anyAliveOrDowned = false;
  for (let i = 0; i < state.players.length; i++) {
    if (state.players[i].alive || state.players[i].downed) {
      anyAliveOrDowned = true;
      break;
    }
  }

  if (!anyAliveOrDowned) {
    // Game over — could emit an event or set a flag
    // For now, the tick just stops advancing meaningfully
    // (M1 doesn't have end-screen UI)
  }
}

function pvpRules(state: GameState): void {
  // PvP time mode: match timer tracked by tick count
  // End condition will be checked by UI layer reading match.tick
  // Score = kills tracked per player
}
