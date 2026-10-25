/**
 * Editing helpers for the settings screen.
 *
 * Every helper takes valid settings and returns valid settings: changing one
 * field adjusts the others that depend on it (e.g. shortening the phrase pulls
 * the lead counts and the toss range in), so the UI can never build settings
 * that validateTossSettings would reject.
 */

import { TossSettings } from './announce';
import { catchPositionOf } from './calls';
import { tossCountsInRange } from './random';
import { MAX_BPM, MAX_PHRASE_LENGTH, MIN_BPM, MIN_PHRASE_LENGTH } from './timing';

/** Phrase lengths offered by the settings screen. */
export const PHRASE_LENGTH_OPTIONS: readonly number[] = [4, 8, 12, 16, 24, 32];

/** A contiguous range of calls, as edited in the UI. */
export interface TossRange {
  min: number;
  max: number;
  /** Include the "and" calls between whole counts (2.5, 3.5, ...). */
  andCounts: boolean;
}

function clampInt(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

export function clampBpm(bpm: number): number {
  return clampInt(bpm, MIN_BPM, MAX_BPM);
}

/**
 * The range a settings object covers: smallest and largest whole count, and
 * whether any "and" call is in the set. (A hand-picked set with gaps is shown
 * as its outer range.)
 */
export function tossRangeOf(settings: TossSettings): TossRange {
  const counts = settings.allowedTossCounts;
  return {
    min: Math.max(1, Math.floor(Math.min(...counts))),
    max: Math.ceil(Math.max(...counts)),
    andCounts: counts.some((n) => !Number.isInteger(n)),
  };
}

/**
 * Calls for a range. With "and" calls on, "1 and" is left out when "1" is in
 * the range: a pop toss is already caught on the "and" of 1. "And" calls past
 * the last count of the phrase are left out too.
 */
export function tossCountsForRange(range: TossRange, phraseLength: number): number[] {
  const max = Math.min(range.max, phraseLength);
  const min = Math.min(range.min, max);
  const seen = new Set<number>();
  return tossCountsInRange(min, max, { andCounts: range.andCounts }).filter((n) => {
    const at = catchPositionOf(n);
    if (seen.has(at) || at > phraseLength) return false;
    seen.add(at);
    return true;
  });
}

/** Set the toss range, clamped to 1..phraseLength with min <= max. */
export function withTossRange(settings: TossSettings, range: TossRange): TossSettings {
  const max = clampInt(range.max, 1, settings.phraseLength);
  const min = clampInt(range.min, 1, max);
  const next = { min, max, andCounts: range.andCounts };
  return { ...settings, allowedTossCounts: tossCountsForRange(next, settings.phraseLength) };
}

/** Set the lead counts, clamped to 1..phraseLength. */
export function withLeadCounts(settings: TossSettings, leadCounts: number): TossSettings {
  return { ...settings, leadCounts: clampInt(leadCounts, 1, settings.phraseLength) };
}

/**
 * Change the phrase length. Lead counts and the toss range are pulled in to
 * fit a shorter phrase; a longer phrase leaves them as they were.
 */
export function withPhraseLength(settings: TossSettings, phraseLength: number): TossSettings {
  const length = clampInt(phraseLength, MIN_PHRASE_LENGTH, MAX_PHRASE_LENGTH);
  const resized = { ...settings, phraseLength: length };
  return withTossRange(withLeadCounts(resized, settings.leadCounts), tossRangeOf(settings));
}

export function withAllowRepeats(settings: TossSettings, allowRepeats: boolean): TossSettings {
  return { ...settings, allowRepeats };
}
