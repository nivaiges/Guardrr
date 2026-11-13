import { DEFAULT_TOSS_SETTINGS, TossSettings, announcementCountIndex } from '../announce';
import {
  COUNT_IN_OPTIONS,
  DEFAULT_COUNT_IN,
  FULL_PHRASE_COUNT_IN,
  countInLabel,
  countOffSummary,
  COUNT_OFF_PATTERNS,
  DEFAULT_COUNT_OFF_PATTERN,
  countOffPatternLabel,
  countOffWord,
  countOffWords,
  isCountOffPattern,
  effectiveCountIn,
  firstCountIndex,
} from '../countIn';
import { phrasePosition } from '../timing';

const settings = (overrides: Partial<TossSettings> = {}): TossSettings => ({
  ...DEFAULT_TOSS_SETTINGS,
  ...overrides,
});

describe('count-in', () => {
  it('defaults to an 8-count count-off', () => {
    expect(DEFAULT_COUNT_IN).toBe(8);
    expect(effectiveCountIn(DEFAULT_COUNT_IN, settings())).toBe(8);
    expect(COUNT_IN_OPTIONS).toContain(DEFAULT_COUNT_IN);
  });

  it('treats 0 as a full lead-in phrase', () => {
    expect(effectiveCountIn(FULL_PHRASE_COUNT_IN, settings())).toBe(16);
    expect(effectiveCountIn(FULL_PHRASE_COUNT_IN, settings({ phraseLength: 32 }))).toBe(32);
    expect(firstCountIndex(FULL_PHRASE_COUNT_IN, settings())).toBe(0);
  });

  it('is never longer than a phrase', () => {
    expect(effectiveCountIn(8, settings({ phraseLength: 4, leadCounts: 2 }))).toBe(4);
    expect(effectiveCountIn(40, settings())).toBe(16);
  });

  it('is never shorter than the lead counts, so the first call is always heard', () => {
    expect(effectiveCountIn(4, settings({ leadCounts: 6 }))).toBe(6);
    expect(effectiveCountIn(4, settings({ leadCounts: 16 }))).toBe(16);
  });

  it('starts the clock part-way through the lead-in phrase', () => {
    const s = settings();
    const first = firstCountIndex(8, s);
    expect(first).toBe(8);
    expect(phrasePosition(first, s.phraseLength)).toMatchObject({ phrase: 0, count: 9 });
    // The first release (count 1 of phrase 1) comes exactly 8 counts after the first click.
    expect(s.phraseLength - first).toBe(8);
  });

  it('always plays the first announcement after the first click', () => {
    for (const phraseLength of [4, 8, 16, 32]) {
      for (let leadCounts = 1; leadCounts <= phraseLength; leadCounts++) {
        for (const countIn of [...COUNT_IN_OPTIONS, 1, 3, 12]) {
          const s = settings({ phraseLength, leadCounts, allowedTossCounts: [1] });
          expect(announcementCountIndex(1, phraseLength, leadCounts)).toBeGreaterThanOrEqual(
            firstCountIndex(countIn, s),
          );
        }
      }
    }
  });

  it('rejects negative or non-finite count-ins', () => {
    expect(() => effectiveCountIn(-1, settings())).toThrow(RangeError);
    expect(() => effectiveCountIn(Number.NaN, settings())).toThrow(RangeError);
  });

  it('labels the options', () => {
    expect(COUNT_IN_OPTIONS.map(countInLabel)).toEqual(['4', '8', 'Phrase']);
  });
});

