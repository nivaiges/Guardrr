import {
  CUSTOM_PRESETS_STORAGE_KEY,
  MAX_CUSTOM_PRESETS,
  MAX_PRESET_NAME_LENGTH,
  allPresets,
  canSavePreset,
  deleteCustomPreset,
  describeToss,
  isCustomPreset,
  matchingAnyPreset,
  normalizePresetName,
  parseStoredCustomPresets,
  presetNameMessage,
  presetNameProblem,
  presetUpdateOffer,
  renameCustomPreset,
  renameProblem,
  updateCustomPreset,
  restoreCustomPreset,
  saveCustomPreset,
  serializeCustomPresets,
  suggestPresetName,
} from '../customPresets';
import { applyPreset, PRACTICE_PRESETS, PracticePreset } from '../presets';
import {
  DEFAULT_PRACTICE_SETTINGS,
  PracticeSettings,
  SETTINGS_STORAGE_KEY,
} from '../storedSettings';
import { HISTORY_STORAGE_KEY } from '../history';

/** Settings that match no built-in preset: 3, 5, 7 in an 8-count phrase at 132 BPM. */
const drill: PracticeSettings = {
  ...DEFAULT_PRACTICE_SETTINGS,
  bpm: 132,
  toss: { phraseLength: 8, leadCounts: 4, allowedTossCounts: [7, 3, 5], allowRepeats: false },
};

function withOne(name = 'Odd drill', now = 1000): PracticePreset[] {
  const { presets, saved } = saveCustomPreset([], drill, name, now);
  expect(saved).not.toBeNull();
  return presets;
}

describe('describeToss', () => {
  it('describes calls, phrase and lead like the built-ins do', () => {
    expect(describeToss(PRACTICE_PRESETS[1].toss)).toBe('Calls 1–7 · 16 counts · called 4 early');
    expect(describeToss(drill.toss)).toBe('Calls 3, 5, 7 · 8 counts · called 4 early · no repeats');
    expect(
      describeToss({
        ...drill.toss,
        phraseLength: 16,
        allowedTossCounts: [1, 3, 5, 7, 9, 11, 13, 15],
      }),
    ).toBe('Odd calls 1–15 · 16 counts · called 4 early · no repeats');
    expect(describeToss({ ...drill.toss, allowedTossCounts: [2, 4, 6, 8] })).toBe(
      'Even calls 2–8 · 8 counts · called 4 early · no repeats',
    );
    expect(
      describeToss({
        ...drill.toss,
        allowedTossCounts: [1, 3, 3.5, 5, 5.5, 7, 7.5],
      }),
    ).toBe('Odd calls 1–7 with ands · 8 counts · called 4 early · no repeats');
    expect(describeToss({ ...drill.toss, allowedTossCounts: [2, 2.5, 4, 4.5, 6, 6.5, 8] })).toBe(
      'Even calls 2–8 with ands · 8 counts · called 4 early · no repeats',
    );
    expect(describeToss({ ...drill.toss, allowedTossCounts: [5] })).toBe(
      'Only 5 · 8 counts · called 4 early · no repeats',
    );
  });
});

describe('preset names', () => {
  it('trims, collapses spaces and caps the length', () => {
    expect(normalizePresetName('  Big   tosses  ')).toBe('Big tosses');
    expect(normalizePresetName('x'.repeat(40))).toHaveLength(MAX_PRESET_NAME_LENGTH);
    expect(normalizePresetName('a'.repeat(MAX_PRESET_NAME_LENGTH - 1) + '   b')).toBe(
      'a'.repeat(MAX_PRESET_NAME_LENGTH - 1),
    );
  });

  it('rejects empty names and names already used (case-insensitive, built-ins too)', () => {
    expect(presetNameProblem('   ', [])).toBe('empty');
    expect(presetNameProblem('quick 8', [])).toBe('taken');
    expect(presetNameProblem('ODD DRILL', withOne())).toBe('taken');
    expect(presetNameProblem('Odd drill 2', withOne())).toBeNull();
    expect(presetNameMessage('empty')).toMatch(/name/);
    expect(presetNameMessage('taken')).toMatch(/already/);
  });

  it('suggests the next free "My preset N"', () => {
    expect(suggestPresetName([])).toBe('My preset 1');
    const one = withOne('My preset 1');
    expect(suggestPresetName(one)).toBe('My preset 2');
  });
});

