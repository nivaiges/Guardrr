import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { DEFAULT_TOSS_SETTINGS, TossSettings, callSetSummary } from '../../engine';
import { CallPicker } from '../CallPicker';

/** The picker with real state, as SettingsPanel uses it; reports every change. */
function Harness({
  initial,
  disabled,
  onChange,
}: {
  initial: TossSettings;
  disabled?: boolean;
  onChange?: (s: TossSettings) => void;
}) {
  const [settings, setSettings] = useState(initial);
  return (
    <CallPicker
      settings={settings}
      disabled={disabled}
      onChange={(next) => {
        setSettings(next);
        onChange?.(next);
      }}
    />
  );
}

const ONE_TO_SEVEN: TossSettings = {
  ...DEFAULT_TOSS_SETTINGS,
  phraseLength: 16,
  allowedTossCounts: [1, 2, 3, 4, 5, 6, 7],
};

const checked = (testID: string) =>
  screen.getByTestId(testID).props.accessibilityState?.checked as boolean;

describe('<CallPicker>', () => {
  it('shows a chip per call the phrase allows, checked when picked', async () => {
    await render(<Harness initial={ONE_TO_SEVEN} />);
    expect(screen.getByText(`Calls: ${callSetSummary(ONE_TO_SEVEN)}`)).toBeOnTheScreen();
    for (let call = 1; call <= 7; call++) expect(checked(`call-chip-${call}`)).toBe(true);
    // Calls up to the phrase length can be added (a 16-count phrase allows 8+).
    expect(checked('call-chip-8')).toBe(false);
  });

  it('adds and removes a call on tap, and the summary follows', async () => {
    const changes: TossSettings[] = [];
    await render(<Harness initial={ONE_TO_SEVEN} onChange={(s) => changes.push(s)} />);
    await fireEvent.press(screen.getByTestId('call-chip-4'));
    expect(checked('call-chip-4')).toBe(false);
    expect(changes.at(-1)?.allowedTossCounts).not.toContain(4);
    expect(
      screen.getByText(`Calls: ${callSetSummary(changes.at(-1) as TossSettings)}`),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('call-chip-4'));
    expect(checked('call-chip-4')).toBe(true);
    expect(changes.at(-1)?.allowedTossCounts).toContain(4);
  });

  it('applies the All, Odd and Even shortcuts and marks the one in use', async () => {
    await render(<Harness initial={ONE_TO_SEVEN} />);
    // 1–7 of a 16-count phrase is a hand-picked range, not a shortcut.
    for (const s of ['all', 'odd', 'even'])
      expect(screen.getByTestId(`call-shortcut-${s}`).props.accessibilityState?.selected).toBe(
        false,
      );

    await fireEvent.press(screen.getByTestId('call-shortcut-all'));
    expect(checked('call-chip-8')).toBe(true);
    expect(screen.getByTestId('call-shortcut-all').props.accessibilityState?.selected).toBe(true);

    await fireEvent.press(screen.getByTestId('call-shortcut-odd'));
    expect(checked('call-chip-3')).toBe(true);
    expect(checked('call-chip-4')).toBe(false);
    expect(screen.getByTestId('call-shortcut-odd').props.accessibilityState?.selected).toBe(true);
    expect(screen.getByTestId('call-shortcut-all').props.accessibilityState?.selected).toBe(false);

    await fireEvent.press(screen.getByTestId('call-shortcut-even'));
    expect(checked('call-chip-4')).toBe(true);
    expect(checked('call-chip-3')).toBe(false);
  });

  it('never removes the last call, and says so to screen readers', async () => {
    const onlyFive = { ...ONE_TO_SEVEN, allowedTossCounts: [5] };
    await render(<Harness initial={onlyFive} />);
    expect(screen.getByTestId('call-chip-5').props.accessibilityHint).toMatch(/last call/);
    await fireEvent.press(screen.getByTestId('call-chip-5'));
    expect(checked('call-chip-5')).toBe(true);
  });

  it('labels chips for screen readers ("Call 3 and", not "3&")', async () => {
    const withAnds = { ...ONE_TO_SEVEN, allowedTossCounts: [3, 3.5, 4] };
    await render(<Harness initial={withAnds} />);
    expect(screen.getByLabelText('Call 3 and')).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: 'Call 3 and' })).toBeChecked();
  });

  it('ignores taps while disabled', async () => {
    const onChange = jest.fn();
    await render(<Harness initial={ONE_TO_SEVEN} disabled onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('call-chip-2'));
    await fireEvent.press(screen.getByTestId('call-shortcut-odd'));
    expect(onChange).not.toHaveBeenCalled();
    expect(checked('call-chip-2')).toBe(true);
  });
});
