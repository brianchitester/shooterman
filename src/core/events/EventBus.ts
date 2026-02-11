import type { GameEvent } from "./Events";

export interface EventBus {
  emit(event: GameEvent): void;
  drain(): GameEvent[];
  clear(): void;
}

export function createEventBus(): EventBus {
  let writeBuffer: GameEvent[] = [];
  let readBuffer: GameEvent[] = [];
  let writeIndex = 0;

  function emit(event: GameEvent): void {
    writeBuffer[writeIndex++] = event;
  }

  function drain(): GameEvent[] {
    // Swap buffers — returned array valid until next drain()
    const out = writeBuffer;
    out.length = writeIndex;
    writeBuffer = readBuffer;
    readBuffer = out;
    writeIndex = 0;
    return out;
  }

  function clear(): void {
    writeIndex = 0;
  }

  return { emit, drain, clear };
}
