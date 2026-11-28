import {
  ROTATION_NAMES_DESCRIPTION,
  describeCustomPreset,
  describeToss,
  parseStoredCustomPresets,
  presetUpdateButton,
  presetUpdateOffer,
  savePresetHint,
  rotationMapToSave,
  rotationNamesDiffer,
  saveCustomPreset,
  serializeCustomPresets,
  updateCustomPreset,
} from '../customPresets';
import { applyPreset, PRACTICE_PRESETS, PracticePreset } from '../presets';
import { DEFAULT_ROTATION_MAP, RotationMap, sameRotationMap } from '../rotations';
import { DEFAULT_PRACTICE_SETTINGS, PracticeSettings } from '../storedSettings';

/** A drill that matches no built-in preset, with calls said as counts. */
const drill: PracticeSettings = {
  ...DEFAULT_PRACTICE_SETTINGS,
  bpm: 132,
  toss: { phraseLength: 8, leadCounts: 4, allowedTossCounts: [3, 5, 7], allowRepeats: false },
};

/** At 120 BPM a quad has more counts of air time than at 155. */
const slowQuads: RotationMap = { single: 2, double: 3, triple: 3.5, quad: 4 };

const named = (map: RotationMap = slowQuads, base: PracticeSettings = drill): PracticeSettings => ({
  ...base,
  cue: { ...base.cue, callNaming: 'rotations', rotationMap: map },
});

function save(settings: PracticeSettings, name = 'Rifle quads'): PracticePreset[] {
  const { presets, saved } = saveCustomPreset([], settings, name, 1000);
  expect(saved).not.toBeNull();
  return presets;
}

describe('sameRotationMap', () => {
  it('compares every rotation', () => {
    expect(sameRotationMap(DEFAULT_ROTATION_MAP, { ...DEFAULT_ROTATION_MAP })).toBe(true);
    expect(sameRotationMap(DEFAULT_ROTATION_MAP, slowQuads)).toBe(false);
    expect(sameRotationMap(slowQuads, { ...slowQuads, quad: 4.5 })).toBe(false);
  });
});

describe('saving a preset with rotation names', () => {
  it('keeps the map only when calls are said as rotations', () => {
    expect(rotationMapToSave(drill)).toBeUndefined();
    expect(rotationMapToSave(named())).toEqual(slowQuads);
    // A copy: changing the settings later doesn't change the preset.
    expect(rotationMapToSave(named())).not.toBe(slowQuads);

    expect(save(drill)[0].rotationMap).toBeUndefined();
    expect(save(named())[0].rotationMap).toEqual(slowQuads);
  });

  it('says so in the description', () => {
    expect(save(drill)[0].description).toBe(describeToss(drill.toss));
    expect(save(named())[0].description).toBe(
      `${describeToss(drill.toss)} · ${ROTATION_NAMES_DESCRIPTION}`,
    );
    expect(describeCustomPreset(drill.toss, slowQuads)).toMatch(/said as rotations$/);
  });

  it('still refuses a copy of a drill that only differs by its names', () => {
    const one = save(named());
    const again = saveCustomPreset(one, named(DEFAULT_ROTATION_MAP), 'Other', 2000);
    expect(again.problem).toBe('duplicate');
  });
});

describe('applying a preset with rotation names', () => {
  it('says calls by name with the preset map, keeping other sound options', () => {
    const [preset] = save(named());
    const start: PracticeSettings = {
      ...DEFAULT_PRACTICE_SETTINGS,
      cue: { ...DEFAULT_PRACTICE_SETTINGS.cue, accentDownbeat: false },
    };
    const applied = applyPreset(start, preset);
    expect(applied.bpm).toBe(132);
    expect(applied.cue.callNaming).toBe('rotations');
    expect(applied.cue.rotationMap).toEqual(slowQuads);
    expect(applied.cue.rotationMap).not.toBe(preset.rotationMap);
    expect(applied.cue.accentDownbeat).toBe(false);
  });

  it('leaves how calls are said alone for presets without names', () => {
    const [plain] = save(drill);
    const start = named(DEFAULT_ROTATION_MAP, DEFAULT_PRACTICE_SETTINGS);
    expect(applyPreset(start, plain).cue).toEqual(start.cue);
    expect(applyPreset(start, PRACTICE_PRESETS[0]).cue).toEqual(start.cue);
  });
});

