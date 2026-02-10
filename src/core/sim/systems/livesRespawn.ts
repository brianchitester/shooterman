import type { GameState, PlayerIntent } from "../../state/Types";
import type { EventBus } from "../../events/EventBus";
import {
  PVP_RESPAWN_DELAY, SPAWN_INVULN_DURATION,
  DOWNED_BLEEDOUT_TIMER, REVIVE_HOLD_TIME, REVIVE_RADIUS,
  PLAYER_HP,
} from "../../state/Defaults";

export function livesRespawnSystem(
  state: GameState,
  intents: PlayerIntent[],
  dt: number,
  events: EventBus,
): void {
  if (state.match.mode === "coop") {
    coopLivesSystem(state, intents, events);
  } else {
    pvpRespawnSystem(state, events);
  }

  // Tick down invuln timers for all players
  for (let i = 0; i < state.players.length; i++) {
    const player = state.players[i];
    if (player.invulnTimer > 0) {
      player.invulnTimer--;
    }
  }
}

function coopLivesSystem(state: GameState, intents: PlayerIntent[], events: EventBus): void {
  for (let i = 0; i < state.players.length; i++) {
    const player = state.players[i];

    // Handle downed state
    if (player.downed) {
      player.downedTimer--;

      if (player.downedTimer <= 0) {
        // Bleed out
        player.downed = false;
        player.alive = false;
        events.emit({ type: "player_bled_out", playerId: player.id });

        // Consume a shared life to respawn
        if (state.match.sharedLives > 0) {
          state.match.sharedLives--;
          respawnPlayer(state, player, events);
        }
        continue;
      }

      // Check if someone is reviving this player
      let beingRevived = false;
      for (let r = 0; r < state.players.length; r++) {
        if (r === i) continue;
        const reviver = state.players[r];
        if (!reviver.alive || reviver.downed) continue;

        const intent = intents[r];
        if (intent === undefined || !intent.revive) continue;

        // Check distance
        const dx = reviver.pos.x - player.pos.x;
        const dy = reviver.pos.y - player.pos.y;
        if (dx * dx + dy * dy > REVIVE_RADIUS * REVIVE_RADIUS) continue;

        // This reviver is in range and pressing revive
        if (player.reviverId === null || player.reviverId === reviver.id) {
          if (player.reviverId === null) {
            player.reviverId = reviver.id;
            events.emit({
              type: "revive_start",
              targetId: player.id,
              reviverId: reviver.id,
            });
          }
          player.reviveProgress++;
          beingRevived = true;

          if (player.reviveProgress >= REVIVE_HOLD_TIME) {
            // Revive complete
            player.downed = false;
            player.alive = true;
            player.hp = PLAYER_HP;
            player.downedTimer = 0;
            player.reviveProgress = 0;
            player.reviverId = null;
            player.invulnTimer = SPAWN_INVULN_DURATION;
            events.emit({
              type: "revive_complete",
              targetId: player.id,
              reviverId: reviver.id,
            });
          }
          break; // Only one reviver at a time
        }
      }

      if (!beingRevived && player.reviverId !== null) {
        events.emit({ type: "revive_cancelled", targetId: player.id });
        player.reviverId = null;
        player.reviveProgress = 0;
      }
      continue;
    }

    // Dead (not downed) — waiting for respawn with shared lives
    if (!player.alive && !player.downed) {
      // In co-op, death after bleed-out already handled above
      // If somehow dead without going through downed, attempt respawn
      if (state.match.sharedLives > 0) {
        state.match.sharedLives--;
        respawnPlayer(state, player, events);
      }
    }
  }
}

function pvpRespawnSystem(state: GameState, events: EventBus): void {
  for (let i = 0; i < state.players.length; i++) {
    const player = state.players[i];
    if (player.alive) continue;

    if (player.respawnTimer > 0) {
      player.respawnTimer--;
    } else {
      respawnPlayer(state, player, events);
    }
  }
}

function respawnPlayer(state: GameState, player: typeof state.players[0], events: EventBus): void {
  // Choose spawn point with maximum minimum distance from all living threats
  let bestSpawn = 0;
  let bestMinDist = -1;

  const spawnPoints = state.tiles.spawnPoints;
  for (let s = 0; s < spawnPoints.length; s++) {
    const sp = spawnPoints[s];
    let minDist = Infinity;

    // Check distance from alive players (threats in PvP)
    for (let p = 0; p < state.players.length; p++) {
      const other = state.players[p];
      if (other.id === player.id) continue;
      if (!other.alive) continue;
      const dx = sp.x - other.pos.x;
      const dy = sp.y - other.pos.y;
      const d = dx * dx + dy * dy;
      if (d < minDist) minDist = d;
    }

    // Check distance from active enemies
    for (let e = 0; e < state.enemies.length; e++) {
      const enemy = state.enemies[e];
      if (!enemy.active) continue;
      const dx = sp.x - enemy.pos.x;
      const dy = sp.y - enemy.pos.y;
      const d = dx * dx + dy * dy;
      if (d < minDist) minDist = d;
    }

    if (minDist > bestMinDist) {
      bestMinDist = minDist;
      bestSpawn = s;
    }
  }

  const sp = spawnPoints[bestSpawn];
  player.pos.x = sp.x;
  player.pos.y = sp.y;
  player.vel.x = 0;
  player.vel.y = 0;
  player.hp = PLAYER_HP;
  player.alive = true;
  player.downed = false;
  player.downedTimer = 0;
  player.reviveProgress = 0;
  player.reviverId = null;
  player.respawnTimer = 0;
  player.invulnTimer = SPAWN_INVULN_DURATION;
  player.fireCooldown = 0;

  events.emit({
    type: "player_respawned",
    playerId: player.id,
    pos: { x: sp.x, y: sp.y },
  });
}
