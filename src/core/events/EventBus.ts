import type { GameEvent } from "./Events";

export interface EventBus {
  emit(event: GameEvent): void;
  drain(): GameEvent[];
  clear(): void;
}

export function createEventBus(): EventBus {
  const buffer: GameEvent[] = [];

  function emit(event: GameEvent): void {
    buffer[buffer.length] = event;
  }

  function drain(): GameEvent[] {
    // Return the current buffer and reset
    // Caller is expected to consume before next tick batch
    const result = buffer.slice();
    buffer.length = 0;
    return result;
  }

  function clear(): void {
    buffer.length = 0;
  }

  return { emit, drain, clear };
}
