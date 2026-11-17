/**
 * How the call buzz feels (see CueOptions.callHaptics).
 *
 * - "double": the system warning pattern, a double pulse that only says
 *   "a call was made — look at the screen".
 * - "count": the call's number as pulses, so the performer can feel the call
 *   without looking: a 5 is five pulses; an "and" call adds one lighter pulse
 *   after a longer gap (3& = three pulses, a pause, a light tap). A pop toss
 *   ("1") is a single pulse.
 * - "grouped": like "count", but long calls are split into groups of four
 *   with a pause between groups (7 = four pulses, a pause, three), because
 *   more than about four quick taps can't be counted at a glance by feel.
 *   Calls up to 4 feel exactly as in "count".
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

export type CallBuzzStyle = 'double' | 'count' | 'grouped';

/** The styles that tap out the number (everything but the double buzz). */
export type CallPulseStyle = Exclude<CallBuzzStyle, 'double'>;

export const CALL_BUZZ_STYLES: readonly CallBuzzStyle[] = ['double', 'count', 'grouped'];
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
/** Pulses per group in the "grouped" style. */
export const PULSE_GROUP_SIZE = 4;
/** In groups of four, three groups (12) are still countable. */
export const MAX_GROUPED_PULSES = 12;

/** The most whole pulses a style will tap out before falling back to the double buzz. */
export function maxPulses(style: CallPulseStyle): number {
  return style === 'grouped' ? MAX_GROUPED_PULSES : MAX_COUNT_PULSES;
}

/** How a call's whole pulses are grouped: [5] for "count", [4, 1] for "grouped". */
export function pulseGroups(whole: number, style: CallPulseStyle): number[] {
  if (style === 'count' || whole <= PULSE_GROUP_SIZE) return [whole];
  const groups: number[] = [];
  for (let left = whole; left > 0; left -= PULSE_GROUP_SIZE) {
    groups.push(Math.min(PULSE_GROUP_SIZE, left));
  }
  return groups;
}

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
 * Gap units: one between pulses in a group, two between groups and before
 * the "and" pulse, so a pattern of N pulses in G groups spans
 * (N - 1) + (G - 1) units, plus 2 for an "and" call.
 */
export function callPulsePattern(
  call: number,
  bpm: number,
  leadCounts: number,
  style: CallPulseStyle = 'count',
): CallPulse[] | null {
  assertValidCall(call);
  const whole = Math.floor(call);
  const andCall = isAndCall(call);
  if (whole > maxPulses(style)) return null;

  const groups = pulseGroups(whole, style);
  const units = whole - 1 + (groups.length - 1) + (andCall ? 2 : 0);
  if (units === 0) return [{ atMs: 0, strength: 'medium' }];

  const count = msPerCount(bpm);
  const windowMs = leadCounts * count - count / 2;
  const gap = Math.min(PULSE_GAP_MAX_MS, windowMs / units);
  if (gap < PULSE_GAP_MIN_MS) return null;

  const pulses: CallPulse[] = [];
  let unit = 0;
  groups.forEach((size, g) => {
    if (g > 0) unit += 1; // the extra unit of pause between groups
    for (let i = 0; i < size; i++) {
      pulses.push({ atMs: Math.floor(unit * gap), strength: 'medium' });
      unit += 1;
    }
  });
  if (andCall) pulses.push({ atMs: Math.floor(unit * gap + gap), strength: 'light' });
  return pulses;
}

/** The calls (from a set) that would fall back to the double buzz. */
export function callsTooLongToBuzz(
  calls: readonly number[],
  bpm: number,
  leadCounts: number,
  style: CallPulseStyle = 'count',
): number[] {
  return calls.filter((call) => callPulsePattern(call, bpm, leadCounts, style) === null);
}

/** Label for the style chips in Settings. */
export function callBuzzStyleLabel(style: CallBuzzStyle): string {
  switch (style) {
    case 'double':
      return 'Double buzz';
    case 'count':
      return 'Buzz the number';
    case 'grouped':
      return 'Taps in fours';
  }
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
  if (style === 'double') return null;
  const max = maxPulses(style);
  const calls = tossCountsThatFit(
    normalizeTossCounts(settings.allowedTossCounts),
    settings.phraseLength,
  );
  const tooLong = callsTooLongToBuzz(calls, bpm, settings.leadCounts, style);
  if (tooLong.length === calls.length) {
    return `No call fits as taps before the release at ${bpm} BPM, so every call gets the double buzz. Use more lead counts or a slower tempo.`;
  }
  const overMax = tooLong.filter((c) => Math.floor(c) > max);
  const tight = tooLong.filter((c) => !overMax.includes(c));
  const sentences: string[] = [];
  if (tight.length === 0) {
    const how = style === 'grouped' ? 'A 7 is four taps, a pause, then three' : 'A 5 is five taps';
    sentences.push(
      calls.some((c) => isAndCall(c))
        ? `${how}; an "and" call adds a lighter tap after a pause.`
        : `${how}.`,
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
    sentences.push(`Calls over ${max} counts get the double buzz (too many taps to count).`);
  }
  return sentences.join(' ');
}
