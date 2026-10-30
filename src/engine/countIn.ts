/**
 * Count-in: how many counts of metronome play before the first release.
 *
 * The phrase model keeps phrase 0 as the lead-in (see announce.ts). A
 * count-in shorter than a full phrase simply starts the clock part-way
 * through phrase 0: with a 16-count phrase and an 8-count count-in the first
 * click is count 9 and the first release is 8 counts later. The rest of the
 * model (announcement, release, catch) is untouched.
 *
 * The count-in can't be shorter than the lead counts, or the first call
 * would have to be spoken before the metronome even started.
 */

import { TossSettings, assertValidLeadCounts } from './announce';

/** Count-in lengths offered by the settings screen; 0 means "a full phrase". */
export const COUNT_IN_OPTIONS: readonly number[] = [4, 8, 0];

/** A full lead-in phrase (the original behavior). */
export const FULL_PHRASE_COUNT_IN = 0;

/**
 * Default count-in: 8 counts, the length of a "5 6, 5 6 7 8" prep count-off,
 * instead of sitting through a whole 16-count phrase before the first toss.
 */
export const DEFAULT_COUNT_IN = 8;

/**
 * The count-in actually used for these settings: `countIn` counts, at least
 * the lead counts (so the first call is heard) and at most one phrase.
 * 0 (or anything >= the phrase length) means a full phrase.
 */
export function effectiveCountIn(countIn: number, settings: TossSettings): number {
  assertValidLeadCounts(settings.leadCounts, settings.phraseLength);
  if (!Number.isFinite(countIn) || countIn < 0) {
    throw new RangeError(`countIn must be >= 0, got ${countIn}`);
  }
  const L = settings.phraseLength;
  if (countIn === FULL_PHRASE_COUNT_IN) return L;
  return Math.min(L, Math.max(settings.leadCounts, Math.round(countIn)));
}

/** Absolute count index of the first click (0 for a full-phrase count-in). */
export function firstCountIndex(countIn: number, settings: TossSettings): number {
  return settings.phraseLength - effectiveCountIn(countIn, settings);
}

/** Short label for the settings screen: 8 → "8", 0 → "Phrase". */
export function countInLabel(countIn: number): string {
  return countIn === FULL_PHRASE_COUNT_IN ? 'Phrase' : String(countIn);
}
