import { DEFAULT_TOSS_SETTINGS, TossSettings, validateTossSettings } from '../announce';
import {
  PHRASE_LENGTH_OPTIONS,
  callChoices,
  clampBpm,
  isCallRange,
  tossCountsForRange,
  tossRangeOf,
  withAllowRepeats,
  withAndCalls,
  withCallToggled,
  withLeadCounts,
  withPhraseLength,
  withTossRange,
} from '../editSettings';
import { createRng } from '../random';

const settings = (overrides: Partial<TossSettings> = {}): TossSettings => ({
  ...DEFAULT_TOSS_SETTINGS,
  ...overrides,
});

describe('editing settings', () => {
  it('clamps BPM to the supported range', () => {
    expect(clampBpm(5)).toBe(20);
    expect(clampBpm(999)).toBe(400);
    expect(clampBpm(120.4)).toBe(120);
  });

  it('reads the range of the default calls', () => {
    expect(tossRangeOf(DEFAULT_TOSS_SETTINGS)).toEqual({ min: 1, max: 7, andCounts: false });
    expect(tossRangeOf(settings({ allowedTossCounts: [2, 2.5, 3] }))).toEqual({
      min: 2,
      max: 3,
      andCounts: true,
    });
  });

  it('builds calls for a range, skipping "1 and" when the pop toss is in it', () => {
    expect(tossCountsForRange({ min: 1, max: 3, andCounts: false }, 16)).toEqual([1, 2, 3]);
    expect(tossCountsForRange({ min: 1, max: 3, andCounts: true }, 16)).toEqual([1, 2, 2.5, 3]);
    expect(tossCountsForRange({ min: 2, max: 3, andCounts: true }, 16)).toEqual([2, 2.5, 3]);
  });

  it('keeps a range inside the phrase', () => {
    expect(tossCountsForRange({ min: 6, max: 10, andCounts: true }, 8)).toEqual([
      6, 6.5, 7, 7.5, 8,
    ]);
    expect(tossCountsForRange({ min: 12, max: 14, andCounts: false }, 8)).toEqual([8]);
  });

  it('sets a toss range, fixing min > max and out-of-phrase values', () => {
    expect(withTossRange(DEFAULT_TOSS_SETTINGS, { min: 3, max: 5, andCounts: false })).toEqual(
      settings({ allowedTossCounts: [3, 4, 5] }),
    );
    expect(
      withTossRange(DEFAULT_TOSS_SETTINGS, { min: 9, max: 4, andCounts: false }).allowedTossCounts,
    ).toEqual([4]);
    expect(
      withTossRange(DEFAULT_TOSS_SETTINGS, { min: 0, max: 40, andCounts: false }).allowedTossCounts,
    ).toHaveLength(16);
  });

  it('clamps lead counts to the phrase', () => {
    expect(withLeadCounts(DEFAULT_TOSS_SETTINGS, 0).leadCounts).toBe(1);
    expect(withLeadCounts(DEFAULT_TOSS_SETTINGS, 20).leadCounts).toBe(16);
    expect(withLeadCounts(DEFAULT_TOSS_SETTINGS, 8).leadCounts).toBe(8);
  });

  it('pulls lead counts and calls in when the phrase gets shorter', () => {
    const long = settings({ leadCounts: 12, allowedTossCounts: [5, 6, 7, 8, 9, 10] });
    expect(withPhraseLength(long, 8)).toEqual(
      settings({ phraseLength: 8, leadCounts: 8, allowedTossCounts: [5, 6, 7, 8] }),
    );
    expect(withPhraseLength(long, 4).allowedTossCounts).toEqual([4]);
  });

  it('leaves lead counts and calls alone when the phrase gets longer', () => {
    expect(withPhraseLength(DEFAULT_TOSS_SETTINGS, 32)).toEqual(settings({ phraseLength: 32 }));
  });

  it('toggles repeats', () => {
    expect(withAllowRepeats(DEFAULT_TOSS_SETTINGS, false).allowRepeats).toBe(false);
  });

  it('never produces settings the engine rejects', () => {
    const rng = createRng(7);
    const int = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
    let s = DEFAULT_TOSS_SETTINGS;
    for (let i = 0; i < 500; i++) {
      switch (int(0, 5)) {
        case 0:
          s = withPhraseLength(s, PHRASE_LENGTH_OPTIONS[int(0, PHRASE_LENGTH_OPTIONS.length - 1)]);
          break;
        case 1:
          s = withLeadCounts(s, int(-2, 40));
          break;
        case 2:
          s = withTossRange(s, { min: int(-2, 40), max: int(-2, 40), andCounts: rng() < 0.5 });
          break;
        case 3:
          s = withCallToggled(s, int(-2, 66) / 2);
          break;
        case 4:
          s = withAndCalls(s, rng() < 0.5);
          break;
        default:
          s = withAllowRepeats(s, rng() < 0.5);
      }
      expect(() => validateTossSettings(s)).not.toThrow();
      // Nothing is silently dropped: every call in the set fits the phrase.
      expect(validateTossSettings(s)).toEqual(s.allowedTossCounts);
    }
  });
});

