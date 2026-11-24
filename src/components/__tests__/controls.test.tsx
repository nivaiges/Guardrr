import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { Segmented, Stepper, Toggle } from '../controls';

function BpmStepper({ initial, onChange }: { initial: number; onChange?: (v: number) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <Stepper
      label="Tempo"
      value={value}
      min={40}
      max={240}
      bigStep={5}
      format={(v) => `${v} BPM`}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

describe('<Stepper>', () => {
  it('steps by 1 and by the big step, and reads the value to screen readers', async () => {
    await render(<BpmStepper initial={120} />);
    expect(screen.getByLabelText('Tempo: 120 BPM')).toHaveTextContent('120 BPM');
    await press('Tempo plus 1');
    await press('Tempo plus 5');
    expect(screen.getByText('126 BPM')).toBeOnTheScreen();
    await press('Tempo minus 5');
    await press('Tempo minus 1');
    expect(screen.getByLabelText('Tempo: 120 BPM')).toBeOnTheScreen();
  });

  it('clamps a big step to the limits instead of overshooting', async () => {
    const onChange = jest.fn();
    await render(<BpmStepper initial={238} onChange={onChange} />);
    await press('Tempo plus 5');
    expect(onChange).toHaveBeenLastCalledWith(240);
    await render(<BpmStepper initial={42} onChange={onChange} />);
    await press('Tempo minus 5');
    expect(onChange).toHaveBeenLastCalledWith(40);
  });

  it('disables the buttons at the limits', async () => {
    await render(<BpmStepper initial={240} />);
    expect(screen.getByRole('button', { name: 'Tempo plus 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tempo plus 5' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tempo minus 1' })).toBeEnabled();
  });

  it('disables everything when told to (e.g. while practicing)', async () => {
    const onChange = jest.fn();
    await render(
      <Stepper label="Lead counts" value={4} min={1} max={8} onChange={onChange} disabled />,
    );
    for (const name of ['Lead counts minus 1', 'Lead counts plus 1']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
      await press(name);
    }
    expect(onChange).not.toHaveBeenCalled();
    // No big step asked for: no outer buttons.
    expect(screen.queryByRole('button', { name: /plus 5/ })).toBeNull();
  });
});

describe('<Segmented>', () => {
  it('is a group of radios with the chosen option selected', async () => {
    const onChange = jest.fn();
    await render(
      <Segmented label="Phrase length" options={[8, 16, 32]} value={16} onChange={onChange} />,
    );
    expect(screen.getByLabelText('Phrase length').props.accessibilityRole).toBe('radiogroup');
    expect(screen.getByRole('radio', { name: '16 counts' })).toBeSelected();
    expect(screen.getByRole('radio', { name: '8 counts' })).not.toBeSelected();
    await fireEvent.press(screen.getByRole('radio', { name: '32 counts' }));
    expect(onChange).toHaveBeenCalledWith(32);
  });

  it('uses custom labels for text options', async () => {
    await render(
      <Segmented
        label="Theme"
        options={['system', 'light', 'dark'] as const}
        value="dark"
        onChange={() => {}}
        optionLabel={(o) => o[0].toUpperCase() + o.slice(1)}
        optionAccessibilityLabel={(o) => `${o} appearance`}
      />,
    );
    expect(screen.getByText('System')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'dark appearance' })).toBeSelected();
  });

  it('ignores taps while disabled', async () => {
    const onChange = jest.fn();
    await render(
      <Segmented label="Phrase length" options={[8, 16]} value={8} onChange={onChange} disabled />,
    );
    await fireEvent.press(screen.getByRole('radio', { name: '16 counts' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('<Toggle>', () => {
  it('is a labelled switch that reports the new value', async () => {
    const onChange = jest.fn();
    await render(<Toggle label="Accent count 1" value={false} onChange={onChange} />);
    const toggle = screen.getByRole('switch', { name: 'Accent count 1' });
    expect(toggle).not.toBeChecked();
    await fireEvent(toggle, 'valueChange', true);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
