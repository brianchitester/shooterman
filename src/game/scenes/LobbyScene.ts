import Phaser from "phaser";
import type { Mode, DeviceAssignment } from "../../core/state/Types";
import { MAX_PLAYERS } from "../../core/state/Defaults";
import { PLAYER_COLORS } from "../render/RenderFactories";
import { MAP_LIST } from "../../core/defs/maps";
import { WEAPON_LIST } from "../../core/defs/weapons";

const SLOT_RADIUS = 24;
const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: "16px",
  color: "#ffffff",
  fontFamily: "monospace",
};

export class LobbyScene extends Phaser.Scene {
  private slots: (DeviceAssignment | null)[] = [];
  private mode: Mode = "coop";
  private mapIndex = 0;
  private weaponIndex = 0;

  // Display objects per slot
  private slotCircles: Phaser.GameObjects.Graphics[] = [];
  private slotLabels: Phaser.GameObjects.Text[] = [];
  private slotPrompts: Phaser.GameObjects.Text[] = [];

  private modeText!: Phaser.GameObjects.Text;
  private mapText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  private startPrompt!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "LobbyScene" });
  }

  create(): void {
    this.slots = [];
    for (let i = 0; i < MAX_PLAYERS; i++) {
      this.slots[i] = null;
    }
    this.mode = "coop";
    this.mapIndex = 0;
    this.weaponIndex = 0;
    this.slotCircles = [];
    this.slotLabels = [];
    this.slotPrompts = [];

    const cx = this.scale.width / 2;

    // Title
    this.add
      .text(cx, 60, "SHOOTERMAN", {
        fontSize: "48px",
        color: "#ffffff",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // Player slots: 2 rows — 4 top, 3 bottom
    const topY = 200;
    const botY = 340;
    const topSlots = 4;
    const botSlots = 3;
    const spacing = 180;

    const positions: { x: number; y: number }[] = [];
    // Top row: 4 evenly spaced
    const topStartX = cx - (spacing * (topSlots - 1)) / 2;
    for (let i = 0; i < topSlots; i++) {
      positions.push({ x: topStartX + i * spacing, y: topY });
    }
    // Bottom row: 3 centered
    const botStartX = cx - (spacing * (botSlots - 1)) / 2;
    for (let i = 0; i < botSlots; i++) {
      positions.push({ x: botStartX + i * spacing, y: botY });
    }

    for (let i = 0; i < MAX_PLAYERS; i++) {
      const { x, y } = positions[i];

      // Color circle (hidden until joined)
      const circle = this.add.graphics();
      circle.fillStyle(PLAYER_COLORS[i], 1);
      circle.fillCircle(0, 0, SLOT_RADIUS);
      circle.setPosition(x, y);
      circle.setVisible(false);
      this.slotCircles[i] = circle;

      // Player label "P1"-"P7" (hidden until joined)
      const label = this.add
        .text(x, y, `P${i + 1}`, {
          fontSize: "20px",
          color: "#ffffff",
          fontFamily: "monospace",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setVisible(false);
      this.slotLabels[i] = label;

      // "Press to join" prompt
      const prompt = this.add
        .text(x, y, "Press\nto join", {
          fontSize: "14px",
          color: "#666666",
          fontFamily: "monospace",
          align: "center",
        })
        .setOrigin(0.5);
      this.slotPrompts[i] = prompt;
    }

    // Mode display
    this.modeText = this.add
      .text(cx, 430, this.getModeLabel(), {
        fontSize: "24px",
        color: "#f1c40f",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // Map display
    this.mapText = this.add
      .text(cx, 465, this.getMapLabel(), {
        fontSize: "20px",
        color: "#3498db",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // Weapon display
    this.weaponText = this.add
      .text(cx, 500, this.getWeaponLabel(), {
        fontSize: "20px",
        color: "#e74c3c",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // Start prompt
    this.startPrompt = this.add
      .text(cx, 550, "P1 press ENTER / START", {
        fontSize: "20px",
        color: "#aaaaaa",
        fontFamily: "monospace",
      })
      .setOrigin(0.5)
      .setVisible(false);

    // Instructions
    this.add
      .text(cx, 610, "SPACE = KB/M join  |  A = Gamepad join", {
        fontSize: "14px",
        color: "#555555",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 635, "BACKSPACE = leave  |  B = Gamepad leave", {
        fontSize: "14px",
        color: "#555555",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 660, "LEFT/RIGHT = mode  |  UP/DOWN = map  |  W/S = weapon", {
        fontSize: "14px",
        color: "#555555",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // --- Input Handlers ---

    // KB/M join (Space)
    this.input.keyboard!.on("keydown-SPACE", () => {
      this.joinDevice({ type: "kbm", gamepadIndex: -1 });
    });

    // KB/M leave (Backspace)
    this.input.keyboard!.on("keydown-BACKSPACE", () => {
      this.leaveDevice("kbm", -1);
    });

    // Mode toggle (P1 only): Left/Right arrow
    this.input.keyboard!.on("keydown-LEFT", () => {
      if (this.isP1Device("kbm", -1)) this.toggleMode();
    });
    this.input.keyboard!.on("keydown-RIGHT", () => {
      if (this.isP1Device("kbm", -1)) this.toggleMode();
    });

    // Map cycle (P1 only): Up/Down arrow
    this.input.keyboard!.on("keydown-UP", () => {
      if (this.isP1Device("kbm", -1)) this.cycleMap(-1);
    });
    this.input.keyboard!.on("keydown-DOWN", () => {
      if (this.isP1Device("kbm", -1)) this.cycleMap(1);
    });

    // Weapon cycle (P1 only): W/S
    this.input.keyboard!.on("keydown-W", () => {
      if (this.isP1Device("kbm", -1)) this.cycleWeapon(-1);
    });
    this.input.keyboard!.on("keydown-S", () => {
      if (this.isP1Device("kbm", -1)) this.cycleWeapon(1);
    });

    // Start match (P1 only): Enter
    this.input.keyboard!.on("keydown-ENTER", () => {
      if (this.isP1Device("kbm", -1)) this.tryStart();
    });

    // Gamepad: listen to button events
    if (this.input.gamepad) {
      this.input.gamepad.on("down", (pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
        const gi = pad.index;

        // A button (index 0) = join
        if (button.index === 0) {
          this.joinDevice({ type: "gamepad", gamepadIndex: gi });
        }
        // B button (index 1) = leave
        else if (button.index === 1) {
          this.leaveDevice("gamepad", gi);
        }
        // D-pad left (index 14) or D-pad right (index 15) = mode toggle (P1 only)
        else if (button.index === 14 || button.index === 15) {
          if (this.isP1Device("gamepad", gi)) this.toggleMode();
        }
        // D-pad up (index 12) or D-pad down (index 13) = map cycle (P1 only)
        else if (button.index === 12) {
          if (this.isP1Device("gamepad", gi)) this.cycleMap(-1);
        }
        else if (button.index === 13) {
          if (this.isP1Device("gamepad", gi)) this.cycleMap(1);
        }
        // L bumper (index 4) / R bumper (index 5) = weapon cycle (P1 only)
        else if (button.index === 4) {
          if (this.isP1Device("gamepad", gi)) this.cycleWeapon(-1);
        }
        else if (button.index === 5) {
          if (this.isP1Device("gamepad", gi)) this.cycleWeapon(1);
        }
        // Start button (index 9) = start match (P1 only)
        else if (button.index === 9) {
          if (this.isP1Device("gamepad", gi)) this.tryStart();
        }
      });
    }
  }

  private getModeLabel(): string {
    return this.mode === "coop" ? "MODE: SURVIVAL" : "MODE: DEATHMATCH";
  }

  private getMapLabel(): string {
    return `MAP: ${MAP_LIST[this.mapIndex].name.toUpperCase()}`;
  }

  private getWeaponLabel(): string {
    return `WEAPON: ${WEAPON_LIST[this.weaponIndex].name.toUpperCase()}`;
  }

  private getPlayerCount(): number {
    let count = 0;
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i] !== null) count++;
    }
    return count;
  }

  private findNextEmptySlot(): number {
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i] === null) return i;
    }
    return -1;
  }

  private isDeviceAssigned(type: string, gamepadIndex: number): boolean {
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (s && s.type === type && s.gamepadIndex === gamepadIndex) return true;
    }
    return false;
  }

  private isP1Device(type: string, gamepadIndex: number): boolean {
    const s = this.slots[0];
    return s !== null && s.type === type && s.gamepadIndex === gamepadIndex;
  }

  private joinDevice(assignment: DeviceAssignment): void {
    if (this.isDeviceAssigned(assignment.type, assignment.gamepadIndex)) return;
    const slot = this.findNextEmptySlot();
    if (slot === -1) return;
    this.slots[slot] = assignment;
    this.refreshSlot(slot);
    this.updateStartPrompt();
  }

  private leaveDevice(type: string, gamepadIndex: number): void {
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (s && s.type === type && s.gamepadIndex === gamepadIndex) {
        this.slots[i] = null;
        this.refreshSlot(i);
        // Compact: shift players down to fill gaps
        this.compactSlots();
        this.updateStartPrompt();
        return;
      }
    }
  }

  private compactSlots(): void {
    const occupied: DeviceAssignment[] = [];
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i] !== null) occupied.push(this.slots[i]!);
    }
    for (let i = 0; i < this.slots.length; i++) {
      this.slots[i] = i < occupied.length ? occupied[i] : null;
      this.refreshSlot(i);
    }
  }

  private refreshSlot(index: number): void {
    const occupied = this.slots[index] !== null;
    this.slotCircles[index].setVisible(occupied);
    this.slotLabels[index].setVisible(occupied);
    this.slotPrompts[index].setVisible(!occupied);
  }

  private toggleMode(): void {
    this.mode = this.mode === "coop" ? "pvp_time" : "coop";
    this.modeText.setText(this.getModeLabel());
  }

  private cycleMap(direction: number): void {
    this.mapIndex = (this.mapIndex + direction + MAP_LIST.length) % MAP_LIST.length;
    this.mapText.setText(this.getMapLabel());
  }

  private cycleWeapon(direction: number): void {
    this.weaponIndex = (this.weaponIndex + direction + WEAPON_LIST.length) % WEAPON_LIST.length;
    this.weaponText.setText(this.getWeaponLabel());
  }

  private updateStartPrompt(): void {
    this.startPrompt.setVisible(this.getPlayerCount() >= 1);
  }

  private tryStart(): void {
    const count = this.getPlayerCount();
    if (count < 1) return;

    // Build compact assignments array (no gaps)
    const assignments: DeviceAssignment[] = [];
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i] !== null) assignments.push(this.slots[i]!);
    }

    this.scene.start("MatchScene", {
      mode: this.mode,
      assignments,
      mapId: MAP_LIST[this.mapIndex].id,
      weaponId: WEAPON_LIST[this.weaponIndex].id,
    });
  }
}
