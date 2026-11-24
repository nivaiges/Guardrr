import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import {
  DEFAULT_PRACTICE_SETTINGS,
  PRACTICE_PRESETS,
  PracticePreset,
  PracticeSettings,
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
        onApply={(p) => setSettings((s) => ({ ...s, bpm: p.bpm, toss: p.toss }))}
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
});
