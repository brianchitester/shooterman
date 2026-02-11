import Phaser from "phaser";
import type { Mode, DeviceAssignment } from "../../core/state/Types";
import { MAP_LIST } from "../../core/defs/maps";
import { WEAPON_LIST } from "../../core/defs/weapons";
import { getModeLabel, getMapLabel, getWeaponLabel, nextMode, cycleIndex } from "../ui/menuUtils";

interface PauseData {
  mode: Mode;
  mapId: string;
  weaponId: string;
  assignments: DeviceAssignment[];
}

export class PauseScene extends Phaser.Scene {
  private mode: Mode = "coop";
  private mapIndex = 0;
  private weaponIndex = 0;
  private assignments: DeviceAssignment[] = [];

  private modeText!: Phaser.GameObjects.Text;
  private mapText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "PauseScene" });
  }

  create(data?: PauseData): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h / 2;

    // Restore current match settings
    this.mode = data?.mode ?? "coop";
    this.assignments = data?.assignments ? [...data.assignments] : [];
    this.mapIndex = Math.max(0, MAP_LIST.findIndex(m => m.id === data?.mapId));
    this.weaponIndex = Math.max(0, WEAPON_LIST.findIndex(w => w.id === data?.weaponId));

    // Semi-transparent backdrop
    this.add.rectangle(cx, cy, w, h, 0x000000, 0.6);

    // Title
    this.add
      .text(cx, cy - 120, "PAUSED", {
        fontSize: "40px",
        color: "#ffffff",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // Mode display
    this.modeText = this.add
      .text(cx, cy - 50, getModeLabel(this.mode), {
        fontSize: "20px",
        color: "#f1c40f",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // Map display
    this.mapText = this.add
      .text(cx, cy - 20, getMapLabel(this.mapIndex), {
        fontSize: "20px",
        color: "#3498db",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // Weapon display
    this.weaponText = this.add
      .text(cx, cy + 10, getWeaponLabel(this.weaponIndex), {
        fontSize: "20px",
        color: "#e74c3c",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // Controls hint
    this.add
      .text(cx, cy + 55, "LEFT/RIGHT = mode  |  UP/DOWN = map  |  W/S = weapon", {
        fontSize: "12px",
        color: "#555555",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // Resume
    this.add
      .text(cx, cy + 90, "ESC = Resume", {
        fontSize: "20px",
        color: "#aaaaaa",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // New game
    this.add
      .text(cx, cy + 120, "ENTER = New Game", {
        fontSize: "20px",
        color: "#2ecc71",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // --- Input ---

    const kb = this.input.keyboard!;

    const resume = () => {
      kb.removeAllListeners();
      if (this.input.gamepad) this.input.gamepad.removeAllListeners();
      this.scene.resume("MatchScene");
      this.scene.stop();
    };

    const newGame = () => {
      kb.removeAllListeners();
      if (this.input.gamepad) this.input.gamepad.removeAllListeners();
      this.scene.stop("MatchScene");
      this.scene.stop();
      this.scene.start("MatchScene", {
        mode: this.mode,
        assignments: this.assignments,
        mapId: MAP_LIST[this.mapIndex].id,
        weaponId: WEAPON_LIST[this.weaponIndex].id,
      });
    };

    // Keyboard
    kb.on("keydown-ESC", resume);
    kb.on("keydown-ENTER", newGame);
    kb.on("keydown-LEFT", () => this.toggleMode());
    kb.on("keydown-RIGHT", () => this.toggleMode());
    kb.on("keydown-UP", () => this.cycleMap(-1));
    kb.on("keydown-DOWN", () => this.cycleMap(1));
    kb.on("keydown-W", () => this.cycleWeapon(-1));
    kb.on("keydown-S", () => this.cycleWeapon(1));

    // Gamepad
    if (this.input.gamepad) {
      this.input.gamepad.on("down", (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
        switch (button.index) {
          case 9: resume(); break;              // Start = resume
          case 0: newGame(); break;             // A = new game
          case 14: case 15: this.toggleMode(); break;  // D-pad left/right = mode
          case 12: this.cycleMap(-1); break;    // D-pad up = map prev
          case 13: this.cycleMap(1); break;     // D-pad down = map next
          case 4: this.cycleWeapon(-1); break;  // L bumper = weapon prev
          case 5: this.cycleWeapon(1); break;   // R bumper = weapon next
        }
      });
    }
  }

  private toggleMode(): void {
    this.mode = nextMode(this.mode);
    this.modeText.setText(getModeLabel(this.mode));
  }

  private cycleMap(direction: number): void {
    this.mapIndex = cycleIndex(this.mapIndex, direction, MAP_LIST.length);
    this.mapText.setText(getMapLabel(this.mapIndex));
  }

  private cycleWeapon(direction: number): void {
    this.weaponIndex = cycleIndex(this.weaponIndex, direction, WEAPON_LIST.length);
    this.weaponText.setText(getWeaponLabel(this.weaponIndex));
  }
}