describe('spoken count-off', () => {
  // DEFAULT_TOSS_SETTINGS: 16 counts; lead counts vary per test.
  const lead = (leadCounts: number, phraseLength = 16) => settings({ leadCounts, phraseLength });

  it('counts "5 6, 5 6 7 8" over an 8-count count-in, ending on the last count', () => {
    expect(countOffWords(8, lead(1))).toEqual([
      { count: 9, word: 'five' },
      { count: 11, word: 'six' },
      { count: 13, word: 'five' },
      { count: 14, word: 'six' },
      { count: 15, word: 'seven' },
    ]);
    expect(countOffSummary(8, lead(1))).toBe('5 6, 5 6 7');
  });

  it('stops before the call so it never talks over it', () => {
    // Lead 2: the call is on count 15, so the count-off is "5 6, 5 6".
    expect(countOffWord(14, 8, lead(2))).toBe('six');
    expect(countOffWord(15, 8, lead(2))).toBeNull();
    expect(countOffWord(16, 8, lead(2))).toBeNull();
    expect(countOffSummary(8, lead(2))).toBe('5 6, 5 6');
  });

  it('speaks the 8 only when the lead leaves room for it', () => {
    // A 1-count lead still announces on count 16; count-off words end on 15.
    expect(countOffWord(16, 8, lead(1))).toBeNull();
    // A lead of 0 isn't allowed, so the full "5 6, 5 6 7 8" is never spoken
    // in practice; the pattern itself still ends on "eight".
    expect(countOffSummary(8, lead(1))).not.toContain('8');
  });

  it('uses the quick "5 6 7 8" for a 4-count count-in', () => {
    expect(countOffWords(4, lead(1))).toEqual([
      { count: 13, word: 'five' },
      { count: 14, word: 'six' },
      { count: 15, word: 'seven' },
    ]);
  });

  it('counts only the last 8 counts of a full-phrase count-in', () => {
    expect(countOffWord(1, FULL_PHRASE_COUNT_IN, lead(2))).toBeNull();
    expect(countOffWord(8, FULL_PHRASE_COUNT_IN, lead(2))).toBeNull();
    expect(countOffWord(9, FULL_PHRASE_COUNT_IN, lead(2))).toBe('five');
    expect(countOffSummary(FULL_PHRASE_COUNT_IN, lead(2))).toBe('5 6, 5 6');
  });

  it('lines up with the end of any phrase length', () => {
    expect(countOffWords(8, lead(2, 32)).map((w) => w.count)).toEqual([25, 27, 29, 30]);
    // An 8-count phrase with a full-phrase count-in is the whole phrase.
    expect(countOffSummary(FULL_PHRASE_COUNT_IN, lead(2, 8))).toBe('5 6, 5 6');
    // A 6-count phrase is too short for the long pattern: quick count-off.
    expect(countOffSummary(FULL_PHRASE_COUNT_IN, lead(1, 6))).toBe('5 6 7');
  });

  it('has nothing to say when the lead covers the whole count-off', () => {
    expect(countOffSummary(4, lead(4))).toBeNull();
    expect(countOffWords(4, lead(4))).toEqual([]);
  });

  it('rejects counts outside the phrase', () => {
    expect(() => countOffWord(0, 8, lead(2))).toThrow(RangeError);
    expect(() => countOffWord(17, 8, lead(2))).toThrow(RangeError);
  });
});

describe('count-off patterns', () => {
  const lead = (leadCounts: number, phraseLength = 16) => settings({ leadCounts, phraseLength });

  it('offers prep (default), straight and quick, with chip labels', () => {
    expect(COUNT_OFF_PATTERNS).toEqual(['prep', 'straight', 'quick']);
    expect(DEFAULT_COUNT_OFF_PATTERN).toBe('prep');
    expect(COUNT_OFF_PATTERNS.map(countOffPatternLabel)).toEqual([
      '5 6, 5 6 7 8',
      '1 – 8',
      '5 6 7 8',
    ]);
    expect(isCountOffPattern('quick')).toBe(true);
    expect(isCountOffPattern('ready')).toBe(false);
    expect(isCountOffPattern(undefined)).toBe(false);
  });

  it('is "5 6, 5 6 7 8" by default, same as before patterns existed', () => {
    expect(countOffWords(8, lead(1), 'prep')).toEqual(countOffWords(8, lead(1)));
  });

  it('counts a straight "1 2 3 4 5 6 7 8", one word per count', () => {
    expect(countOffWords(8, lead(1), 'straight')).toEqual([
      { count: 9, word: 'one' },
      { count: 10, word: 'two' },
      { count: 11, word: 'three' },
      { count: 12, word: 'four' },
      { count: 13, word: 'five' },
      { count: 14, word: 'six' },
      { count: 15, word: 'seven' },
    ]);
    expect(countOffSummary(8, lead(1), 'straight')).toBe('1 2 3 4 5 6 7');
    expect(countOffSummary(FULL_PHRASE_COUNT_IN, lead(2), 'straight')).toBe('1 2 3 4 5 6');
  });

  it('counts only "5 6 7 8" on the last four counts for quick', () => {
    expect(countOffWords(8, lead(1), 'quick')).toEqual([
      { count: 13, word: 'five' },
      { count: 14, word: 'six' },
      { count: 15, word: 'seven' },
    ]);
    expect(countOffSummary(FULL_PHRASE_COUNT_IN, lead(2), 'quick')).toBe('5 6');
  });

  it('falls back to "5 6 7 8" when the count-in is too short for eight counts', () => {
    expect(countOffSummary(4, lead(1), 'straight')).toBe('5 6 7');
    expect(countOffSummary(4, lead(1), 'prep')).toBe('5 6 7');
    expect(countOffSummary(FULL_PHRASE_COUNT_IN, lead(1, 6), 'straight')).toBe('5 6 7');
  });

  it('still stops before the call', () => {
    expect(countOffWord(13, 8, lead(4), 'straight')).toBeNull();
    expect(countOffSummary(8, lead(4), 'straight')).toBe('1 2 3 4');
    expect(countOffSummary(8, lead(4), 'quick')).toBeNull();
  });
});
