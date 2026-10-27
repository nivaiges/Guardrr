import { CallSequence, validateTossSettings } from '../announce';
import { tossCountsForRange, tossRangeOf, withTossRange } from '../editSettings';
import {
  PRACTICE_PRESETS,
  applyPreset,
  matchingPreset,
  presetById,
  tossMatchesPreset,
} from '../presets';
import { createRng } from '../random';
import {
  DEFAULT_PRACTICE_SETTINGS,
  parseStoredSettings,
  serializeSettings,
} from '../storedSettings';
import { settingsWarnings } from '../warnings';
import { MAX_BPM, MIN_BPM } from '../timing';

describe('practice presets', () => {
  it('has unique ids and names', () => {
    const ids = PRACTICE_PRESETS.map((p) => p.id);
    const names = PRACTICE_PRESETS.map((p) => p.name);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(PRACTICE_PRESETS.map((p) => [p.name, p] as const))(
    '%s is valid, fits its phrase and survives a save/load',
    (_name, preset) => {
      expect(preset.bpm).toBeGreaterThanOrEqual(MIN_BPM);
      expect(preset.bpm).toBeLessThanOrEqual(MAX_BPM);
      // Every call fits: nothing is dropped by validation.
      expect(validateTossSettings(preset.toss)).toEqual([...preset.toss.allowedTossCounts]);
      const applied = applyPreset(DEFAULT_PRACTICE_SETTINGS, preset);
      expect(parseStoredSettings(serializeSettings(applied))).toEqual(applied);
      // Can actually start and produce calls.
      const calls = new CallSequence(preset.toss, createRng(7));
      for (let p = 1; p <= 20; p++) {
        expect(preset.toss.allowedTossCounts).toContain(calls.callFor(p));
      }
    },
  );

  it.each(PRACTICE_PRESETS.map((p) => [p.name, p] as const))(
    '%s can be reproduced by the range editor (so the UI shows it faithfully)',
    (_name, preset) => {
      const range = tossRangeOf(preset.toss);
      expect(tossCountsForRange(range, preset.toss.phraseLength)).toEqual([
        ...preset.toss.allowedTossCounts,
      ]);
      expect(tossMatchesPreset(withTossRange(preset.toss, range), preset)).toBe(true);
    },
  );

  it('presets give no warnings that make them unusable', () => {
    for (const preset of PRACTICE_PRESETS) {
      const codes = settingsWarnings(preset.toss).map((w) => w.code);
      expect(codes).not.toContain('calls-dropped');
      expect(codes).not.toContain('no-repeat-ignored');
    }
  });

  it('the default settings match "Standard 16"', () => {
    expect(matchingPreset(DEFAULT_PRACTICE_SETTINGS)?.id).toBe('standard-16');
  });

  it('applying a preset sets tempo and toss settings but keeps sound options', () => {
    const settings = {
      ...DEFAULT_PRACTICE_SETTINGS,
      bpm: 150,
      cue: { accentDownbeat: false, andClicks: true },
    };
    const quick = presetById('quick-8')!;
    const applied = applyPreset(settings, quick);
    expect(applied.bpm).toBe(quick.bpm);
    expect(applied.toss).toEqual(quick.toss);
    expect(applied.cue).toEqual(settings.cue);
    expect(matchingPreset(applied)?.id).toBe('quick-8');
  });

  it('does not share the preset call array with the applied settings', () => {
    const preset = presetById('standard-16')!;
    const applied = applyPreset(DEFAULT_PRACTICE_SETTINGS, preset);
    expect(applied.toss.allowedTossCounts).not.toBe(preset.toss.allowedTossCounts);
  });

  it('ignores tempo and call order when matching, but not other edits', () => {
    const applied = applyPreset(DEFAULT_PRACTICE_SETTINGS, presetById('quick-8')!);
    expect(matchingPreset({ ...applied, bpm: 97 })?.id).toBe('quick-8');
    expect(
      matchingPreset({ ...applied, toss: { ...applied.toss, allowedTossCounts: [5, 4, 3, 2] } })
        ?.id,
    ).toBe('quick-8');
    expect(matchingPreset({ ...applied, toss: { ...applied.toss, leadCounts: 3 } })).toBeNull();
    expect(
      matchingPreset({ ...applied, toss: { ...applied.toss, allowRepeats: false } }),
    ).toBeNull();
    expect(
      matchingPreset({ ...applied, toss: { ...applied.toss, allowedTossCounts: [2, 3, 4] } }),
    ).toBeNull();
  });

  it('looks presets up by id', () => {
    expect(presetById('slow-32')?.toss.phraseLength).toBe(32);
    expect(presetById('nope')).toBeUndefined();
  });
});
