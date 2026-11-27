import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import * as ReactNative from 'react-native';

import { AppearancePreference, DisplaySize } from '../../engine';
import { AppearanceSettings } from '../AppearanceSettings';

function Harness({
  initial = 'system',
  initialSize = 'normal',
  onTheme,
  onSize,
}: {
  initial?: AppearancePreference;
  initialSize?: DisplaySize;
  onTheme?: (v: AppearancePreference) => void;
  onSize?: (v: DisplaySize) => void;
}) {
  const [theme, setTheme] = useState(initial);
  const [size, setSize] = useState(initialSize);
  return (
    <AppearanceSettings
      value={theme}
      onChange={(v) => {
        setTheme(v);
        onTheme?.(v);
      }}
      displaySize={size}
      onDisplaySizeChange={(v) => {
        setSize(v);
        onSize?.(v);
      }}
    />
  );
}

const scheme = (value: 'light' | 'dark' | null) =>
  jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue(value);

afterEach(() => jest.restoreAllMocks());

describe('<AppearanceSettings>', () => {
  it('follows the phone by default and says what the phone is using', async () => {
    scheme('dark');
    await render(<Harness />);
    expect(screen.getByRole('header', { name: 'Appearance' })).toBeOnTheScreen();
    expect(screen.getByTestId('appearance-note')).toHaveTextContent(
      'Following the phone: dark right now.',
    );
  });

  it('treats an unknown phone scheme as light', async () => {
    scheme(null);
    await render(<Harness />);
    expect(screen.getByTestId('appearance-note')).toHaveTextContent(
      'Following the phone: light right now.',
    );
  });

  it('forces light or dark from the theme chips', async () => {
    scheme('dark');
    const onTheme = jest.fn();
    await render(<Harness onTheme={onTheme} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Always light' }));
    expect(onTheme).toHaveBeenLastCalledWith('light');
    expect(screen.getByTestId('appearance-note')).toHaveTextContent(
      'Sounds, haptics and the camera are unaffected.',
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'Always dark' }));
    expect(onTheme).toHaveBeenLastCalledWith('dark');
    await fireEvent.press(screen.getByRole('radio', { name: "Match the phone's appearance" }));
    expect(onTheme).toHaveBeenLastCalledWith('system');
    expect(screen.getByTestId('appearance-note')).toHaveTextContent(
      'Following the phone: dark right now.',
    );
  });

  it('marks the chosen chips as selected', async () => {
    scheme('light');
    await render(<Harness initial="dark" initialSize="big" />);
    expect(screen.getByRole('radio', { name: 'Always dark' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Always light' })).not.toBeSelected();
    expect(
      screen.getByRole('radio', { name: 'Big practice display, for across the floor' }),
    ).toBeSelected();
  });

  it('switches the practice display between Normal and Big, with a note for each', async () => {
    scheme('light');
    const onSize = jest.fn();
    await render(<Harness onSize={onSize} />);
    expect(screen.getByTestId('display-size-note')).toHaveTextContent(
      'Big makes the count and cues readable from a few meters away.',
    );
    await fireEvent.press(
      screen.getByRole('radio', { name: 'Big practice display, for across the floor' }),
    );
    expect(onSize).toHaveBeenLastCalledWith('big');
    expect(screen.getByTestId('display-size-note')).toHaveTextContent(
      'The count fills the width, with larger cues and phrase dots.',
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'Normal practice display' }));
    expect(onSize).toHaveBeenLastCalledWith('normal');
  });
});
