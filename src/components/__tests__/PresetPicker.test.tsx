import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import {
  DEFAULT_PRACTICE_SETTINGS,
  DEFAULT_ROTATION_MAP,
  PRACTICE_PRESETS,
  PracticePreset,
  PracticeSettings,
  RotationMap,
  applyPreset,
  deleteCustomPreset,
  moveCustomPreset,
  presetNameMessage,
  renameCustomPreset,
  restoreCustomPreset,
  saveCustomPreset,
  updateCustomPreset,
} from '../../engine';
import { PresetPicker } from '../PresetPicker';

/** Odd calls only: matches no built-in preset. */
const HAND_TUNED: PracticeSettings = {
  ...DEFAULT_PRACTICE_SETTINGS,
  bpm: 132,
  toss: {
    phraseLength: 16,
    leadCounts: 4,
    allowedTossCounts: [3, 5, 7],
    allowRepeats: true,
  },
};

let clock = 1_700_000_000_000;

/** The picker wired to the real preset logic, the way SettingsPanel does it. */
function Harness({
  initial = HAND_TUNED,
  presets = [],
}: {
  initial?: PracticeSettings;
  presets?: PracticePreset[];
}) {
  const [settings, setSettings] = useState(initial);
  const [custom, setCustom] = useState<PracticePreset[]>(presets);
  return (
    <>
      <PresetPicker
        settings={settings}
        customPresets={custom}
        onApply={(p) => setSettings((s) => applyPreset(s, p))}
        onSave={(name) => {
          const result = saveCustomPreset(custom, settings, name, clock++);
          setCustom(result.presets);
          return result;
        }}
        onDelete={(id) => {
          const { presets, deleted } = deleteCustomPreset(custom, id);
          setCustom(presets);
          return deleted;
        }}
        onRestore={(deleted) => setCustom((c) => restoreCustomPreset(c, deleted))}
        onRename={(id, name) => {
          const result = renameCustomPreset(custom, id, name);
          setCustom(result.presets);
          return result;
        }}
        onUpdate={(id) => {
          const result = updateCustomPreset(custom, id, settings);
          setCustom(result.presets);
          return result;
        }}
        onMove={(id, direction) => setCustom((c) => moveCustomPreset(c, id, direction).presets)}
      />
      {/* Stand-in for the tempo stepper elsewhere in Settings. */}
      <SettingsProbe settings={settings} onTempo={(bpm) => setSettings((s) => ({ ...s, bpm }))} />
      {/* Stand-in for Settings → Calls → Say calls as / the rotation map. */}
      <NamingProbe
        settings={settings}
        onChange={(callNaming, rotationMap) =>
          setSettings((s) => ({ ...s, cue: { ...s.cue, callNaming, rotationMap } }))
        }
      />
    </>
  );
}

function SettingsProbe({
  settings,
  onTempo,
}: {
  settings: PracticeSettings;
  onTempo: (bpm: number) => void;
}) {
  return (
    <Pressable testID="tempo-up" onPress={() => onTempo(settings.bpm + 4)}>
      <Text testID="probe">{`${settings.bpm} ${settings.toss.allowedTossCounts.join(',')}`}</Text>
    </Pressable>
  );
}

const SLOW_QUADS: RotationMap = { single: 2, double: 3, triple: 3.5, quad: 4 };

function NamingProbe({
  settings,
  onChange,
}: {
  settings: PracticeSettings;
  onChange: (naming: 'counts' | 'rotations', map: RotationMap) => void;
}) {
  const { callNaming, rotationMap } = settings.cue;
  return (
    <>
      <Pressable testID="say-counts" onPress={() => onChange('counts', rotationMap)} />
      <Pressable testID="say-rotations" onPress={() => onChange('rotations', rotationMap)} />
      <Pressable testID="slow-quads" onPress={() => onChange(callNaming, SLOW_QUADS)} />
      <Pressable
        testID="default-names"
        onPress={() => onChange(callNaming, DEFAULT_ROTATION_MAP)}
      />
      <Text testID="naming">{`${callNaming} quad ${rotationMap.quad}`}</Text>
    </>
  );
}

