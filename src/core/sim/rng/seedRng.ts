export interface SeededRng {
  /** Returns a float in [0, 1) */
  next(): number;
  /** Returns an integer in [min, max] inclusive */
  nextInt(min: number, max: number): number;
  /** Returns the current internal state for snapshotting */
  state(): number;
}

/**
 * Mulberry32 — a simple, fast, 32-bit seeded PRNG.
 * Deterministic: same seed always produces the same sequence.
 */
export function createRng(seed: number): SeededRng {
  let s = seed | 0;

  function next(): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function nextInt(min: number, max: number): number {
    return min + ((next() * (max - min + 1)) | 0);
  }

  function state(): number {
    return s;
  }

  return { next, nextInt, state };
}

/** Restore an RNG from a previously snapshotted state */
export function restoreRng(rngState: number): SeededRng {
  return createRng(rngState);
}