describe('saving a custom preset', () => {
  it('keeps tempo and toss settings, sorts calls and describes itself', () => {
    const { presets, saved, problem } = saveCustomPreset([], drill, '  Odd   drill ', 1234.7);
    expect(problem).toBeNull();
    expect(presets).toEqual([saved]);
    expect(saved).toEqual({
      id: 'custom-1234',
      name: 'Odd drill',
      description: 'Calls 3, 5, 7 · 8 counts · called 4 early · no repeats',
      bpm: 132,
      toss: { phraseLength: 8, leadCounts: 4, allowedTossCounts: [3, 5, 7], allowRepeats: false },
    });
    expect(isCustomPreset(saved!)).toBe(true);
    expect(PRACTICE_PRESETS.some(isCustomPreset)).toBe(false);
  });

  it('makes the new preset the matching one, and applying it restores the settings', () => {
    const presets = withOne();
    const saved = presets[0];
    expect(matchingAnyPreset(drill, presets)).toBe(saved);
    const elsewhere = { ...DEFAULT_PRACTICE_SETTINGS, cue: { ...drill.cue, andClicks: true } };
    const applied = applyPreset(elsewhere, saved);
    expect(applied.bpm).toBe(132);
    expect(applied.toss).toEqual(saved.toss);
    // Sound options stay personal.
    expect(applied.cue.andClicks).toBe(true);
    expect(matchingAnyPreset(applied, presets)).toBe(saved);
  });

  it('refuses copies of an existing preset (built-in or custom), ignoring tempo', () => {
    const standard = applyPreset(DEFAULT_PRACTICE_SETTINGS, PRACTICE_PRESETS[0]);
    expect(canSavePreset(standard, [])).toBe(false);
    expect(saveCustomPreset([], { ...standard, bpm: 90 }, 'Mine', 1).problem).toBe('duplicate');
    const presets = withOne();
    expect(canSavePreset({ ...drill, bpm: 100 }, presets)).toBe(false);
    expect(saveCustomPreset(presets, drill, 'Again', 2).problem).toBe('duplicate');
  });

  it('refuses bad names and leaves the list unchanged', () => {
    const presets = withOne();
    const other = { ...drill, toss: { ...drill.toss, allowedTossCounts: [3, 5] } };
    expect(saveCustomPreset(presets, other, '', 2)).toEqual({
      presets,
      saved: null,
      problem: 'empty',
    });
    expect(saveCustomPreset(presets, other, 'Quick 8', 2).problem).toBe('taken');
  });

  it('stops at MAX_CUSTOM_PRESETS', () => {
    let presets: PracticePreset[] = [];
    for (let i = 0; i < MAX_CUSTOM_PRESETS; i++) {
      const toss = {
        ...drill.toss,
        leadCounts: 1 + (i % 8),
        allowedTossCounts: [1 + Math.floor(i / 8), 8],
      };
      const settings = { ...drill, toss };
      const r = saveCustomPreset(presets, settings, `P${i}`, i);
      expect(r.problem).toBeNull();
      presets = r.presets;
    }
    expect(presets).toHaveLength(MAX_CUSTOM_PRESETS);
    expect(canSavePreset(drill, presets)).toBe(false);
    expect(saveCustomPreset(presets, drill, 'One more', 99).problem).toBe('full');
  });

  it('gives each preset its own id even when saved in the same millisecond', () => {
    const one = withOne('A', 5);
    const { saved } = saveCustomPreset(
      one,
      { ...drill, toss: { ...drill.toss, allowedTossCounts: [4] } },
      'B',
      5,
    );
    expect(saved?.id).toBe('custom-6');
  });

  it('lists built-in presets first, then custom ones in saving order', () => {
    const one = withOne('A', 5);
    const two = saveCustomPreset(
      one,
      { ...drill, toss: { ...drill.toss, allowedTossCounts: [4] } },
      'B',
      3,
    ).presets;
    expect(allPresets(two).map((p) => p.name)).toEqual([
      ...PRACTICE_PRESETS.map((p) => p.name),
      'A',
      'B',
    ]);
  });
});

