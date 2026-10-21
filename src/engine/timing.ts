/**
 * Pure count / phrase math for the Guardrr metronome.
 *
 * Conventions:
 * - A "count index" is a 0-based absolute count since practice started
 *   (count index 0 is the very first count 1 of the first phrase).
 * - A "count" is the 1-based position within a phrase (1..phraseLength).
 * - Count 1 of each phrase is the toss release.
 */

export const MIN_BPM = 20;
export const MAX_BPM = 400;
export const MIN_PHRASE_LENGTH = 1;
export const MAX_PHRASE_LENGTH = 64;

export interface PhrasePosition {
  /** 0-based index of the phrase (cycle) this count belongs to. */
  phrase: number;
  /** 1-based count within the phrase (1..phraseLength). */
  count: number;
  /** True on count 1 — the release. */
  isDownbeat: boolean;
  /** True on the final count of the phrase. */
  isLastCount: boolean;
}

export function assertValidBpm(bpm: number): void {
  if (!Number.isFinite(bpm) || bpm < MIN_BPM || bpm > MAX_BPM) {
    throw new RangeError(`bpm must be between ${MIN_BPM} and ${MAX_BPM}, got ${bpm}`);
  }
}

export function assertValidPhraseLength(phraseLength: number): void {
  if (
    !Number.isInteger(phraseLength) ||
    phraseLength < MIN_PHRASE_LENGTH ||
    phraseLength > MAX_PHRASE_LENGTH
  ) {
    throw new RangeError(
      `phraseLength must be an integer between ${MIN_PHRASE_LENGTH} and ${MAX_PHRASE_LENGTH}, got ${phraseLength}`,
    );
  }
}

function assertValidCountIndex(countIndex: number): void {
  if (!Number.isInteger(countIndex) || countIndex < 0) {
    throw new RangeError(`countIndex must be a non-negative integer, got ${countIndex}`);
  }
}

/** Duration of one count in milliseconds. */
export function msPerCount(bpm: number): number {
  assertValidBpm(bpm);
  return 60_000 / bpm;
}

/**
 * Absolute time (ms, same clock as `startTimeMs`) at which a count index begins.
 * Computed from the start time rather than accumulated, so it never drifts.
 */
export function countStartTime(countIndex: number, bpm: number, startTimeMs = 0): number {
  assertValidCountIndex(countIndex);
  return startTimeMs + countIndex * msPerCount(bpm);
}

/**
 * Which count index is sounding `elapsedMs` after start.
 * Returns -1 before the first count. A tiny epsilon absorbs float error so a
 * time exactly on a count boundary resolves to that count.
 */
export function countIndexAt(elapsedMs: number, bpm: number): number {
  if (!Number.isFinite(elapsedMs)) {
    throw new RangeError(`elapsedMs must be finite, got ${elapsedMs}`);
  }
  if (elapsedMs < 0) return -1;
  const raw = elapsedMs / msPerCount(bpm);
  return Math.floor(raw + 1e-9);
}

/** Map an absolute count index to its phrase and 1-based count. */
export function phrasePosition(countIndex: number, phraseLength: number): PhrasePosition {
  assertValidCountIndex(countIndex);
  assertValidPhraseLength(phraseLength);
  const phrase = Math.floor(countIndex / phraseLength);
  const count = (countIndex % phraseLength) + 1;
  return {
    phrase,
    count,
    isDownbeat: count === 1,
    isLastCount: count === phraseLength,
  };
}

/** Absolute count index of count `count` (1-based) in phrase `phrase`. */
export function countIndexOf(phrase: number, count: number, phraseLength: number): number {
  assertValidPhraseLength(phraseLength);
  if (!Number.isInteger(phrase) || phrase < 0) {
    throw new RangeError(`phrase must be a non-negative integer, got ${phrase}`);
  }
  if (!Number.isInteger(count) || count < 1 || count > phraseLength) {
    throw new RangeError(`count must be an integer between 1 and ${phraseLength}, got ${count}`);
  }
  return phrase * phraseLength + (count - 1);
}

/**
 * How many counts from `countIndex` until the next count 1 (release).
 * Returns phraseLength when currently on count 1 (i.e. the *next* release).
 */
export function countsUntilNextDownbeat(countIndex: number, phraseLength: number): number {
  const { count } = phrasePosition(countIndex, phraseLength);
  return phraseLength - count + 1;
}
