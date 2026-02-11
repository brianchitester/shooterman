import type { Mode } from "../../core/state/Types";
import { MAP_LIST } from "../../core/defs/maps";
import { WEAPON_LIST } from "../../core/defs/weapons";

export function getModeLabel(mode: Mode): string {
  return mode === "coop" ? "MODE: SURVIVAL" : "MODE: DEATHMATCH";
}

export function getMapLabel(mapIndex: number): string {
  return `MAP: ${MAP_LIST[mapIndex].name.toUpperCase()}`;
}

export function getWeaponLabel(weaponIndex: number): string {
  return `WEAPON: ${WEAPON_LIST[weaponIndex].name.toUpperCase()}`;
}

export function nextMode(mode: Mode): Mode {
  return mode === "coop" ? "pvp_time" : "coop";
}

export function cycleIndex(current: number, direction: number, length: number): number {
  return (current + direction + length) % length;
}
