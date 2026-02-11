# How to Add a New Enemy Type

Adding a new enemy type requires **2 files** and **2 registry entries**. No changes to core systems, collision, rendering, or spawning code.

## Step 1: Create a Behavior (if needed)

If your enemy needs a new movement/attack pattern, create a behavior file:

```
src/core/defs/behaviors/myBehavior.ts
```

```ts
import type { EnemyBehavior } from "../EnemyBehavior";
import { resolveCircleTile } from "../../sim/tileCollision";
import { findNearestPlayer } from "../../sim/systems/enemyUtils";

export const myBehavior: EnemyBehavior = {
  id: "my_behavior",
  update(enemy, def, state, dt, events) {
    const target = findNearestPlayer(enemy, state);
    if (!target) { enemy.vel.x = 0; enemy.vel.y = 0; return; }

    // Your movement logic here — use enemy.moveSpeed, def.ranged, etc.
    // ...

    // Always resolve tile collision at the end
    const resolved = resolveCircleTile(
      enemy.pos.x, enemy.pos.y, enemy.colliderRadius, state.tiles,
    );
    enemy.pos.x = resolved.x;
    enemy.pos.y = resolved.y;
  },
};
```

Then register it in `src/core/defs/behaviors/index.ts`:

```ts
import { myBehavior } from "./myBehavior";
// ...
register(myBehavior);
```

If your enemy reuses an existing behavior (chase, strafe_shoot, orbit), skip this step.

## Step 2: Create the EnemyDef

Add your enemy definition to `src/core/defs/enemies.ts`:

```ts
export const ENEMY_MY_TYPE: EnemyDef = {
  id: "my_type",              // unique string key
  name: "My Type",            // display name
  hp: 2,                      // hit points
  moveSpeed: 100,             // px/s
  contactDamage: 2,           // damage on touch (0 = no contact damage)
  colliderRadius: 12,         // px
  knockback: 20,              // px pushed when hit by bullet
  score: 150,                 // points on kill (co-op)

  // Optional ranged attack — omit for melee-only
  ranged: {
    fireRate: 60,             // ticks between shots
    bulletSpeed: 400,         // px/s
    bulletDamage: 1,
    bulletTTL: 60,            // ticks
    preferredRange: 180,      // px (used by strafe_shoot behavior)
    weaponId: "enemy_my_type",
  },

  // Visual — determines shape and color in-game
  visual: {
    shape: "diamond",         // "circle" | "triangle" | "diamond" | "square"
    color: 0xff6600,          // hex color
    rotateToVelocity: true,   // rotate to face movement direction
  },

  behaviorId: "my_behavior",  // must match a registered behavior id
  spawnWeight: 3,             // higher = more common in spawn pool
  spawnAfterTick: 1200,       // first appears after 20s (0 = immediately)
};
```

## Step 3: Register in ENEMY_LIST

Add your def to the list in `src/core/defs/enemies.ts`:

```ts
export const ENEMY_LIST: ReadonlyArray<EnemyDef> = [
  ENEMY_CHASER,
  ENEMY_SHOOTER,
  ENEMY_SPINNER,
  ENEMY_MY_TYPE,  // <-- add here
];
```

That's it. The spawn system will automatically include your enemy using weighted random selection (filtered by `spawnAfterTick`). The renderer will draw it based on `visual`. The AI system will dispatch to your behavior. Collision uses `colliderRadius`, `contactDamage`, and `knockback` from the def.

## Available Behaviors

| ID | Description | Uses `ranged`? |
|----|-------------|----------------|
| `chase` | Beeline toward nearest player | No |
| `strafe_shoot` | Maintain distance, strafe, fire projectiles | Yes |
| `orbit` | Circle nearest player at fixed radius | No |
| `spin_chase` | Chase player while firing bullets in a rotating pattern | Yes |

## Architecture Notes

- **EnemyDef** (`src/core/defs/EnemyDef.ts`) — static data, no Phaser imports
- **EnemyBehavior** (`src/core/defs/EnemyBehavior.ts`) — pure update function contract
- **Behavior registry** (`src/core/defs/behaviors/index.ts`) — maps behaviorId to update fn
- **Enemy registry** (`src/core/defs/enemies.ts`) — maps typeId to EnemyDef
- **initEnemyFromDef** (`src/core/sim/systems/initEnemy.ts`) — hydrates a pool slot from def
- Stats live on `EnemyState` at runtime (copied from def on spawn)
- Core simulation is Phaser-free; rendering reads `typeId` to look up visuals
