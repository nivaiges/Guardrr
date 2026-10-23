/**
 * What a toss call means. See docs/colorguard-research.md.
 *
 * - A call is a number of counts in half-count steps: 2, 2.5, 3, ...
 * - Release is always on count 1; a call of N is caught on count N of the
 *   same phrase. A half call (N.5) is an "and" call, caught on the "and"
 *   after count N (e.g. a double caught on "2 and").
 * - A call of 1 is a pop toss: it can't be caught on the release itself, so
 *   it is caught on the "and" of 1, the same moment as "1 and".
 */

/** Where a pop toss ("1") is caught: the "and" of count 1. */
export const POP_TOSS_CATCH = 1.5;

/** True for numbers >= 1 in half-count steps (1, 1.5, 2, ...). */
export function isValidCall(call: number): boolean {
  return Number.isFinite(call) && call >= 1 && Number.isInteger(call * 2);
}

export function assertValidCall(call: number): void {
  if (!isValidCall(call)) {
    throw new RangeError(`toss calls must be >= 1 in half-count steps, got ${call}`);
  }
}

/** True for "and" calls such as 2.5 ("two and"). */
export function isAndCall(call: number): boolean {
  assertValidCall(call);
  return !Number.isInteger(call);
}

/**
 * When the catch lands, in counts within the phrase (1-based; 2.5 = the
 * "and" after count 2).
 */
export function catchPositionOf(call: number): number {
  assertValidCall(call);
  return call === 1 ? POP_TOSS_CATCH : call;
}

/** The whole count on (or just after) which the catch lands. */
export function catchCountOf(call: number): number {
  return Math.floor(catchPositionOf(call));
}

/** True when the catch lands on an "and" rather than on a count. */
export function catchesOnAnd(call: number): boolean {
  return !Number.isInteger(catchPositionOf(call));
}

/** Display/speech label: 5 → "5", 2.5 → "2 and". */
export function callLabel(call: number): string {
  assertValidCall(call);
  return Number.isInteger(call) ? String(call) : `${Math.floor(call)} and`;
}

/** Counts of air time between the release (count 1) and the catch. */
export function airTimeCounts(call: number): number {
  return catchPositionOf(call) - 1;
}
