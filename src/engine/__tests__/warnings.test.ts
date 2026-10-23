import { DEFAULT_TOSS_SETTINGS, TossSettings } from '../announce';
import { settingsWarnings } from '../warnings';

const settings = (overrides: Partial<TossSettings> = {}): TossSettings => ({
  ...DEFAULT_TOSS_SETTINGS,
  ...overrides,
});

describe('settingsWarnings', () => {
  it('has nothing to say about the defaults', () => {
    expect(settingsWarnings(DEFAULT_TOSS_SETTINGS)).toEqual([]);
  });

  it('warns when the next call is spoken before a toss is caught', () => {
    // 8-count phrase, 4 lead counts → next call on count 5.
    expect(settingsWarnings(settings({ phraseLength: 8 }))).toEqual([
      { code: 'call-before-catch', calls: [5, 6, 7], announceCount: 5 },
    ]);
    // A catch on the "and" of 4 is still before count 5.
    expect(settingsWarnings(settings({ phraseLength: 8, allowedTossCounts: [4, 4.5, 5] }))).toEqual(
      [{ code: 'call-before-catch', calls: [5], announceCount: 5 }],
    );
  });

  it('lists calls that are dropped because they do not fit', () => {
    expect(
      settingsWarnings(settings({ phraseLength: 4, leadCounts: 1, allowedTossCounts: [2, 3, 6] })),
    ).toEqual([{ code: 'calls-dropped', calls: [6] }]);
  });

  it('notes that no-repeat cannot apply with a single call', () => {
    expect(settingsWarnings(settings({ allowRepeats: false, allowedTossCounts: [5] }))).toEqual([
      { code: 'no-repeat-ignored' },
    ]);
    expect(settingsWarnings(settings({ allowRepeats: false, allowedTossCounts: [5, 6] }))).toEqual(
      [],
    );
  });

  it('still throws for settings that cannot work at all', () => {
    expect(() => settingsWarnings(settings({ phraseLength: 4, allowedTossCounts: [5] }))).toThrow(
      RangeError,
    );
  });
});
