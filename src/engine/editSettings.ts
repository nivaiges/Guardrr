/**
 * Editing helpers for the settings screen.
 *
 * Every helper takes valid settings and returns valid settings: changing one
 * field adjusts the others that depend on it (e.g. shortening the phrase pulls
 * the lead counts and the toss range in), so the UI can never build settings
 * that validateTossSettings would reject.
 */

import { TossSettings } from './announce';
import { callLabel, catchPositionOf, isValidCall } from './calls';
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
 * fit a shorter phrase; a longer phrase leaves them as they were. A
 * hand-picked set keeps the calls that still fit (and falls back to its
 * outer range, pulled in, when none do).
 */
export function withPhraseLength(settings: TossSettings, phraseLength: number): TossSettings {
  const length = clampInt(phraseLength, MIN_PHRASE_LENGTH, MAX_PHRASE_LENGTH);
  const resized = withLeadCounts({ ...settings, phraseLength: length }, settings.leadCounts);
  if (!isCallRange(settings)) {
    const fitting = settings.allowedTossCounts.filter((n) => catchPositionOf(n) <= length);
    if (fitting.length > 0) return { ...resized, allowedTossCounts: fitting };
  }
  return withTossRange(resized, tossRangeOf(settings));
}

/**
 * True when the calls are exactly what the range editor would build for
 * their outer range (no gaps); false for a hand-picked set such as 3, 5, 7.
 */
export function isCallRange(settings: TossSettings): boolean {
  const range = tossCountsForRange(tossRangeOf(settings), settings.phraseLength);
  const calls = [...new Set(settings.allowedTossCounts)].sort((a, b) => a - b);
  return range.length === calls.length && range.every((n, i) => n === calls[i]);
}

/**
 * The calls the picker offers for a phrase: every whole count 1..phraseLength
 * and, with `andCounts`, the "and" calls 2 and .. (phraseLength - 1) and.
 * "1 and" is never offered: it is caught at the same moment as the pop toss
 * ("1"), so it would be the same toss under two names.
 */
export function callChoices(phraseLength: number, andCounts: boolean): number[] {
  const length = clampInt(phraseLength, MIN_PHRASE_LENGTH, MAX_PHRASE_LENGTH);
  return tossCountsInRange(1, length, { andCounts }).filter((n) => n !== 1.5);
}

/**
 * Add a call to the set, or remove it if it's already there. The last call
 * can't be removed (a session needs at least one), calls that don't fit the
 * phrase can't be added, and adding "1 and" swaps out the pop toss ("1") and
 * vice versa, since both are caught on the "and" of 1.
 */
export function withCallToggled(settings: TossSettings, call: number): TossSettings {
  if (!isValidCall(call) || catchPositionOf(call) > settings.phraseLength) return settings;
  const calls = settings.allowedTossCounts;
  if (calls.includes(call)) {
    if (calls.length === 1) return settings;
    return { ...settings, allowedTossCounts: calls.filter((n) => n !== call) };
  }
  const at = catchPositionOf(call);
  const kept = calls.filter((n) => catchPositionOf(n) !== at);
  return { ...settings, allowedTossCounts: [...kept, call].sort((a, b) => a - b) };
}

export function withAllowRepeats(settings: TossSettings, allowRepeats: boolean): TossSettings {
  return { ...settings, allowRepeats };
}

/**
 * The "Include "and" calls" switch. A range gets (or loses) every "and" call
 * between its ends, as before. A hand-picked set keeps its shape: switching
 * on adds the "and" right after each picked whole count (3, 5 → 3, 3 and,
 * 5, 5 and), switching off removes every "and" call ("1 and" becomes the pop
 * toss, caught at the same moment; a set of only "and" calls becomes the
 * whole counts of its outer range).
 */
export function withAndCalls(settings: TossSettings, andCounts: boolean): TossSettings {
  if (isCallRange(settings)) {
    return withTossRange(settings, { ...tossRangeOf(settings), andCounts });
  }
  const calls = settings.allowedTossCounts;
  if (!andCounts) {
    const whole = [...new Set(calls.map((n) => (n === 1.5 ? 1 : n)))].filter(Number.isInteger);
    // Only "and" calls were picked: fall back to their outer range.
    if (whole.length === 0) return withTossRange(settings, { ...tossRangeOf(settings), andCounts });
    return { ...settings, allowedTossCounts: whole.sort((a, b) => a - b) };
  }
  let next = settings;
  for (const n of calls) {
    const and = n + 0.5;
    if (!Number.isInteger(n) || n === 1 || next.allowedTossCounts.includes(and)) continue;
    if (catchPositionOf(and) <= settings.phraseLength) next = withCallToggled(next, and);
  }
  return next;
}

/** Short description of the calls: "1–7", "2–5 with \"and\"s", "3, 5, 7", "Only 5". */
export function callSetSummary(settings: TossSettings): string {
  const calls = [...settings.allowedTossCounts].sort((a, b) => a - b);
  if (calls.length === 1) return `Only ${callLabel(calls[0])}`;
  if (isCallRange(settings)) {
    const { min, max, andCounts } = tossRangeOf(settings);
    return `${min}–${max}${andCounts ? ' with "and"s' : ''}`;
  }
  return calls.map(callLabel).join(', ');
}
