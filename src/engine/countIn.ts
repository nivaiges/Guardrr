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

/**
 * Spoken count-off: the voice counts the prep over the count-in clicks, the
 * way a captain or tech counts a guard in — "five, six, five six seven
 * eight" over the last 8 counts before the first release (the 5 and 6 held
 * for two counts each), or "five six seven eight" over a 4-count count-in.
 *
 * Indexed from the end of the lead-in phrase, so it lines up with count 1
 * whatever the phrase length: `COUNT_OFF_LONG[0]` is the last count.
 */
const COUNT_OFF_LONG: readonly (string | null)[] = [
  'eight',
  'seven',
  'six',
  'five',
  null,
  'six',
  null,
  'five',
];
const COUNT_OFF_SHORT: readonly (string | null)[] = ['eight', 'seven', 'six', 'five'];
const COUNT_OFF_STRAIGHT: readonly (string | null)[] = [
  'eight',
  'seven',
  'six',
  'five',
  'four',
  'three',
  'two',
  'one',
];

/**
 * How the count-off is counted (Settings → Sound, under "Speak the count-off"):
 *
 * - `prep` — "5 6, 5 6 7 8", the usual colorguard prep count (default).
 * - `straight` — "1 2 3 4 5 6 7 8", for drills counted in from a full eight.
 * - `quick` — "5 6 7 8" on the last four counts only.
 * - `ready` — "ready, and" on the two counts just before the call is spoken,
 *   the way a tech starts a guard on a cue rather than a full count. It's
 *   tied to the call, not the release, so it works with any lead (even the
 *   default 4, where "5 6 7 8" would land on top of the call), and the call
 *   itself becomes the "go". Needs two counts of count-in before the call.
 *
 * - `custom` — the performer's own words (a captain's cue like "hit it", or
 *   "and set"), one word per count, ending on the count just before the call,
 *   like `ready`. All of them or none: a cue cut short means nothing, so with
 *   more words than counts before the call nothing is spoken (see
 *   customCountOffNote).
 *
 * `prep` and `straight` need an 8-count count-in; a shorter one falls back to
 * the quick "5 6 7 8".
 */
export type CountOffPattern = 'prep' | 'straight' | 'quick' | 'ready' | 'custom';

export const COUNT_OFF_PATTERNS: readonly CountOffPattern[] = [
  'prep',
  'straight',
  'quick',
  'ready',
  'custom',
];

/** Most words a custom count-off can have (a full 8-count count-in, one word per count). */
export const MAX_COUNT_OFF_WORDS = 8;

/** Longest single custom word, in characters; anything longer can't be said in one count. */
export const MAX_COUNT_OFF_WORD_LENGTH = 16;

/** Words a new custom count-off starts with: a common captain's cue. */
export const DEFAULT_CUSTOM_COUNT_OFF_WORDS: readonly string[] = ['ready', 'set'];

/**
 * The custom count-off words typed by the performer: split on spaces and
 * commas, punctuation other than apostrophes and hyphens dropped ("Hit it!" →
 * ["hit", "it"]), lower-cased (the voice reads "SET" as letters on some
 * phones), each word cut to MAX_COUNT_OFF_WORD_LENGTH and at most
 * MAX_COUNT_OFF_WORDS words.
 */
