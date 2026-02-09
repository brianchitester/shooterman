import type { GameState } from "../../state/Types";
import { PVP_MATCH_DURATION } from "../../state/Defaults";

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
    state.match.gameOver = true;
  }
}

function pvpRules(state: GameState): void {
  if (state.match.tick >= PVP_MATCH_DURATION) {
    state.match.gameOver = true;
  }
}
