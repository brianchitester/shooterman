# Aesthetic Direction

## Visual Priorities

Readability > Style > Detail

Players must identify threats in under 200ms.

---

## Color Rules

Color communicates gameplay information, not decoration.

Examples:

- Enemies distinct from players
- Dangerous objects brighter than safe objects
- Damage and explosions show their exact radius

Avoid color noise and gradients that obscure silhouettes.

---

## Shape Language

- Players: simple, recognizable silhouettes
- Enemies: distinct movement identities
- Bullets: clear directionality
- Terrain: obvious cover vs non-cover

---

## Effects Philosophy

Effects should clarify gameplay, not obscure it.

Good:

- Hit flashes
- Clear explosions
- Directional particles

Bad:

- Smoke clouds hiding bullets
- Screen clutter during combat
- Decorative background motion

The player should never die to something they could not visually parse.

---

## Visual Contracts

### Z-Order (back to front)

| Layer | Content |
|---|---|
| 0 | Background / floor |
| 1 | Intact tiles, tile debris |
| 2 | Enemies |
| 3 | Players |
| 4 | Bullets / projectiles |
| 5 | Spawn telegraphs, VFX (explosions, hit flashes) |
| 6 | HUD / UI |

Threats (bullets, telegraphs) must ALWAYS render above players and enemies. Tile debris must NEVER obscure bullets.

### Color Budget

- **Player identification**: 7 high-contrast colors (Red, Blue, Green, Yellow, Purple, Orange, Cyan) plus a unique shape indicator (arrow/number above character)
- **Threats**: warm/saturated hues (red, orange) reserved for danger. PvP non-self bullets use a universal warm threat color. Self-bullets render in player color, desaturated.
- **Co-op enemy bullets**: warm/red with distinct spiky particle shape (not just color) for colorblind accessibility
- **Environment**: neutral/cool tones for tiles and background. Breakable tiles slightly warmer than indestructible.

### Minimum Entity Sizes (at 1080p)

- Bullets: >= 6px diameter
- Player characters: >= 28px
- Enemies: >= 24px
- Spawn telegraph indicators: >= 32px

### Tile Visual States

- **Intact**: full visual, solid color/texture
- **Cracked**: visible damage (cracks, shifted color) when HP <= 50%
- **Destroyed**: 300ms particle animation in debris z-layer (layer 1). Collision volume removed instantly in simulation.

### Hit Feedback

- Per-hit: 100ms white sprite flash + directional damage indicator at screen edge
- Audio pitch-shifted by remaining HP (higher pitch = lower HP = more urgent)
- 6-tick i-frames (0.1s) between hits to prevent instant-melt from converging fire

### Invulnerability Visual

- Spawn invuln: 12Hz alpha flicker + colored shield outline. Player is semi-transparent.
- Hit i-frames: single brief flash (distinct from spawn invuln)
- Invuln players cannot deal damage — no muzzle flash, no bullet spawn visual

### Downed Visual (co-op)

- Pulsing ring beacon: 64px diameter, player's color, visible through all layers
- Screen-edge directional indicator pointing to downed teammate
- Crawl animation at 30% speed
- Heartbeat audio accelerating as bleed-out timer decreases
- Revive progress: circular fill indicator around downed player

---

## Player Identity

Each of the 7 player slots has:

- A unique high-contrast color (Red, Blue, Green, Yellow, Purple, Orange, Cyan)
- A unique shape indicator (arrow above character with slot number)
- Color-matched health pips in screen-edge HUD (not floating bars above characters)
- Indicators must be visible at all times regardless of entity density

### HUD Layout (7 players)

- Player health/score: screen-edge HUD arranged around the border, color-matched to player
- Shared lives (co-op) / match timer (PvP): top-center
- No floating health bars above characters (too cluttered at 7 players)
- Downed teammate indicators: screen-edge directional arrows in teammate's color
