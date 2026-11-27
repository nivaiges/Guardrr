import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { VoiceInfo } from '../../engine';
import { VoicePicker } from '../VoicePicker';

const SAMANTHA: VoiceInfo = {
  identifier: 'com.apple.voice.compact.en-US.Samantha',
  name: 'Samantha',
  quality: 'Default',
  language: 'en-US',
};
const ANDROID: VoiceInfo = {
  identifier: 'en-gb-x-gba-local',
  name: 'en-gb-x-gba-local',
  quality: 'Enhanced',
  language: 'en-GB',
};

interface Props {
  voices?: readonly VoiceInfo[];
  initial?: string | null;
  running?: boolean;
  onChange?: (v: string | null) => void;
  onPreview?: (v: string | null) => void;
  onOpen?: () => void;
}

function Harness({
  voices = [SAMANTHA, ANDROID],
  initial = null,
  running = false,
  onChange,
  onPreview = () => {},
  onOpen,
}: Props) {
  const [value, setValue] = useState(initial);
  return (
    <VoicePicker
      voices={voices}
      value={value}
      running={running}
      onPreview={onPreview}
      onOpen={onOpen}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

const row = () => screen.getByTestId('voice-picker');

describe('<VoicePicker>', () => {
  it('shows the system default closed, and opens the list on tap', async () => {
    const onOpen = jest.fn();
    await render(<Harness onOpen={onOpen} />);
    expect(row()).toHaveAccessibleName('Voice: System default');
    expect(screen.queryByRole('radio')).toBeNull();
    await fireEvent.press(row());
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole('radio').map((r) => r.props.accessibilityLabel)).toEqual([
      'System default',
      'Samantha (US)',
      'Voice GBA (UK, enhanced)',
    ]);
    expect(screen.getByRole('radio', { name: 'System default' })).toBeSelected();
    await fireEvent.press(row());
    expect(screen.queryByRole('radio')).toBeNull();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('picks a voice and speaks a sample when not practicing', async () => {
    const onChange = jest.fn();
    const onPreview = jest.fn();
    await render(<Harness onChange={onChange} onPreview={onPreview} />);
    await fireEvent.press(row());
    await fireEvent.press(screen.getByRole('radio', { name: 'Samantha (US)' }));
    expect(onChange).toHaveBeenLastCalledWith(SAMANTHA.identifier);
    expect(onPreview).toHaveBeenLastCalledWith(SAMANTHA.identifier);
    expect(row()).toHaveAccessibleName('Voice: Samantha (US)');
    expect(screen.getByRole('radio', { name: 'Samantha (US)' })).toBeSelected();
    await fireEvent.press(screen.getByRole('radio', { name: 'System default' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(onPreview).toHaveBeenLastCalledWith(null);
  });

  it('picks without a sample while practicing, and says so in the hint', async () => {
    const onChange = jest.fn();
    const onPreview = jest.fn();
    await render(<Harness running onChange={onChange} onPreview={onPreview} />);
    await fireEvent.press(row());
    const option = screen.getByRole('radio', { name: 'Voice GBA (UK, enhanced)' });
    expect(option.props.accessibilityHint).toBe(
      'Selects this voice; the next call is spoken with it',
    );
    await fireEvent.press(option);
    expect(onChange).toHaveBeenLastCalledWith(ANDROID.identifier);
    expect(onPreview).not.toHaveBeenCalled();
  });

  it('keeps a saved voice the phone no longer lists as "System default" selected', async () => {
    await render(<Harness initial="gone-voice" />);
    expect(row()).toHaveAccessibleName('Voice: System default');
    await fireEvent.press(row());
    expect(screen.getByRole('radio', { name: 'System default' })).toBeSelected();
  });

  it('says "Saved voice" while the list is still empty, and how to add voices', async () => {
    await render(<Harness voices={[]} initial={SAMANTHA.identifier} />);
    expect(row()).toHaveAccessibleName('Voice: Saved voice');
    await fireEvent.press(row());
    expect(screen.getByText(/No other English voices found/)).toBeOnTheScreen();
    expect(screen.getAllByRole('radio')).toHaveLength(1);
  });
});
