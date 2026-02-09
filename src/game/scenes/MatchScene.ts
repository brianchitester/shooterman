import Phaser from "phaser";
import { createGameState } from "../../core/state/GameState";
import { createRng } from "../../core/sim/rng/seedRng";
import { createEventBus } from "../../core/events/EventBus";
import { step } from "../../core/sim/tick";
import { TICKS_PER_SECOND } from "../../core/state/Defaults";
import type { GameState } from "../../core/state/Types";
import type { SeededRng } from "../../core/sim/rng/seedRng";
import type { EventBus } from "../../core/events/EventBus";
import { RenderWorld } from "../render/RenderWorld";
import { InputManager } from "../input/InputManager";
import { createPrevPositions, snapshotPositions } from "../render/PrevPositions";
import type { PrevPositions } from "../render/PrevPositions";

const DT = 1 / TICKS_PER_SECOND;
const MAX_STEPS_PER_FRAME = 5;

export class MatchScene extends Phaser.Scene {
  private state!: GameState;
  private rng!: SeededRng;
  private eventBus!: EventBus;
  private inputMgr!: InputManager;
  private renderWorld!: RenderWorld;
  private prev!: PrevPositions;
  private accumulator = 0;

  constructor() {
    super({ key: "MatchScene" });
  }

  create(): void {
    this.state = createGameState("coop", 1, 42);
    this.rng = createRng(42);
    this.eventBus = createEventBus();
    this.inputMgr = new InputManager(this);
    this.renderWorld = new RenderWorld();
    this.prev = createPrevPositions();

    // Initialize prev positions to current so first frame doesn't lerp from 0,0
    snapshotPositions(this.state, this.prev);

    this.renderWorld.create(this, this.state);
  }

  update(_time: number, delta: number): void {
    // Poll input
    const intents = this.inputMgr.poll(this.state.players);

    // Accumulate time (Phaser gives delta in ms)
    this.accumulator += delta / 1000;

    // Cap to prevent spiral of death
    if (this.accumulator > MAX_STEPS_PER_FRAME * DT) {
      this.accumulator = MAX_STEPS_PER_FRAME * DT;
    }

    // Fixed timestep simulation
    while (this.accumulator >= DT) {
      snapshotPositions(this.state, this.prev);
      step(this.state, intents, this.rng, this.eventBus);
      this.accumulator -= DT;
    }

    // Interpolation alpha
    const alpha = this.accumulator / DT;

    // Render
    this.renderWorld.update(this.state, this.prev, alpha);

    // Drain events (log count for now)
    const evts = this.eventBus.drain();
    if (evts.length > 0) {
      console.log(`[MatchScene] ${evts.length} events this frame`);
    }
  }
}