export function parseCountOffWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,;/]+/)
    .map((w) => w.replace(/[^\p{L}\p{N}'-]/gu, '').replace(/^['-]+|['-]+$/g, ''))
    .filter((w) => w.length > 0)
    .map((w) => w.slice(0, MAX_COUNT_OFF_WORD_LENGTH))
    .slice(0, MAX_COUNT_OFF_WORDS);
}

/** The words as the text field shows them: "ready set". */
export function formatCountOffWords(words: readonly string[]): string {
  return words.join(' ');
}

/** Stored custom words, cleaned the same way as typed ones; anything else → the defaults. */
export function parseStoredCountOffWords(value: unknown): string[] {
  if (!Array.isArray(value)) return [...DEFAULT_CUSTOM_COUNT_OFF_WORDS];
  return parseCountOffWords(value.filter((w): w is string => typeof w === 'string').join(' '));
}

export const DEFAULT_COUNT_OFF_PATTERN: CountOffPattern = 'prep';

export function isCountOffPattern(value: unknown): value is CountOffPattern {
  return COUNT_OFF_PATTERNS.includes(value as CountOffPattern);
}

/** Chip labels for the settings screen. */
export function countOffPatternLabel(pattern: CountOffPattern): string {
  switch (pattern) {
    case 'prep':
      return '5 6, 5 6 7 8';
    case 'straight':
      return '1 – 8';
    case 'quick':
      return '5 6 7 8';
    case 'ready':
      return 'Ready, and';
    case 'custom':
      return 'Your words';
  }
}

function patternWords(pattern: CountOffPattern, used: number): readonly (string | null)[] {
  if (pattern === 'quick' || used < COUNT_OFF_LONG.length) return COUNT_OFF_SHORT;
  return pattern === 'straight' ? COUNT_OFF_STRAIGHT : COUNT_OFF_LONG;
}

/**
 * The count-off word to speak on `count` (1-based) of the lead-in phrase, or
 * null for a plain click.
 *
 * - The long "5 6, 5 6 7 8" needs a count-in of 8 counts or more; a shorter
 *   count-in gets the quick "5 6 7 8" on its last 4 counts (or fewer, if the
 *   count-in itself is shorter).
 * - The call wins: nothing is counted from the count the first call is spoken
 *   on (lead counts before the release), so the count-off never talks over it.
 *   With a 2-count lead the performer hears "five, six, five six" then the
 *   call.
 * - `pattern` picks the words (see CountOffPattern); `customWords` are the
 *   words of the `custom` pattern.
 */
export function countOffWord(
  count: number,
  countIn: number,
  settings: TossSettings,
  pattern: CountOffPattern = DEFAULT_COUNT_OFF_PATTERN,
  customWords: readonly string[] = DEFAULT_CUSTOM_COUNT_OFF_WORDS,
): string | null {
  const L = settings.phraseLength;
  if (!Number.isInteger(count) || count < 1 || count > L) {
    throw new RangeError(`count must be an integer between 1 and ${L}, got ${count}`);
  }
  const used = effectiveCountIn(countIn, settings);
  // The call is spoken on count L - lead + 1; count only before it.
  if (count > L - settings.leadCounts) return null;
  const fromEnd = L - count;
  if (fromEnd >= used) return null;
  if (pattern === 'ready' || pattern === 'custom') {
    const cue = pattern === 'ready' ? READY_AND : customWords;
    return cueWord(cue, fromEnd - settings.leadCounts, used - settings.leadCounts);
  }
  return patternWords(pattern, used)[fromEnd] ?? null;
}

/**
 * A word of a cue that ends just before the call ("ready, and" or the
 * performer's own words): `beforeCall` counts before the count the call is
 * spoken on (0 = the count just before it), when `room` counts of count-in
 * come before the call. All the words or none — a cue cut short means nothing.
 */
function cueWord(words: readonly string[], beforeCall: number, room: number): string | null {
  if (words.length === 0 || room < words.length) return null;
  return words[words.length - 1 - beforeCall] ?? null;
}

/** "ready" two counts before the call, "and" right before it. */
const READY_AND: readonly string[] = ['ready', 'and'];

/** Counts of count-in before the first call is spoken (where a cue like "ready, and" must fit). */
export function countsBeforeCall(countIn: number, settings: TossSettings): number {
  return effectiveCountIn(countIn, settings) - settings.leadCounts;
}

/**
 * The note under the custom words field: when they're spoken, or why not.
 *
 * - no words: "Type up to 8 words, one per count."
 * - they fit: "Spoken on counts 13–15, one word per count, then the call."
 * - too many: "4 words but only 2 counts before the call — shorten the lead,
 *   lengthen the count-in or drop a word."
 */
export function customCountOffNote(
  words: readonly string[],
  countIn: number,
  settings: TossSettings,
): string {
  if (words.length === 0) return `Type up to ${MAX_COUNT_OFF_WORDS} words, one per count.`;
  const room = countsBeforeCall(countIn, settings);
  if (words.length > room) {
    const counts = room === 1 ? '1 count' : `${room} counts`;
    return `${words.length} words but only ${counts} before the call — shorten the lead, lengthen the count-in or drop a word.`;
  }
  const last = settings.phraseLength - settings.leadCounts;
  const first = last - words.length + 1;
  const where = first === last ? `count ${last}` : `counts ${first}–${last}`;
  const each = words.length === 1 ? '' : ', one word per count';
  return `Spoken on ${where}${each}, then the call.`;
}

/** The whole count-off for these settings, count by count (for the settings hint and tests). */
export function countOffWords(
  countIn: number,
  settings: TossSettings,
  pattern: CountOffPattern = DEFAULT_COUNT_OFF_PATTERN,
  customWords: readonly string[] = DEFAULT_CUSTOM_COUNT_OFF_WORDS,
): { count: number; word: string }[] {
  const words: { count: number; word: string }[] = [];
  for (let count = 1; count <= settings.phraseLength; count++) {
    const word = countOffWord(count, countIn, settings, pattern, customWords);
    if (word) words.push({ count, word });
  }
  return words;
}

/** "5 6, 5 6 7" style summary of what will be spoken, or null if nothing fits before the call. */
export function countOffSummary(
  countIn: number,
  settings: TossSettings,
  pattern: CountOffPattern = DEFAULT_COUNT_OFF_PATTERN,
  customWords: readonly string[] = DEFAULT_CUSTOM_COUNT_OFF_WORDS,
): string | null {
  const digits: Record<string, string> = {
    one: '1',
    two: '2',
    three: '3',
    four: '4',
    five: '5',
    six: '6',
    seven: '7',
    eight: '8',
  };
  const words = countOffWords(countIn, settings, pattern, customWords);
  if (words.length === 0) return null;
  // Words, not digits: quoted so the toggle reads ('Speak the count-off ("ready, and", then the call)').
  if (pattern === 'ready' || pattern === 'custom')
    return `"${words.map((w) => w.word).join(', ')}"`;
  // A held count (a gap of more than one count) reads as a comma: "5 6, 5 6 7 8".
  return words
    .map((w, i) => {
      const held = i > 0 && w.count - words[i - 1].count > 1 && digits[w.word] === '5';
      return `${held ? ', ' : i > 0 ? ' ' : ''}${digits[w.word]}`;
    })
    .join('');
}
