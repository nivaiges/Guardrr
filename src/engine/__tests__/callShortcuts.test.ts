import { DEFAULT_TOSS_SETTINGS, TossSettings, validateTossSettings } from '../announce';
import {
  PHRASE_LENGTH_OPTIONS,
  callSetSummary,
  callShortcutOf,
  callsForShortcut,
  withAndCalls,
  withCallShortcut,
  withPhraseLength,
} from '../editSettings';

const settings = (overrides: Partial<TossSettings> = {}): TossSettings => ({
  ...DEFAULT_TOSS_SETTINGS,
  ...overrides,
});

describe('call shortcuts', () => {
  it('picks every call, the odd counts or the even counts of a phrase', () => {
    expect(callsForShortcut('all', 8, false)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(callsForShortcut('odd', 8, false)).toEqual([1, 3, 5, 7]);
    expect(callsForShortcut('even', 8, false)).toEqual([2, 4, 6, 8]);
  });

  it('keeps the "and" after each picked count, but never "1 and"', () => {
    expect(callsForShortcut('odd', 8, true)).toEqual([1, 3, 3.5, 5, 5.5, 7, 7.5]);
    expect(callsForShortcut('even', 8, true)).toEqual([2, 2.5, 4, 4.5, 6, 6.5, 8]);
    expect(callsForShortcut('all', 4, true)).toEqual([1, 2, 2.5, 3, 3.5, 4]);
  });

  it('builds valid settings for every phrase length and shortcut', () => {
    for (const phraseLength of PHRASE_LENGTH_OPTIONS) {
      for (const andCounts of [false, true]) {
        const base = withAndCalls(withPhraseLength(settings(), phraseLength), andCounts);
        for (const shortcut of ['all', 'odd', 'even'] as const) {
          const next = withCallShortcut(base, shortcut);
          expect(validateTossSettings(next)).toEqual(next.allowedTossCounts);
          expect(callShortcutOf(next)).toBe(shortcut);
        }
      }
    }
  });

  it('keeps the other settings', () => {
    const base = settings({ phraseLength: 8, leadCounts: 3, allowRepeats: false });
    const next = withCallShortcut(base, 'even');
    expect(next).toEqual({ ...base, allowedTossCounts: [2, 4, 6, 8] });
  });

  it('recognizes the shortcut behind a set, in any order', () => {
    expect(callShortcutOf(settings({ phraseLength: 8, allowedTossCounts: [7, 3, 1, 5] }))).toBe(
      'odd',
    );
    expect(callShortcutOf(DEFAULT_TOSS_SETTINGS)).toBeNull();
    expect(callShortcutOf(settings({ phraseLength: 8, allowedTossCounts: [3, 5, 7] }))).toBeNull();
  });

  it('summarizes the picked sets', () => {
    const base = settings({ phraseLength: 8 });
    expect(callSetSummary(withCallShortcut(base, 'all'))).toBe('1–8');
    expect(callSetSummary(withCallShortcut(base, 'odd'))).toBe('1, 3, 5, 7');
  });

  it('turns "and" calls on and off after a shortcut', () => {
    const odd = withCallShortcut(settings({ phraseLength: 8 }), 'odd');
    const withAnds = withAndCalls(odd, true);
    expect(callShortcutOf(withAnds)).toBe('odd');
    expect(callShortcutOf(withAndCalls(withAnds, false))).toBe('odd');
  });
});