describe('deleting and restoring', () => {
  const three = (() => {
    let p: PracticePreset[] = [];
    [[3], [5], [7]].forEach((calls, i) => {
      p = saveCustomPreset(
        p,
        { ...drill, toss: { ...drill.toss, allowedTossCounts: calls } },
        `N${i}`,
        i,
      ).presets;
    });
    return p;
  })();

  it('removes a preset and remembers where it was', () => {
    const { presets, deleted } = deleteCustomPreset(three, three[1].id);
    expect(presets.map((p) => p.name)).toEqual(['N0', 'N2']);
    expect(deleted).toEqual({ preset: three[1], index: 1 });
    expect(restoreCustomPreset(presets, deleted!)).toEqual(three);
  });

  it('ignores unknown ids', () => {
    expect(deleteCustomPreset(three, 'standard-16')).toEqual({ presets: three, deleted: null });
  });

  it("doesn't restore over a preset saved since with the same name", () => {
    const { presets, deleted } = deleteCustomPreset(three, three[0].id);
    const reused = saveCustomPreset(
      presets,
      { ...drill, toss: { ...drill.toss, allowedTossCounts: [2] } },
      'n0',
      50,
    ).presets;
    expect(restoreCustomPreset(reused, deleted!)).toEqual(reused);
  });
});

describe('storing custom presets', () => {
  it('uses its own storage key', () => {
    expect(
      new Set([CUSTOM_PRESETS_STORAGE_KEY, SETTINGS_STORAGE_KEY, HISTORY_STORAGE_KEY]).size,
    ).toBe(3);
  });

  it('round-trips', () => {
    const presets = withOne();
    expect(parseStoredCustomPresets(serializeCustomPresets(presets))).toEqual(presets);
    expect(parseStoredCustomPresets(serializeCustomPresets([]))).toEqual([]);
  });

  it('never throws on junk', () => {
    for (const junk of [null, undefined, '', '{', '[]', '42', '{"presets":3}', '{"presets":[1]}']) {
      expect(parseStoredCustomPresets(junk)).toEqual([]);
    }
  });

  it('skips presets it cannot use and keeps the rest', () => {
    const good = withOne()[0];
    const raw = (p: Record<string, unknown>) => ({ ...good, ...p });
    const json = JSON.stringify({
      version: 1,
      presets: [
        raw({ id: 'standard-16' }), // not a custom id
        raw({ name: '   ' }),
        raw({ bpm: 'fast' }),
        raw({ toss: { ...good.toss, phraseLength: 3 } }),
        raw({ toss: { ...good.toss, leadCounts: 0 } }),
        raw({ toss: { ...good.toss, allowedTossCounts: ['x'] } }),
        raw({ toss: { ...good.toss, allowedTossCounts: [3, 12] } }), // 12 doesn't fit in 8
        raw({ toss: { ...good.toss, allowRepeats: 'no' } }),
        raw({ id: 'custom-9', toss: { ...PRACTICE_PRESETS[1].toss } }), // copy of Quick 8
        good,
        raw({ id: 'custom-2' }), // same settings and name as `good`
        raw({ id: 'custom-3', name: 'Other', bpm: 999, toss: { ...good.toss, leadCounts: 2 } }),
      ],
    });
    const parsed = parseStoredCustomPresets(json);
    expect(parsed.map((p) => p.id)).toEqual([good.id, 'custom-3']);
    expect(parsed[1].bpm).toBeLessThan(999); // clamped to the tempo range
    expect(parsed[1].description).toBe('Calls 3, 5, 7 · 8 counts · called 2 early · no repeats');
  });

  it('keeps at most MAX_CUSTOM_PRESETS', () => {
    const good = withOne()[0];
    const many = Array.from({ length: MAX_CUSTOM_PRESETS + 3 }, (_, i) => ({
      ...good,
      id: `custom-${i}`,
      name: `P${i}`,
      toss: { ...good.toss, leadCounts: 1 + (i % 8), allowedTossCounts: [1 + Math.floor(i / 8)] },
    }));
    const parsed = parseStoredCustomPresets(JSON.stringify({ version: 1, presets: many }));
    expect(parsed).toHaveLength(MAX_CUSTOM_PRESETS);
  });
});

