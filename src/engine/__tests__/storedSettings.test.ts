import { DEFAULT_TOSS_SETTINGS } from '../announce';
import { withPhraseLength, withTossRange } from '../editSettings';
import {
  DEFAULT_PRACTICE_SETTINGS,
  PracticeSettings,
  parseStoredSettings,
  serializeSettings,
} from '../storedSettings';

const custom: PracticeSettings = {
  bpm: 144,
  toss: withTossRange(withPhraseLength(DEFAULT_TOSS_SETTINGS, 8), {
    min: 2,
    max: 6,
    andCounts: true,
  }),
  cue: { accentDownbeat: false, andClicks: true, haptics: false },
  countIn: 4,
  voiceRate: 0.8,
};

describe('stored settings', () => {
  it('round-trips', () => {
    expect(parseStoredSettings(serializeSettings(custom))).toEqual(custom);
    expect(parseStoredSettings(serializeSettings(DEFAULT_PRACTICE_SETTINGS))).toEqual(
      DEFAULT_PRACTICE_SETTINGS,
    );
  });

  it('stores a version number', () => {
    expect(JSON.parse(serializeSettings(custom)).version).toBe(1);
  });

  it.each([null, undefined, '', 'not json', '[]', '42', 'null', '{'])(
    'falls back to defaults for %p',
    (json) => {
      expect(parseStoredSettings(json)).toEqual(DEFAULT_PRACTICE_SETTINGS);
    },
  );

  it('keeps a stored count-in and repairs a bad one', () => {
    const parse = (countIn: unknown) => parseStoredSettings(JSON.stringify({ countIn })).countIn;
    expect(parse(0)).toBe(0);
    expect(parse(12)).toBe(12);
    expect(parse(-4)).toBe(8);
    expect(parse(2.5)).toBe(8);
    expect(parse('8')).toBe(8);
    expect(parse(999)).toBe(8);
  });

  it('defaults settings saved before the count-in existed to an 8-count count-in', () => {
    expect(parseStoredSettings(JSON.stringify({ bpm: 100 })).countIn).toBe(8);
  });

  it('fills in missing fields with defaults', () => {
    expect(parseStoredSettings(JSON.stringify({ bpm: 90 }))).toEqual({
      ...DEFAULT_PRACTICE_SETTINGS,
      bpm: 90,
    });
    expect(parseStoredSettings(JSON.stringify({ cue: { andClicks: true } })).cue).toEqual({
      accentDownbeat: true,
      andClicks: true,
      haptics: true,
    });
  });

  it('keeps a saved haptics choice and repairs a bad one', () => {
    expect(parseStoredSettings(JSON.stringify({ cue: { haptics: false } })).cue.haptics).toBe(
      false,
    );
    expect(parseStoredSettings(JSON.stringify({ cue: { haptics: 'yes' } })).cue.haptics).toBe(true);
  });

  it('clamps or replaces a bad BPM', () => {
    expect(parseStoredSettings(JSON.stringify({ bpm: 9999 })).bpm).toBe(400);
    expect(parseStoredSettings(JSON.stringify({ bpm: 99.6 })).bpm).toBe(100);
    expect(parseStoredSettings(JSON.stringify({ bpm: 'fast' })).bpm).toBe(120);
  });

  it('repairs invalid toss fields one at a time', () => {
    const toss = parseStoredSettings(
      JSON.stringify({
        toss: { phraseLength: 8, leadCounts: 99, allowedTossCounts: [3, 'x', 0, 2.25, 5] },
      }),
    ).toss;
    expect(toss).toEqual({
      phraseLength: 8,
      leadCounts: 4,
      allowedTossCounts: [3, 5],
      allowRepeats: true,
    });
  });

  it('drops calls that no longer fit and resets when none do', () => {
    const fits = parseStoredSettings(
      JSON.stringify({ toss: { phraseLength: 4, leadCounts: 2, allowedTossCounts: [3, 7] } }),
    );
    expect(fits.toss.allowedTossCounts).toEqual([3]);
    const none = parseStoredSettings(
      JSON.stringify({ toss: { phraseLength: 4, leadCounts: 2, allowedTossCounts: [7, 9] } }),
    );
    expect(none.toss).toEqual(DEFAULT_TOSS_SETTINGS);
  });

  it('pulls default lead counts into a short phrase', () => {
    const toss = parseStoredSettings(JSON.stringify({ toss: { phraseLength: 2 } })).toss;
    expect(toss.leadCounts).toBe(2);
  });
});
