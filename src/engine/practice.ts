/**
 * Practice cues: what the app should do on each scheduler tick.
 *
 * Turns a scheduler Tick (count or "and") plus the toss settings into a
 * framework-free description of the sound to play, the call to speak and the
 * state to show. The audio/speech/UI layers only execute these cues, so all
 * of the musical logic stays testable here.
 */

import { CallSequence, CountEvents, TossSettings, eventsAtCount } from './announce';
import { callLabel } from './calls';

export type ClickKind = 'accent' | 'count' | 'and';

export interface CueOptions {
  /** Accent count 1 of every phrase with a distinct click. Default true. */
  accentDownbeat?: boolean;
  /** Play a quieter click on "and" ticks (needs ticksPerCount = 2). Default false. */
  andClicks?: boolean;
  /** Buzz the phone on every release (count 1) once tosses start. Default true. */
  haptics?: boolean;
}

/** Vibration to play on a tick: a firm tap on the release. */
export type HapticKind = 'release';

export interface PracticeCue {
  tick: number;
  countIndex: number;
  /** 0 on the count, 1 on its "and" (ticksPerCount = 2). */
  subdivision: number;
  /** Click to play, or null for silence. */
  click: ClickKind | null;
  /** Text to speak (the upcoming call), or null. Only on counts, never "and"s. */
  speak: string | null;
  /** The phrase the spoken call is for, when `speak` is set. */
  announcedPhrase: number | null;
  /** The call just announced for the next phrase, once spoken (until its release). */
  nextCall: number | null;
  /** 1-based count within the phrase. */
  count: number;
  phrase: number;
  /** The call being tossed in the current phrase (null in the lead-in). */
  currentCall: number | null;
  /** Release happens on this tick. */
  release: boolean;
  /** Catch happens on this tick. */
  catch: boolean;
  /** Vibration to play, or null. */
  haptic: HapticKind | null;
}

const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
];

const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty'];

/** English words for 0..64 (the largest phrase length). */
export function numberWord(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 64) {
    throw new RangeError(`numberWord supports integers 0..64, got ${n}`);
  }
  if (n <= 20) return NUMBER_WORDS[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones === 0 ? TENS[tens] : `${TENS[tens]}-${NUMBER_WORDS[ones]}`;
}

/**
 * What the voice says for a call. Spelled out so every TTS engine reads
 * "five" rather than "number five" or "5.0": 5 → "five", 2.5 → "two and".
 */
export function speechTextForCall(call: number): string {
  const whole = Math.floor(call);
  return Number.isInteger(call) ? numberWord(whole) : `${numberWord(whole)} and`;
}

/** Short label for the display: 5 → "5", 2.5 → "2&". */
export function displayLabelForCall(call: number): string {
  return callLabel(call).replace(' and', '&');
}

function clickFor(subdivision: number, events: CountEvents, options: CueOptions): ClickKind | null {
  if (subdivision > 0) return options.andClicks ? 'and' : null;
  if ((options.accentDownbeat ?? true) && events.position.isDownbeat) return 'accent';
  return 'count';
}

/**
 * Cue for one scheduler tick. Drive the scheduler with `ticksPerCount: 2`:
 * subdivision 1 is the "and", which is where "and" calls and pop tosses are
 * caught. With `ticksPerCount: 1` those catches have no tick of their own and
 * are never reported.
 */
export function cueForTick(
  tick: { tick: number; countIndex: number; subdivision: number },
  settings: TossSettings,
  calls: CallSequence,
  options: CueOptions = {},
): PracticeCue {
  const events = eventsAtCount(tick.countIndex, settings, calls);
  const onCount = tick.subdivision === 0;
  const announce = onCount ? events.announce : null;
  const nextPhrase = events.position.phrase + 1;
  // The next call is known (spoken) from the announcement count onwards.
  const announceIndex = nextPhrase * settings.phraseLength - settings.leadCounts;
  const nextCall = tick.countIndex >= announceIndex ? calls.callFor(nextPhrase) : null;
  const release = onCount && events.release;
  return {
    tick: tick.tick,
    countIndex: tick.countIndex,
    subdivision: tick.subdivision,
    click: clickFor(tick.subdivision, events, options),
    speak: announce ? speechTextForCall(announce.call) : null,
    announcedPhrase: announce ? announce.phrase : null,
    nextCall,
    count: events.position.count,
    phrase: events.position.phrase,
    currentCall: events.currentCall,
    release,
    catch: onCount ? events.catch : events.catchOnAnd && tick.subdivision === 1,
    haptic: release && (options.haptics ?? true) ? 'release' : null,
  };
}