describe('renameCustomPreset', () => {
  it('renames in place, keeping id, settings and order', () => {
    const two = saveCustomPreset(
      withOne(),
      { ...drill, toss: { ...drill.toss, leadCounts: 2 } },
      'B',
      2000,
    ).presets;
    const { presets, changed, problem } = renameCustomPreset(two, two[0].id, '  Odd   drill 2 ');
    expect(problem).toBeNull();
    expect(changed).toEqual({ ...two[0], name: 'Odd drill 2' });
    expect(presets.map((p) => p.name)).toEqual(['Odd drill 2', 'B']);
    expect(presets[1]).toBe(two[1]);
  });

  it('allows changing only the letter case of its own name', () => {
    const one = withOne();
    expect(renameProblem(one, one[0].id, 'ODD DRILL')).toBeNull();
    expect(renameCustomPreset(one, one[0].id, 'ODD DRILL').changed?.name).toBe('ODD DRILL');
  });

  it('refuses empty names, names of other presets and unknown ids', () => {
    const two = saveCustomPreset(
      withOne(),
      { ...drill, toss: { ...drill.toss, leadCounts: 2 } },
      'B',
      2000,
    ).presets;
    expect(renameCustomPreset(two, two[0].id, '   ').problem).toBe('empty');
    expect(renameCustomPreset(two, two[0].id, 'b').problem).toBe('taken');
    expect(renameCustomPreset(two, two[0].id, PRACTICE_PRESETS[0].name).problem).toBe('taken');
    const missing = renameCustomPreset(two, 'custom-nope', 'X');
    expect(missing.problem).toBe('missing');
    expect(missing.presets).toEqual(two);
  });
});

describe('updateCustomPreset', () => {
  it('overwrites tempo, toss and description, keeping name, id and place', () => {
    const one = withOne();
    const tweaked: PracticeSettings = {
      ...drill,
      bpm: 140,
      toss: { ...drill.toss, allowedTossCounts: [5, 3], allowRepeats: true },
    };
    const { presets, changed, problem } = updateCustomPreset(one, one[0].id, tweaked);
    expect(problem).toBeNull();
    expect(changed).toEqual({
      id: one[0].id,
      name: 'Odd drill',
      bpm: 140,
      toss: { ...tweaked.toss, allowedTossCounts: [3, 5] },
      description: 'Calls 3, 5 · 8 counts · called 4 early',
    });
    expect(presets).toEqual([changed]);
    expect(matchingAnyPreset(tweaked, presets)?.id).toBe(one[0].id);
  });

  it('refuses settings that already match another preset', () => {
    const one = withOne();
    const builtIn = applyPreset(drill, PRACTICE_PRESETS[1]);
    expect(updateCustomPreset(one, one[0].id, builtIn).problem).toBe('duplicate');
    expect(updateCustomPreset(one, 'custom-nope', drill).problem).toBe('missing');
  });

  it('round-trips through storage', () => {
    const one = withOne();
    const { presets } = updateCustomPreset(one, one[0].id, { ...drill, bpm: 99 });
    expect(parseStoredCustomPresets(serializeCustomPresets(presets))).toEqual(presets);
  });
});

describe('presetUpdateOffer', () => {
  it('offers the tempo when a custom preset matches but the tempo moved', () => {
    const one = withOne();
    expect(presetUpdateOffer(drill, one, null)).toBeNull();
    expect(presetUpdateOffer({ ...drill, bpm: 150 }, one, null)).toEqual({
      preset: one[0],
      kind: 'tempo',
    });
  });

  it('never offers to change a built-in preset', () => {
    const builtIn = applyPreset(drill, PRACTICE_PRESETS[1]);
    expect(presetUpdateOffer({ ...builtIn, bpm: builtIn.bpm + 10 }, withOne(), null)).toBeNull();
  });

  it('offers the last applied custom preset once its settings were changed', () => {
    const one = withOne();
    const changed = { ...drill, toss: { ...drill.toss, leadCounts: 3 } };
    expect(presetUpdateOffer(changed, one, null)).toBeNull();
    expect(presetUpdateOffer(changed, one, one[0].id)).toEqual({
      preset: one[0],
      kind: 'settings',
    });
    // Deleted since: nothing to update.
    expect(presetUpdateOffer(changed, [], one[0].id)).toBeNull();
  });
});
