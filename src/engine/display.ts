/**
 * What the big practice display shows for a cue.
 *
 * Pure view-model: the phase of the toss (lead-in, prep, release, in the air,
 * catch, marking time), a short headline, countdowns, and a per-count strip
 * of the phrase with release/call/catch markers. The UI only renders it.
 */

import { TossSettings, announceCountInPhrase } from './announce';
import { catchPositionOf, catchesOnAnd } from './calls';
import { PracticeCue, displayLabelForCall } from './practice';

export type DisplayPhase =
  /** Not practicing. */
  | 'ready'
  /** Phrase 0: metronome only, nothing tossed yet. */
  | 'lead-in'
  /** Count 1: let go. */
  | 'release'
  /** Between release and catch. */
  | 'in-air'
  /** The catch lands on this tick. */
  | 'catch'
  /** Caught; keep marking time until the phrase ends. */
  | 'marking';

export type BeatMarker = 'release' | 'catch' | 'call' | null;

export interface PhraseBeat {
  /** 1-based count in the phrase. */
  count: number;
  /** What happens on (or on the "and" right after) this count. */
  marker: BeatMarker;
  /** The catch for this count is on its "and". */
  catchOnAnd: boolean;
  /** Count already played this phrase (not including the current one). */
  past: boolean;
  current: boolean;
}

export interface PracticeDisplay {
  phase: DisplayPhase;
  /** Big text under the count: "Release!", "Catch!", "5 count", ... */
  headline: string;
  /** Smaller line: what to do next. */
  detail: string;
  /** The current count (1-based), or null when not practicing. */
  count: number | null;
  /** The call for the current phrase as a label ("5", "2&"), or null. */
  callLabel: string | null;
  /** The call spoken for the next phrase, once spoken. */
  nextCallLabel: string | null;
  /**
   * Counts left until the catch while the flag is in the air (0.5 when the
   * catch is on the next "and"), else null.
   */
  countsToCatch: number | null;
  /** Counts left until the next release, from the announcement on; else null. */
  countsToRelease: number | null;
  /** One entry per count of the phrase. */
  beats: PhraseBeat[];
}

function beatsFor(
  settings: TossSettings,
  call: number | null,
  current: number | null,
): PhraseBeat[] {
  const announceCount = announceCountInPhrase(settings.phraseLength, settings.leadCounts);
  const catchCount = call === null ? null : Math.floor(catchPositionOf(call));
  const beats: PhraseBeat[] = [];
  for (let count = 1; count <= settings.phraseLength; count++) {
    let marker: BeatMarker = null;
    // Priority: the catch is what the performer is tracking, then the release.
    if (count === catchCount) marker = 'catch';
    else if (count === 1 && call !== null) marker = 'release';
    else if (count === announceCount) marker = 'call';
    beats.push({
      count,
      marker,
      catchOnAnd: count === catchCount && call !== null && catchesOnAnd(call),
      past: current !== null && count < current,
      current: count === current,
    });
  }
  return beats;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** Display model for a cue (null cue = not practicing). */
export function practiceDisplay(cue: PracticeCue | null, settings: TossSettings): PracticeDisplay {
  if (!cue) {
    return {
      phase: 'ready',
      headline: 'Ready',
      detail: 'Press Start',
      count: null,
      callLabel: null,
      nextCallLabel: null,
      countsToCatch: null,
      countsToRelease: null,
      beats: beatsFor(settings, null, null),
    };
  }

  const call = cue.currentCall;
  const label = call === null ? null : displayLabelForCall(call);
  const nextLabel = cue.nextCall === null ? null : displayLabelForCall(cue.nextCall);
  // Position in counts within the phrase, with "and"s as .5.
  const position = cue.count + cue.subdivision * 0.5;
  const toRelease = nextLabel === null ? null : settings.phraseLength - cue.count + 1;
  const prep = toRelease === null ? '' : `Release in ${plural(toRelease, 'count')}`;

  let phase: DisplayPhase;
  let headline: string;
  let detail: string;
  let countsToCatch: number | null = null;

  if (call === null) {
    phase = 'lead-in';
    headline = nextLabel === null ? 'Lead-in' : `${nextLabel} count`;
    detail = prep || 'Listen for the call';
  } else if (cue.release) {
    phase = 'release';
    headline = 'Release!';
    detail = `Catch on ${label}`;
  } else if (cue.catch) {
    phase = 'catch';
    headline = 'Catch!';
    detail = prep || 'Mark time';
  } else if (position < catchPositionOf(call)) {
    phase = 'in-air';
    countsToCatch = catchPositionOf(call) - position;
    headline = `${label} count`;
    detail = `Catch on ${label}`;
  } else {
    phase = 'marking';
    headline = nextLabel === null ? 'Mark time' : `${nextLabel} count`;
    detail = prep || 'Listen for the call';
  }

  return {
    phase,
    headline,
    detail,
    count: cue.count,
    callLabel: label,
    nextCallLabel: nextLabel,
    countsToCatch,
    countsToRelease: toRelease,
    beats: beatsFor(settings, call, cue.count),
  };
}
