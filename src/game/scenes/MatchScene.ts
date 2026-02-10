import Phaser from "phaser";
import { createGameState, addPlayerToState } from "../../core/state/GameState";
import { createRng } from "../../core/sim/rng/seedRng";
import { createEventBus } from "../../core/events/EventBus";
import { step } from "../../core/sim/tick";
import { TICKS_PER_SECOND, MAX_PLAYERS } from "../../core/state/Defaults";
import { getMapDef } from "../../core/defs/maps";
import type { GameState, Mode, DeviceAssignment } from "../../core/state/Types";
import type { SeededRng } from "../../core/sim/rng/seedRng";
import type { EventBus } from "../../core/events/EventBus";
import { RenderWorld } from "../render/RenderWorld";
import { HUD } from "../render/HUD";
import { InputManager } from "../input/InputManager";
import { createPrevPositions, snapshotPositions } from "../render/PrevPositions";
import type { PrevPositions } from "../render/PrevPositions";

const DT = 1 / TICKS_PER_SECOND;
const MAX_STEPS_PER_FRAME = 5;

interface LobbyData {
  mode: Mode;
  assignments: DeviceAssignment[];
  mapId?: string;
}

export class MatchScene extends Phaser.Scene {
  private state!: GameState;
  private rng!: SeededRng;
  private eventBus!: EventBus;
  private inputMgr!: InputManager;
  private renderWorld!: RenderWorld;
  private hud!: HUD;
  private prev!: PrevPositions;
  private assignments: DeviceAssignment[] = [];
  private accumulator = 0;
  private gameOverLaunched = false;

  constructor() {
    super({ key: "MatchScene" });
  }

  create(data?: LobbyData): void {
    const mode: Mode = data?.mode ?? "coop";
    const assignments: DeviceAssignment[] = data?.assignments ?? [{ type: "kbm", gamepadIndex: -1 }];
    const mapDef = getMapDef(data?.mapId ?? "arena");
    const playerCount = assignments.length;
    const seed = Date.now();

    this.state = createGameState(mode, playerCount, seed, mapDef);
    this.rng = createRng(seed);
    this.eventBus = createEventBus();
    this.inputMgr = new InputManager(this);
    this.inputMgr.setAssignments(assignments);
    this.assignments = [...assignments];
    this.renderWorld = new RenderWorld();
    this.hud = new HUD();
    this.prev = createPrevPositions();

    // Initialize prev positions to current so first frame doesn't lerp from 0,0
    snapshotPositions(this.state, this.prev);

    this.gameOverLaunched = false;
    this.renderWorld.create(this, this.state);
    this.hud.create(this);

    // Pause on Escape
    this.input.keyboard!.on("keydown-ESC", () => {
      this.scene.pause();
      this.scene.launch("PauseScene");
    });

    // Reset accumulator when resuming so paused time doesn't cause catch-up
    this.events.on("resume", () => {
      this.accumulator = 0;
    });
  }

  update(_time: number, delta: number): void {
    // Mid-match join
    this.checkMidMatchJoin();

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
    this.hud.update(this.state);

    // Drain events (log count for now)
    const evts = this.eventBus.drain();
    if (evts.length > 0) {
      console.log(`[MatchScene] ${evts.length} events this frame`);
    }

    // Launch game over overlay once
    if (this.state.match.gameOver && !this.gameOverLaunched) {
      this.gameOverLaunched = true;
      this.scene.pause();
      this.scene.launch("GameOverScene", {
        mode: this.state.match.mode,
        score: this.state.match.score,
        players: this.state.players.map(p => ({
          slot: p.slot,
          kills: p.kills,
          deaths: p.deaths,
        })),
      });
    }
  }

  private checkMidMatchJoin(): void {
    if (this.state.players.length >= MAX_PLAYERS || this.state.match.gameOver) return;

    const newAssignment = this.inputMgr.detectUnassignedPress();
    if (!newAssignment) return;

    const player = addPlayerToState(this.state);
    this.assignments.push(newAssignment);
    this.inputMgr.setAssignments(this.assignments);

    // Set prev position to current so first frame doesn't lerp from 0,0
    this.prev.players[player.slot].x = player.pos.x;
    this.prev.players[player.slot].y = player.pos.y;

    this.eventBus.emit({
      type: "player_joined",
      playerId: player.id,
      slot: player.slot,
      pos: { x: player.pos.x, y: player.pos.y },
    });
  }
}
