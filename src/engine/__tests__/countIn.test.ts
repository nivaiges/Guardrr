import { DEFAULT_TOSS_SETTINGS, TossSettings, announcementCountIndex } from '../announce';
import {
  COUNT_IN_OPTIONS,
  DEFAULT_COUNT_IN,
  FULL_PHRASE_COUNT_IN,
  countInLabel,
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
