import { DEFAULT_TOSS_SETTINGS, TossSettings, validateTossSettings } from '../announce';
import {
  PHRASE_LENGTH_OPTIONS,
  clampBpm,
  tossCountsForRange,
  tossRangeOf,
  withAllowRepeats,
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
      switch (int(0, 3)) {
        case 0:
          s = withPhraseLength(s, PHRASE_LENGTH_OPTIONS[int(0, PHRASE_LENGTH_OPTIONS.length - 1)]);
          break;
        case 1:
          s = withLeadCounts(s, int(-2, 40));
          break;
        case 2:
          s = withTossRange(s, { min: int(-2, 40), max: int(-2, 40), andCounts: rng() < 0.5 });
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
