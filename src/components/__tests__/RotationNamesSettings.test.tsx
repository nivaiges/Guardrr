import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import {
  CallNaming,
  DEFAULT_ROTATION_MAP,
  QUADS_TOSS_SETTINGS,
  RotationMap,
  TossSettings,
} from '../../engine';
import { RotationNamesSettings } from '../RotationNamesSettings';

interface State {
  naming: CallNaming;
  map: RotationMap;
  settings: TossSettings;
}

/** The section with real state, as SettingsPanel uses it; reports every change. */
function Harness({ initial, onState }: { initial: State; onState?: (s: State) => void }) {
  const [state, setState] = useState(initial);
  const set = (next: State) => {
    setState(next);
    onState?.(next);
  };
  return (
    <RotationNamesSettings
      naming={state.naming}
      map={state.map}
      onChange={(naming, map) => set({ ...state, naming, map })}
      settings={state.settings}
      onSettingsChange={(settings) => set({ ...state, settings })}
    />
  );
}

const COUNTS: State = {
  naming: 'counts',
  map: DEFAULT_ROTATION_MAP,
  settings: QUADS_TOSS_SETTINGS,
};

describe('<RotationNamesSettings>', () => {
  it('says calls as counts by default and hides the map', async () => {
    await render(<Harness initial={COUNTS} />);
    expect(screen.getByLabelText(/Say calls as counts/).props.accessibilityState.selected).toBe(
      true,
    );
    expect(screen.queryByText('Double')).toBeNull();
    expect(screen.getByText(/Pick Rotations/)).toBeOnTheScreen();
  });

  it('shows a stepper per rotation once Rotations is picked', async () => {
    const states: State[] = [];
    await render(<Harness initial={COUNTS} onState={(s) => states.push(s)} />);
    await fireEvent.press(screen.getByLabelText(/Say calls as rotations/));
    expect(states.at(-1)?.naming).toBe('rotations');
    expect(screen.getByLabelText('Single: 2')).toBeOnTheScreen();
    expect(screen.getByLabelText('Double: 2&')).toBeOnTheScreen();
    expect(screen.getByLabelText('Triple: 3')).toBeOnTheScreen();
    expect(screen.getByLabelText('Quad: 3&')).toBeOnTheScreen();
    // Quads 155 calls 4, 4&, 5 too: those keep their counts.
    expect(screen.getByTestId('unnamed-calls-note')).toHaveTextContent(
      '4, 4 and, 5 have no name and are still called as counts.',
    );
  });

  it('steps a rotation by one call and stops at its neighbour', async () => {
    const states: State[] = [];
    await render(
      <Harness initial={{ ...COUNTS, naming: 'rotations' }} onState={(s) => states.push(s)} />,
    );
    await fireEvent.press(screen.getByLabelText('Quad later'));
    expect(states.at(-1)?.map.quad).toBe(4);
    expect(screen.getByLabelText('Quad: 4')).toBeOnTheScreen();
    // The double sits right before the triple, so it can't move later.
    expect(screen.getByLabelText('Double later').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByLabelText('Single earlier'));
    expect(states.at(-1)?.map.single).toBe(1);
    expect(screen.getByLabelText('Single earlier').props.accessibilityState.disabled).toBe(true);
  });

  it('"Use these calls" practices only the named tosses', async () => {
    const states: State[] = [];
    await render(
      <Harness initial={{ ...COUNTS, naming: 'rotations' }} onState={(s) => states.push(s)} />,
    );
    await fireEvent.press(screen.getByTestId('use-rotation-calls'));
    expect(states.at(-1)?.settings.allowedTossCounts).toEqual([2, 2.5, 3, 3.5]);
    expect(screen.getByText('Practicing these calls')).toBeOnTheScreen();
    expect(screen.queryByTestId('unnamed-calls-note')).toBeNull();
  });

  it('says when a name needs a longer phrase', async () => {
    const long = { single: 3, double: 5, triple: 7, quad: 9 };
    const eight = { ...QUADS_TOSS_SETTINGS, phraseLength: 8, allowedTossCounts: [3, 5] };
    await render(<Harness initial={{ naming: 'rotations', map: long, settings: eight }} />);
    expect(screen.getByText('One name needs a longer phrase.')).toBeOnTheScreen();
  });
});
