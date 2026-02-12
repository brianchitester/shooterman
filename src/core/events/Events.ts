import type { EntityId, Vec2 } from "../state/Types";

export interface BulletFiredEvent {
  type: "bullet_fired";
  bulletId: EntityId;
  ownerId: EntityId;
  pos: Vec2;
}

export interface HitPlayerEvent {
  type: "hit_player";
  bulletId: EntityId;
  playerId: EntityId;
  damage: number;
}

export interface HitEnemyEvent {
  type: "hit_enemy";
  bulletId: EntityId;
  enemyId: EntityId;
  damage: number;
}

export interface TileDamagedEvent {
  type: "tile_damaged";
  col: number;
  row: number;
  remainingHp: number;
}

export interface TileDestroyedEvent {
  type: "tile_destroyed";
  col: number;
  row: number;
}

export interface PlayerDownedEvent {
  type: "player_downed";
  playerId: EntityId;
  pos: Vec2;
}

export interface ReviveStartEvent {
  type: "revive_start";
  targetId: EntityId;
  reviverId: EntityId;
}

export interface ReviveCompleteEvent {
  type: "revive_complete";
  targetId: EntityId;
  reviverId: EntityId;
}

export interface ReviveCancelledEvent {
  type: "revive_cancelled";
  targetId: EntityId;
}

export interface PlayerBledOutEvent {
  type: "player_bled_out";
  playerId: EntityId;
}

export interface PlayerRespawnedEvent {
  type: "player_respawned";
  playerId: EntityId;
  pos: Vec2;
}

export interface EnemySpawnedEvent {
  type: "enemy_spawned";
  enemyId: EntityId;
  pos: Vec2;
}

export interface EnemyKilledEvent {
  type: "enemy_killed";
  enemyId: EntityId;
  killerBulletOwnerId: EntityId;
}

export interface TileCreatedEvent {
  type: "tile_created";
  col: number;
  row: number;
  hp: number;
}

export interface PlayerJoinedEvent {
  type: "player_joined";
  playerId: EntityId;
  slot: number;
  pos: Vec2;
}

export type GameEvent =
  | BulletFiredEvent
  | HitPlayerEvent
  | HitEnemyEvent
  | TileDamagedEvent
  | TileDestroyedEvent
  | PlayerDownedEvent
  | ReviveStartEvent
  | ReviveCompleteEvent
  | ReviveCancelledEvent
  | PlayerBledOutEvent
  | PlayerRespawnedEvent
  | EnemySpawnedEvent
  | EnemyKilledEvent
  | TileCreatedEvent
  | PlayerJoinedEvent;
