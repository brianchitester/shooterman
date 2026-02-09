# Moment Game Loop

## The 2-Second Loop

Spawn → Move → Shoot → Break Cover → Panic → Die → Respawn → Re-engage

The game should feel continuous. A player rarely pauses to think; they react constantly.

### Timing Budget (at default balance constants)

- Fire cooldown: 250ms (4 rounds/sec)
- Time-to-kill (bullets): 500–750ms (2–3 hits at 250ms)
- Time-to-kill (chaser contact): instant loss of 2 HP on touch
- PvP respawn: 500ms
- Spawn invulnerability: 1500ms (cannot deal damage)
- Full death-to-re-engage cycle: ~2.0s (500ms respawn + 1500ms invuln/reposition)

These numbers validate the 2-second loop claim. Adjust balance constants if this cycle exceeds 3 seconds.

---

## Player Verbs

- Move
- Aim
- Shoot
- Escape danger
- Revive teammate (co-op)

No additional verbs should be introduced unless they reinforce speed and readability.

### Revive (co-op only)

- Proximity: within 56px (~1.2 tiles) of downed teammate
- Hold duration: 1.5s (uninterrupted)
- Downed teammate can crawl at 30% move speed (75 px/s)
- Bleed-out timer: 8.0s. If timer expires, one shared life is consumed and all currently-downed players respawn.
- If reviver dies or moves away, revive progress decays at 2x rate.
- If ALL players are downed simultaneously, one shared life is consumed and all respawn.

---

## Intended Mental State

### Co-op

"Stay alive together"
Urgency, rescue, recovery, clutch moments

### PvP

"Never stop moving"
Positioning collapses into instinct and reactions

---

## Failure State Philosophy

Failure should feel like loss of tempo, not loss of progress.
Players should immediately want to re-engage.

### PvP Death Moment (snap, 150–200ms)

- Player sprite pops/bursts (particle explosion in player's color)
- Kill confirm: score +1 appears at kill location
- 0.5s total respawn time (death anim runs during this)
- Player reappears at farthest-from-threats spawn point
- Death is a speed bump, not a punishment

### Co-op Down Moment (tension, sustained over 8s)

- Initial down: dramatic hit flash + screen-edge beacon showing downed location
- Crawl state: 30% speed, pulsing ring beacon (64px diameter, player's color)
- Audio: heartbeat accelerating as bleed-out timer decreases
- Revive: circular fill progress indicator, 1.5s hold
- Bleed-out expiry: 100ms freeze frame + full-screen flash + audio sting
