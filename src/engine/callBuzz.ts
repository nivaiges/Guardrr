/**
 * How the call buzz feels (see CueOptions.callHaptics).
 *
 * - "double": the system warning pattern, a double pulse that only says
 *   "a call was made — look at the screen".
 * - "count": the call's number as pulses, so the performer can feel the call
 *   without looking: a 5 is five pulses; an "and" call adds one lighter pulse
 *   after a longer gap (3& = three pulses, a pause, a light tap). A pop toss
 *   ("1") is a single pulse.
 *
 * The pulses start on the count the call is spoken and must be over half a
 * count before the release, so the release buzz never runs into them. When a
 * call's pulses can't fit at a readable spacing (fast tempo, few lead counts,
 * a long call) that call falls back to the double buzz.
 */

import { TossSettings, tossCountsThatFit } from './announce';
import { assertValidCall, callLabel, isAndCall } from './calls';
import { normalizeTossCounts } from './random';
import { msPerCount } from './timing';

export type CallBuzzStyle = 'double' | 'count';

export const CALL_BUZZ_STYLES: readonly CallBuzzStyle[] = ['double', 'count'];
export const DEFAULT_CALL_BUZZ_STYLE: CallBuzzStyle = 'double';

export function isCallBuzzStyle(value: unknown): value is CallBuzzStyle {
  return CALL_BUZZ_STYLES.includes(value as CallBuzzStyle);
}

/** Pulses further apart than this add nothing but time. */
export const PULSE_GAP_MAX_MS = 200;
/** Closer than this, phone motors blur pulses together and they can't be counted. */
export const PULSE_GAP_MIN_MS = 120;
/** More pulses than this can't be counted mid-toss; such calls get the double buzz. */
export const MAX_COUNT_PULSES = 8;

export type PulseStrength = 'medium' | 'light';

export interface CallPulse {
  /** Milliseconds after the call is spoken. */
  atMs: number;
  strength: PulseStrength;
}

/**
 * The pulses for a call, or null when they don't fit before the release (the
 * caller then plays the double buzz).
 *
 * Gap units: one between whole pulses, two before the "and" pulse, so the
 * pattern of N pulses spans (N - 1) units, plus 2 for an "and" call.
 */
export function callPulsePattern(
  call: number,
  bpm: number,
  leadCounts: number,
): CallPulse[] | null {
  assertValidCall(call);
  const whole = Math.floor(call);
  const andCall = isAndCall(call);
  if (whole > MAX_COUNT_PULSES) return null;

  const units = whole - 1 + (andCall ? 2 : 0);
  if (units === 0) return [{ atMs: 0, strength: 'medium' }];

  const count = msPerCount(bpm);
  const windowMs = leadCounts * count - count / 2;
  const gap = Math.min(PULSE_GAP_MAX_MS, windowMs / units);
  if (gap < PULSE_GAP_MIN_MS) return null;

  const pulses: CallPulse[] = [];
  for (let i = 0; i < whole; i++) pulses.push({ atMs: Math.floor(i * gap), strength: 'medium' });
  if (andCall) pulses.push({ atMs: Math.floor((whole + 1) * gap), strength: 'light' });
  return pulses;
}

/** The calls (from a set) that would fall back to the double buzz. */
export function callsTooLongToBuzz(
  calls: readonly number[],
  bpm: number,
  leadCounts: number,
): number[] {
  return calls.filter((call) => callPulsePattern(call, bpm, leadCounts) === null);
}

/** Label for the style chips in Settings. */
export function callBuzzStyleLabel(style: CallBuzzStyle): string {
  return style === 'double' ? 'Double buzz' : 'Buzz the number';
}

/**
 * The note under the style chips: how to read the pulses, or which calls
 * fall back to the double buzz at this tempo and lead. Null for "double".
 */
export function callBuzzNote(
  style: CallBuzzStyle,
  settings: TossSettings,
  bpm: number,
): string | null {
  if (style !== 'count') return null;
  const calls = tossCountsThatFit(
    normalizeTossCounts(settings.allowedTossCounts),
    settings.phraseLength,
  );
  const tooLong = callsTooLongToBuzz(calls, bpm, settings.leadCounts);
  if (tooLong.length === calls.length) {
    return `No call fits as taps before the release at ${bpm} BPM, so every call gets the double buzz. Use more lead counts or a slower tempo.`;
  }
  const overMax = tooLong.filter((c) => Math.floor(c) > MAX_COUNT_PULSES);
  const tight = tooLong.filter((c) => !overMax.includes(c));
  const sentences: string[] = [];
  if (tight.length === 0) {
    sentences.push(
      calls.some((c) => isAndCall(c))
        ? 'A 5 is five taps; an "and" call adds a lighter tap after a pause.'
        : 'A 5 is five taps.',
    );
  } else {
    const labels = tight.map(callLabel);
    const one = labels.length === 1;
    const list = one
      ? labels[0]
      : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
    sentences.push(
      `${one ? 'Call' : 'Calls'} ${list} ${one ? "doesn't" : "don't"} fit as taps before the release at ${bpm} BPM, so ${one ? 'it gets' : 'they get'} the double buzz.`,
    );
  }
  if (overMax.length > 0) {
    sentences.push(
      `Calls over ${MAX_COUNT_PULSES} counts get the double buzz (too many taps to count).`,
    );
  }
  return sentences.join(' ');
}
