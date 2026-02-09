# Systems Boundaries

## Simulation Model

The game is a deterministic simulation driven by player inputs.

World State includes:

- Player positions and health
- Enemy positions and behavior
- Bullets and collisions
- Destructible terrain
- Score and lives

---

## Separation of Responsibilities

Input → produces player intent only
Simulation → updates world state
Rendering → reads world state only

No game logic is allowed inside rendering code.

---

## Mode Design

Game modes do not change systems.
They only change rules.

Examples:

- Friendly fire toggle
- Enemy spawn toggle
- Shared vs personal lives

The same simulation must run for both co-op and PvP.

---

## Future Networking Constraint

All gameplay must be reproducible from:
initial state + sequence of player inputs

No randomness without a seeded RNG.

---

## Balance Constants

All timers are in integer ticks (TICKS_PER_SECOND = 60). Convert to seconds for display only.

| Parameter | Value | Ticks |
|---|---|---|
| Player HP | 3 | — |
| Bullet damage | 1 | — |
| Enemy contact damage | 2 | — |
| Breakable tile HP | 2 | — |
| Chaser enemy HP | 2 | — |
| Fire rate | 4/sec | 15 tick cooldown |
| Bullet speed | 600 px/s | — |
| Bullet TTL | 1.0s | 60 ticks |
| Player move speed | 250 px/s | — |
| Chaser move speed | 120 px/s | — |
| PvP respawn delay | 0.5s | 30 ticks |
| Spawn invulnerability | 1.5s | 90 ticks |
| Invuln rule | Cannot deal damage while invuln | — |
| Hit i-frames | 0.1s | 6 ticks |
| Downed bleed-out (co-op) | 8.0s | 480 ticks |
| Revive radius | 56px (~1.2 tiles) | — |
| Revive hold time | 1.5s | 90 ticks |
| Downed crawl speed | 75 px/s (30% of normal) | — |
| Co-op shared lives | 3 + (playerCount - 1) | — |

---

## Arena Specification

- Tile grid: 20 columns x 15 rows, 48px cells = 960x720 play area
- Camera: fixed, full arena visible at all times (no zoom, no scroll)
- Tile distribution: ~25% breakable, ~10% solid (indestructible pillars), ~65% empty
- Layout: symmetric around center. Indestructible pillars at fixed positions create lanes even when all breakable tiles are destroyed
- Player spawn points: 7 pre-defined positions along arena edges, evenly distributed, minimum 3 tiles apart
- Player respawn algorithm: choose spawn point with maximum minimum distance from all living threats

---

## Enemy Spawn Scaling

- Base spawn rate: 1 enemy per 3s at t=0, ramping to 1 per 1s by t=60s
- Player count multiplier: `spawnRate *= (0.5 + 0.5 * playerCount)`
- Max concurrent enemies: `min(5 + 3 * playerCount, 20)`
- Minimum spawn distance from any alive player: 150px (~3.1 tiles)
- Spawn telegraph: 0.5s pulsing indicator at spawn point before enemy materializes
- Spawn zones: 4 cardinal edge zones; pick zone farthest from nearest player
- Fallback: if no valid zone exists (all edges occupied), spawn at center of the largest empty region

---

## Friendly Fire Defaults

- Co-op: Friendly fire OFF. Player bullets pass through teammates.
- PvP FFA: All players are opponents. All bullets damage all non-self players.
- Invulnerable players cannot deal or receive damage.