describe('hand-picked calls', () => {
  it('offers every count of the phrase, and the "and"s except "1 and"', () => {
    expect(callChoices(4, false)).toEqual([1, 2, 3, 4]);
    expect(callChoices(4, true)).toEqual([1, 2, 2.5, 3, 3.5, 4]);
    expect(callChoices(16, false)).toHaveLength(16);
  });

  it('tells a range from a set with gaps', () => {
    expect(isCallRange(DEFAULT_TOSS_SETTINGS)).toBe(true);
    expect(isCallRange(settings({ allowedTossCounts: [2, 2.5, 3] }))).toBe(true);
    expect(isCallRange(settings({ allowedTossCounts: [1, 2, 2.5, 3] }))).toBe(true);
    expect(isCallRange(settings({ allowedTossCounts: [3, 5, 7] }))).toBe(false);
    // "And" calls on some counts only is not a range either.
    expect(isCallRange(settings({ allowedTossCounts: [2, 3, 3.5, 4] }))).toBe(false);
  });

  it('adds and removes calls, keeping them sorted', () => {
    const s = settings({ allowedTossCounts: [3, 5, 7] });
    expect(withCallToggled(s, 4).allowedTossCounts).toEqual([3, 4, 5, 7]);
    expect(withCallToggled(s, 5).allowedTossCounts).toEqual([3, 7]);
    expect(withCallToggled(s, 6.5).allowedTossCounts).toEqual([3, 5, 6.5, 7]);
  });

  it('never removes the last call', () => {
    const one = settings({ allowedTossCounts: [5] });
    expect(withCallToggled(one, 5)).toBe(one);
  });

  it('ignores calls that are invalid or past the end of the phrase', () => {
    const s = settings({ phraseLength: 8, allowedTossCounts: [3, 5] });
    expect(withCallToggled(s, 9)).toBe(s);
    expect(withCallToggled(s, 8.5)).toBe(s);
    expect(withCallToggled(s, 0)).toBe(s);
    expect(withCallToggled(s, 2.25)).toBe(s);
    expect(withCallToggled(s, 8).allowedTossCounts).toEqual([3, 5, 8]);
  });

  it('swaps the pop toss and "1 and", which are caught at the same moment', () => {
    const s = settings({ allowedTossCounts: [1, 3] });
    expect(withCallToggled(s, 1.5).allowedTossCounts).toEqual([1.5, 3]);
    expect(withCallToggled(withCallToggled(s, 1.5), 1).allowedTossCounts).toEqual([1, 3]);
  });

  it('keeps the calls of a hand-picked set that fit a shorter phrase', () => {
    const s = settings({ allowedTossCounts: [3, 5, 7, 12] });
    expect(withPhraseLength(s, 8).allowedTossCounts).toEqual([3, 5, 7]);
    expect(withPhraseLength(s, 32).allowedTossCounts).toEqual([3, 5, 7, 12]);
  });

  it('falls back to the pulled-in range when no hand-picked call fits', () => {
    const s = settings({ allowedTossCounts: [10, 14] });
    expect(withPhraseLength(s, 8).allowedTossCounts).toEqual([8]);
  });

  it('turns a set back into a range when the range is edited', () => {
    const s = settings({ allowedTossCounts: [3, 5, 7] });
    const next = withTossRange(s, { ...tossRangeOf(s), min: 2 });
    expect(next.allowedTossCounts).toEqual([2, 3, 4, 5, 6, 7]);
    expect(isCallRange(next)).toBe(true);
  });

  it('switches "and" calls on and off for a range', () => {
    const on = withAndCalls(settings({ allowedTossCounts: [2, 3, 4] }), true);
    expect(on.allowedTossCounts).toEqual([2, 2.5, 3, 3.5, 4]);
    expect(withAndCalls(on, false).allowedTossCounts).toEqual([2, 3, 4]);
  });

  it('switches "and" calls on and off for a hand-picked set, keeping its shape', () => {
    const s = settings({ phraseLength: 8, allowedTossCounts: [1, 3, 5, 8] });
    const on = withAndCalls(s, true);
    // No "1 and" (same catch as the pop toss), no "8 and" (past the phrase).
    expect(on.allowedTossCounts).toEqual([1, 3, 3.5, 5, 5.5, 8]);
    expect(withAndCalls(on, false).allowedTossCounts).toEqual([1, 3, 5, 8]);
    expect(
      withAndCalls(settings({ allowedTossCounts: [1.5, 4] }), false).allowedTossCounts,
    ).toEqual([1, 4]);
    expect(
      withAndCalls(settings({ allowedTossCounts: [2.5, 6.5] }), false).allowedTossCounts,
    ).toEqual(tossCountsForRange({ min: 2, max: 7, andCounts: false }, 16));
  });
});