describe('updating a preset with rotation names', () => {
  it('saves the current map when calls are said by name', () => {
    const one = save(named());
    const { changed } = updateCustomPreset(one, one[0].id, named(DEFAULT_ROTATION_MAP));
    expect(changed?.rotationMap).toEqual(DEFAULT_ROTATION_MAP);
  });

  it('keeps the names it had when updated while calls are said as counts', () => {
    const one = save(named());
    const { changed } = updateCustomPreset(one, one[0].id, { ...drill, bpm: 140 });
    expect(changed?.bpm).toBe(140);
    expect(changed?.rotationMap).toEqual(slowQuads);
    expect(changed?.description).toMatch(/said as rotations$/);
  });

  it('adds names to a preset saved without them', () => {
    const one = save(drill);
    const { changed } = updateCustomPreset(one, one[0].id, named());
    expect(changed?.rotationMap).toEqual(slowQuads);
  });
});

describe('offering to save rotation names', () => {
  it('differs only while calls are said by name with another map', () => {
    const [withNames] = save(named());
    const [plain] = save(drill);
    expect(rotationNamesDiffer(named(), withNames)).toBe(false);
    expect(rotationNamesDiffer(named(DEFAULT_ROTATION_MAP), withNames)).toBe(true);
    expect(rotationNamesDiffer(named(), plain)).toBe(true);
    // Counts: personal, never a change to the preset.
    expect(rotationNamesDiffer(drill, withNames)).toBe(false);
    expect(rotationNamesDiffer(drill, plain)).toBe(false);
  });

  it('offers "names" when only the map moved, "tempo" when the tempo did', () => {
    const one = save(named());
    expect(presetUpdateOffer(named(), one, null)).toBeNull();
    expect(presetUpdateOffer(named(DEFAULT_ROTATION_MAP), one, null)).toEqual({
      preset: one[0],
      kind: 'names',
    });
    expect(presetUpdateOffer({ ...named(DEFAULT_ROTATION_MAP), bpm: 150 }, one, null)).toEqual({
      preset: one[0],
      kind: 'tempo',
    });
  });

  it('never offers names for a built-in preset', () => {
    const builtIn = named(slowQuads, applyPreset(drill, PRACTICE_PRESETS[1]));
    expect(presetUpdateOffer(builtIn, [], null)).toBeNull();
  });
});

describe('storing presets with rotation names', () => {
  it('round-trips the map, and leaves it out for presets without one', () => {
    const plainDrill = { ...drill, toss: { ...drill.toss, leadCounts: 3 } };
    const { presets } = saveCustomPreset(save(named()), plainDrill, 'B', 2000);
    expect(presets).toHaveLength(2);
    const json = serializeCustomPresets(presets);
    expect(JSON.parse(json).presets[1]).not.toHaveProperty('rotationMap');
    expect(parseStoredCustomPresets(json)).toEqual(presets);
  });

  it('keeps the drill but drops a broken map', () => {
    const json = JSON.stringify({
      version: 1,
      presets: [
        {
          id: 'custom-1',
          name: 'Broken names',
          bpm: 120,
          toss: drill.toss,
          // Out of order: a double can't land before a single.
          rotationMap: { single: 3, double: 2, triple: 4, quad: 5 },
        },
      ],
    });
    const [preset] = parseStoredCustomPresets(json);
    expect(preset.name).toBe('Broken names');
    expect(preset.rotationMap).toBeUndefined();
    expect(preset.description).toBe(describeToss(drill.toss));
  });

  it('reads presets saved before names were kept', () => {
    const old = JSON.stringify({
      version: 1,
      presets: [{ id: 'custom-1', name: 'Old', bpm: 120, toss: drill.toss }],
    });
    expect(parseStoredCustomPresets(old)[0].rotationMap).toBeUndefined();
  });
});

describe('update button and save hint', () => {
  it('words each kind of update', () => {
    const [preset] = save(named());
    expect(presetUpdateButton({ preset, kind: 'tempo' }, 150)).toEqual({
      text: 'Save 150 BPM to “Rifle quads”',
      label: 'Save 150 BPM to preset Rifle quads',
    });
    expect(presetUpdateButton({ preset, kind: 'names' }, 150)).toEqual({
      text: 'Save rotation names to “Rifle quads”',
      label: 'Save the rotation names to preset Rifle quads',
    });
    expect(presetUpdateButton({ preset, kind: 'settings' }, 150)).toEqual({
      text: 'Update “Rifle quads”',
      label: 'Update preset Rifle quads with these settings',
    });
  });

  it('mentions rotation names in the save hint only when they will be kept', () => {
    expect(savePresetHint(drill)).toBe('Saves the tempo, phrase and calls under a name');
    expect(savePresetHint(named())).toBe(
      'Saves the tempo, phrase, calls and rotation names under a name',
    );
  });
});
