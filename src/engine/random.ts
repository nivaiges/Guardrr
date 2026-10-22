/**
 * Seedable random number generation and toss-count picking.
 * Pure and framework-free: no Math.random unless you ask for it.
 */

/** A function returning a float in [0, 1), like Math.random. */
export type Rng = () => number;

/**
 * Mulberry32 — small, fast, deterministic 32-bit PRNG. Same seed → same
 * sequence, which makes practice sessions and tests reproducible.
 */
export function createRng(seed: number): Rng {
  if (!Number.isFinite(seed)) {
    throw new RangeError(`seed must be finite, got ${seed}`);
  }
  let state = Math.trunc(seed) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh seed for a new session (the only impure helper here). */
export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32);
}

/** Inclusive integer range, e.g. tossCountsInRange(1, 7) → [1..7]. */
export function tossCountsInRange(min: number, max: number): number[] {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min) {
    throw new RangeError(`toss range must be integers with 1 <= min <= max, got ${min}..${max}`);
  }
  const out: number[] = [];
  for (let n = min; n <= max; n++) out.push(n);
  return out;
}

/** De-duplicate and sort a user-provided toss-count set, rejecting bad values. */
export function normalizeTossCounts(counts: readonly number[]): number[] {
  for (const n of counts) {
    if (!Number.isInteger(n) || n < 1) {
      throw new RangeError(`toss counts must be positive integers, got ${n}`);
    }
  }
  const unique = Array.from(new Set(counts)).sort((a, b) => a - b);
  if (unique.length === 0) {
    throw new RangeError('at least one toss count is required');
  }
  return unique;
}

export interface PickOptions {
  /** The previous call, if any. */
  previous?: number;
  /** Whether the same count may be called twice in a row. Default true. */
  allowRepeats?: boolean;
}

/**
 * Pick a toss count uniformly from `allowed`. With allowRepeats=false the
 * previous call is excluded — unless it's the only option, in which case it
 * is returned rather than failing.
 */
export function pickTossCount(
  allowed: readonly number[],
  rng: Rng,
  { previous, allowRepeats = true }: PickOptions = {},
): number {
  const pool = normalizeTossCounts(allowed);
  const candidates =
    !allowRepeats && previous !== undefined && pool.length > 1
      ? pool.filter((n) => n !== previous)
      : pool;
  const r = rng();
  const i = Math.min(candidates.length - 1, Math.floor(r * candidates.length));
  return candidates[i];
}