const chip = (name: string) => screen.getByRole('radio', { name });

async function saveAs(name: string) {
  await fireEvent.press(screen.getByTestId('preset-save'));
  await fireEvent.changeText(screen.getByTestId('preset-name'), name);
  await fireEvent.press(screen.getByTestId('preset-save-confirm'));
}

describe('<PresetPicker>', () => {
  it('lists the built-in presets and highlights the one the settings match', async () => {
    await render(<Harness initial={DEFAULT_PRACTICE_SETTINGS} />);
    for (const p of PRACTICE_PRESETS) expect(chip(p.name)).toBeOnTheScreen();
    expect(chip('Quads 155')).toBeSelected();
    expect(screen.queryByTestId('preset-save')).toBeNull();
  });

  it('applies a preset on tap', async () => {
    await render(<Harness />);
    await fireEvent.press(chip('Quick 8'));
    expect(chip('Quick 8')).toBeSelected();
    expect(screen.getByTestId('probe')).toHaveTextContent('120 2,3,4,5');
  });

  it('saves hand-tuned settings under a name, then selects the new preset', async () => {
    await render(<Harness />);
    expect(screen.getByText(/Custom settings — save them/)).toBeOnTheScreen();
    await saveAs('  Odd   ones ');
    // Names are tidied, and custom chips say they're yours.
    expect(chip('Odd ones, your preset')).toBeSelected();
    expect(screen.queryByTestId('preset-name')).toBeNull();
    expect(screen.getByTestId('preset-rename')).toBeOnTheScreen();
  });

  it('refuses an empty or taken name and keeps the form open', async () => {
    await render(<Harness />);
    await saveAs('quick 8');
    expect(screen.getByText(presetNameMessage('taken'))).toBeOnTheScreen();
    expect(screen.getByTestId('preset-name')).toBeOnTheScreen();

    // Typing clears the error; an empty name gets its own message.
    await fireEvent.changeText(screen.getByTestId('preset-name'), '');
    expect(screen.queryByText(presetNameMessage('taken'))).toBeNull();
    await fireEvent.press(screen.getByTestId('preset-save-confirm'));
    expect(screen.getByText(presetNameMessage('empty'))).toBeOnTheScreen();
    expect(screen.queryByRole('radio', { name: /your preset/ })).toBeNull();
  });

  it('renames a preset of your own', async () => {
    await render(<Harness />);
    await saveAs('Odd ones');
    await fireEvent.press(screen.getByTestId('preset-rename'));
    await fireEvent.changeText(screen.getByTestId('preset-name'), 'Odds');
    await fireEvent.press(screen.getByTestId('preset-save-confirm'));
    expect(chip('Odds, your preset')).toBeSelected();
    expect(screen.queryByRole('radio', { name: 'Odd ones, your preset' })).toBeNull();
  });

  it('offers to save a new tempo to the preset it came from', async () => {
    await render(<Harness />);
    await saveAs('Odd ones');
    await fireEvent.press(screen.getByTestId('tempo-up'));
    const update = screen.getByRole('button', { name: 'Save 136 BPM to preset Odd ones' });
    await fireEvent.press(update);
    expect(screen.queryByTestId('preset-update')).toBeNull();
  });

  it('deletes a preset of your own, with Undo putting it back', async () => {
    await render(<Harness />);
    await saveAs('Odd ones');
    await fireEvent.press(screen.getByRole('button', { name: 'Delete preset Odd ones' }));
    expect(screen.queryByRole('radio', { name: 'Odd ones, your preset' })).toBeNull();
    expect(screen.getByText('Deleted “Odd ones”')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Undo delete Odd ones' }));
    expect(chip('Odd ones, your preset')).toBeSelected();
    expect(screen.queryByTestId('preset-undo')).toBeNull();
  });

  it('moves a preset of your own earlier and later', async () => {
    const mine = (name: string, calls: number[], now: number) =>
      saveCustomPreset(
        [],
        { ...HAND_TUNED, toss: { ...HAND_TUNED.toss, allowedTossCounts: calls } },
        name,
        now,
      ).saved as PracticePreset;
    const presets = [mine('Odds', [3, 5, 7], 1), mine('Evens', [2, 4, 6], 2)];
    await render(<Harness presets={presets} />);
    const order = () =>
      screen
        .getAllByRole('radio')
        .map((r) => r.props.accessibilityLabel as string)
        .filter((n) => n.endsWith('your preset'));
    expect(order()).toEqual(['Odds, your preset', 'Evens, your preset']);

    // The settings match Odds (first): it can only move later.
    expect(chip('Odds, your preset')).toBeSelected();
    expect(screen.queryByTestId('preset-move-earlier')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Move preset Odds later' }));
    expect(order()).toEqual(['Evens, your preset', 'Odds, your preset']);
    expect(screen.queryByTestId('preset-move-later')).toBeNull();
    await fireEvent.press(screen.getByTestId('preset-move-earlier'));
    expect(order()).toEqual(['Odds, your preset', 'Evens, your preset']);
  });

  describe('rotation names', () => {
    it('saves the names with the preset and brings them back when applied', async () => {
      await render(<Harness />);
      await fireEvent.press(screen.getByTestId('say-rotations'));
      await fireEvent.press(screen.getByTestId('slow-quads'));
      expect(screen.getByRole('button', { name: 'Save as preset' })).toHaveProp(
        'accessibilityHint',
        'Saves the tempo, phrase, calls and rotation names under a name',
      );
      await saveAs('Rifle quads');
      expect(screen.getByText(/said as rotations · 132 BPM to start/)).toBeOnTheScreen();

      // Elsewhere: another preset, calls said as counts with the default map.
      await fireEvent.press(chip('Quick 8'));
      await fireEvent.press(screen.getByTestId('say-counts'));
      await fireEvent.press(screen.getByTestId('default-names'));
      expect(screen.getByTestId('naming')).toHaveTextContent('counts quad 3.5');

      await fireEvent.press(chip('Rifle quads, your preset'));
      expect(screen.getByTestId('naming')).toHaveTextContent('rotations quad 4');
      expect(screen.getByTestId('probe')).toHaveTextContent('132 3,5,7');
    });

    it('offers to save changed names to the matching preset of your own', async () => {
      await render(<Harness />);
      await fireEvent.press(screen.getByTestId('say-rotations'));
      await saveAs('Rifle quads');
      expect(screen.queryByTestId('preset-update')).toBeNull();

      await fireEvent.press(screen.getByTestId('slow-quads'));
      const update = screen.getByRole('button', {
        name: 'Save the rotation names to preset Rifle quads',
      });
      expect(update).toHaveTextContent('Save rotation names to “Rifle quads”');
      await fireEvent.press(update);
      expect(screen.queryByTestId('preset-update')).toBeNull();

      // Saying calls as counts is personal: nothing to save.
      await fireEvent.press(screen.getByTestId('say-counts'));
      expect(screen.queryByTestId('preset-update')).toBeNull();
    });

    it('leaves how calls are said alone for a preset saved without names', async () => {
      await render(<Harness />);
      await saveAs('Odd ones');
      expect(screen.getByText(/called 4 early · 132 BPM to start$/)).toBeOnTheScreen();
      await fireEvent.press(chip('Quick 8'));
      await fireEvent.press(screen.getByTestId('say-rotations'));
      await fireEvent.press(chip('Odd ones, your preset'));
      expect(screen.getByTestId('naming')).toHaveTextContent('rotations quad 3.5');
    });
  });
});
