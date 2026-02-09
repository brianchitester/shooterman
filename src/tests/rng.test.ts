import { describe, it, expect } from "vitest";
import { createRng, restoreRng } from "../core/sim/rng/seedRng";

describe("SeededRng", () => {
  it("produces deterministic sequences from the same seed", () => {
    const rng1 = createRng(42);
    const rng2 = createRng(42);

    for (let i = 0; i < 100; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it("produces different sequences from different seeds", () => {
    const rng1 = createRng(42);
    const rng2 = createRng(43);

    let allSame = true;
    for (let i = 0; i < 10; i++) {
      if (rng1.next() !== rng2.next()) {
        allSame = false;
        break;
      }
    }
    expect(allSame).toBe(false);
  });

  it("returns values in [0, 1)", () => {
    const rng = createRng(123);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("nextInt returns values in [min, max]", () => {
    const rng = createRng(456);
    for (let i = 0; i < 1000; i++) {
      const v = rng.nextInt(5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it("state snapshot allows restoring sequence", () => {
    const rng = createRng(42);

    // Advance a few steps
    rng.next();
    rng.next();
    rng.next();

    // Snapshot
    const snapshot = rng.state();

    // Get next 5 values
    const expected: number[] = [];
    for (let i = 0; i < 5; i++) {
      expected[i] = rng.next();
    }

    // Restore from snapshot
    const restored = restoreRng(snapshot);
    for (let i = 0; i < 5; i++) {
      expect(restored.next()).toBe(expected[i]);
    }
  });
});
