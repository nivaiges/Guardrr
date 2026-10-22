/**
 * Announcement scheduling and per-count practice events.
 *
 * Model:
 * - Phrase 0 is a lead-in phrase: the metronome runs but nothing is tossed,
 *   because the first call has to be spoken *before* a release.
 * - From phrase 1 on, every count 1 is a release. The call for phrase p is
 *   spoken `leadCounts` counts before that release, i.e. on count
 *   (phraseLength - leadCounts + 1) of phrase p - 1.
 * - The performer catches on count `call` of phrase p (a "5" is caught on 5).
 */

import { Rng, normalizeTossCounts, pickTossCount } from './random';
import { PhrasePosition, assertValidPhraseLength, phrasePosition } from './timing';

/** First phrase that has a toss (phrase 0 is the lead-in). */
export const FIRST_TOSS_PHRASE = 1;

export interface TossSettings {
  /** Counts per phrase/cycle (e.g. 8, 16, 32). */
  phraseLength: number;
  /** How many counts before the release (count 1) the call is spoken. */
  leadCounts: number;
  /** Toss counts that may be called. */
  allowedTossCounts: readonly number[];
  /** Whether the same count may be called twice in a row. */
  allowRepeats: boolean;
}

export const DEFAULT_TOSS_SETTINGS: TossSettings = {
  phraseLength: 16,
  // "5 6 7 8" → the call lands on the "5" of the final 5-6-7-8 (count 13 of 16).
  leadCounts: 4,
  allowedTossCounts: [1, 2, 3, 4, 5, 6, 7],
  allowRepeats: true,
};

export function assertValidLeadCounts(leadCounts: number, phraseLength: number): void {
  assertValidPhraseLength(phraseLength);
  if (!Number.isInteger(leadCounts) || leadCounts < 1 || leadCounts > phraseLength) {
    throw new RangeError(
      `leadCounts must be an integer between 1 and ${phraseLength}, got ${leadCounts}`,
    );
  }
}

/**
 * Restrict the allowed toss counts to ones that can be caught inside the
 * phrase (catch count <= phraseLength). Throws if nothing fits.
 */
export function tossCountsThatFit(allowed: readonly number[], phraseLength: number): number[] {
  assertValidPhraseLength(phraseLength);
  const fitting = normalizeTossCounts(allowed).filter((n) => n <= phraseLength);
  if (fitting.length === 0) {
    throw new RangeError(`no allowed toss count fits in a ${phraseLength}-count phrase`);
  }
  return fitting;
}

/** Validate a full settings object; returns the effective (fitting) toss counts. */
export function validateTossSettings(settings: TossSettings): number[] {
  assertValidLeadCounts(settings.leadCounts, settings.phraseLength);
  return tossCountsThatFit(settings.allowedTossCounts, settings.phraseLength);
}

/** Count (1-based, in the previous phrase) on which the call is spoken. */
export function announceCountInPhrase(phraseLength: number, leadCounts: number): number {
  assertValidLeadCounts(leadCounts, phraseLength);
  return phraseLength - leadCounts + 1;
}

/** Absolute count index at which the call for toss phrase `phrase` is spoken. */
export function announcementCountIndex(
  phrase: number,
  phraseLength: number,
  leadCounts: number,
): number {
  assertValidLeadCounts(leadCounts, phraseLength);
  if (!Number.isInteger(phrase) || phrase < FIRST_TOSS_PHRASE) {
    throw new RangeError(`phrase must be an integer >= ${FIRST_TOSS_PHRASE}, got ${phrase}`);
  }
  return phrase * phraseLength - leadCounts;
}

/**
 * If a call is spoken on `countIndex`, return the phrase it is for;
 * otherwise null.
 */
export function phraseAnnouncedAt(
  countIndex: number,
  phraseLength: number,
  leadCounts: number,
): number | null {
  assertValidLeadCounts(leadCounts, phraseLength);
  if (!Number.isInteger(countIndex) || countIndex < 0) {
    throw new RangeError(`countIndex must be a non-negative integer, got ${countIndex}`);
  }
  const target = countIndex + leadCounts;
  return target % phraseLength === 0 ? target / phraseLength : null;
}

/**
 * Deterministic generator of calls, one per toss phrase, honoring the
 * no-repeat option. Calls are memoized so asking for a phrase twice (e.g.
 * once when announcing, again when showing the catch) gives the same answer.
 */
export class CallSequence {
  private readonly calls: number[] = [];
  private readonly allowed: number[];

  constructor(
    private readonly settings: TossSettings,
    private readonly rng: Rng,
  ) {
    this.allowed = validateTossSettings(settings);
  }

  /** The call for toss phrase `phrase` (>= FIRST_TOSS_PHRASE). */
  callFor(phrase: number): number {
    if (!Number.isInteger(phrase) || phrase < FIRST_TOSS_PHRASE) {
      throw new RangeError(`phrase must be an integer >= ${FIRST_TOSS_PHRASE}, got ${phrase}`);
    }
    const slot = phrase - FIRST_TOSS_PHRASE;
    while (this.calls.length <= slot) {
      const previous = this.calls[this.calls.length - 1];
      this.calls.push(
        pickTossCount(this.allowed, this.rng, {
          previous,
          allowRepeats: this.settings.allowRepeats,
        }),
      );
    }
    return this.calls[slot];
  }

  /** Calls generated so far, oldest first (phrase 1, 2, ...). */
  history(): readonly number[] {
    return this.calls;
  }
}

export interface CountEvents {
  countIndex: number;
  position: PhrasePosition;
  /** Set when the call for an upcoming phrase is spoken on this count. */
  announce: { phrase: number; call: number } | null;
  /** True on count 1 of a toss phrase. */
  release: boolean;
  /** True on the catch count of a toss phrase. */
  catch: boolean;
  /** The call in effect for the current phrase (null in the lead-in). */
  currentCall: number | null;
}

/** Everything that happens on a given count. */
export function eventsAtCount(
  countIndex: number,
  settings: TossSettings,
  calls: CallSequence,
): CountEvents {
  const position = phrasePosition(countIndex, settings.phraseLength);
  const announcedPhrase = phraseAnnouncedAt(countIndex, settings.phraseLength, settings.leadCounts);
  const isTossPhrase = position.phrase >= FIRST_TOSS_PHRASE;
  const currentCall = isTossPhrase ? calls.callFor(position.phrase) : null;
  return {
    countIndex,
    position,
    announce:
      announcedPhrase !== null && announcedPhrase >= FIRST_TOSS_PHRASE
        ? { phrase: announcedPhrase, call: calls.callFor(announcedPhrase) }
        : null,
    release: isTossPhrase && position.isDownbeat,
    catch: currentCall !== null && position.count === currentCall,
    currentCall,
  };
}
