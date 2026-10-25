/**
 * Tap tempo: turn a series of tap timestamps into a BPM.
 *
 * Pure: the caller passes timestamps (ms, any monotonic clock) and keeps the
 * returned tap list. The BPM is the median of the recent intervals, so one
 * hesitant or double-hit tap doesn't throw the tempo off the way a plain
 * average would.
 */

import { MAX_BPM, MIN_BPM } from './timing';

export interface TapTempoOptions {
  /** Taps further apart than this start a new measurement. Default 2000 ms (30 BPM). */
  resetAfterMs?: number;
  /** How many recent taps to keep. Default 8. */
  maxTaps?: number;
}

const DEFAULT_RESET_AFTER_MS = 2000;
const DEFAULT_MAX_TAPS = 8;

/** Add a tap at `nowMs` to `taps`, returning the new list (oldest first). */
export function addTap(
  taps: readonly number[],
  nowMs: number,
  { resetAfterMs = DEFAULT_RESET_AFTER_MS, maxTaps = DEFAULT_MAX_TAPS }: TapTempoOptions = {},
): number[] {
  if (!Number.isFinite(nowMs)) {
    throw new RangeError(`tap time must be finite, got ${nowMs}`);
  }
  if (!Number.isInteger(maxTaps) || maxTaps < 2) {
    throw new RangeError(`maxTaps must be an integer >= 2, got ${maxTaps}`);
  }
  const last = taps[taps.length - 1];
  // A long pause, or the clock going backwards, starts over.
  if (last === undefined || nowMs <= last || nowMs - last > resetAfterMs) return [nowMs];
  return [...taps, nowMs].slice(-maxTaps);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * BPM for a tap list (rounded, clamped to MIN_BPM..MAX_BPM), or null until
 * there are at least two taps.
 */
export function tapTempoBpm(taps: readonly number[]): number | null {
  if (taps.length < 2) return null;
  const intervals: number[] = [];
  for (let i = 1; i < taps.length; i++) intervals.push(taps[i] - taps[i - 1]);
  const interval = median(intervals);
  if (!(interval > 0)) return null;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(60_000 / interval)));
}
