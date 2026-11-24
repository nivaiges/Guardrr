import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import {
  CallSequence,
  DEFAULT_TOSS_SETTINGS,
  NORMAL_DISPLAY_METRICS,
  PracticeDisplay as DisplayModel,
  TossSettings,
  cueForTick,
  displayAccessibilityLabel,
  displayMetrics,
  practiceDisplay,
} from '../../engine';
import { AppearanceContext, darkTheme, lightTheme } from '../../theme';
import { PracticeDisplay } from '../PracticeDisplay';

/** A 5 count in a 16-count phrase, so every call is predictable. */
const FIVES: TossSettings = { ...DEFAULT_TOSS_SETTINGS, allowedTossCounts: [5] };

/** The display model on 0-based count `countIndex` (on the count, not its "and"). */
function modelAt(countIndex: number, settings: TossSettings = FIVES): DisplayModel {
  const calls = new CallSequence(settings, () => 0);
  let cue = null;
  for (let tick = 0; tick <= countIndex * 2; tick++)
    cue = cueForTick(
      { tick, countIndex: Math.floor(tick / 2), subdivision: tick % 2 },
      settings,
      calls,
    );
  return practiceDisplay(cue, settings);
}

const flat = (style: unknown) => StyleSheet.flatten(style as never) as Record<string, unknown>;

describe('<PracticeDisplay>', () => {
  it('shows a dash and the ready state before Start', async () => {
    const model = practiceDisplay(null, FIVES);
    await render(<PracticeDisplay model={model} />);
    expect(screen.getByTestId('display-count')).toHaveTextContent('–');
    expect(screen.getByText(model.headline)).toBeOnTheScreen();
    // Normal (not overlay, not big) explains the strip colors.
    expect(screen.getAllByText('●')).toHaveLength(3);
  });

  it('is one screen-reader element labelled with the whole state', async () => {
    const model = modelAt(16); // count 1 of the second phrase: the release
    await render(<PracticeDisplay model={model} />);
    expect(screen.getByLabelText(displayAccessibilityLabel(model))).toBeOnTheScreen();
  });

  it('shows the count, the release headline and the toss being thrown', async () => {
    const model = modelAt(16);
    expect(model.phase).toBe('release');
    await render(<PracticeDisplay model={model} />);
    expect(screen.getByTestId('display-count')).toHaveTextContent(String(model.count));
    expect(screen.getByText(model.headline)).toBeOnTheScreen();
    expect(screen.getAllByText(model.callLabel ?? '').length).toBeGreaterThan(0);
  });

  it('counts down to the catch', async () => {
    const model = modelAt(17); // count 2: 3 counts to the catch on 5
    await render(<PracticeDisplay model={model} />);
    expect(screen.getByText(`${model.countsToCatch} to catch`)).toBeOnTheScreen();
  });

  it('draws one phrase dot per count, split into even rows when it needs to shrink', async () => {
    await render(<PracticeDisplay model={modelAt(3)} />);
    const rows = screen.getAllByTestId('phrase-strip-row');
    const dots = rows.reduce((n, row) => n + (row.children as unknown[]).length, 0);
    expect(dots).toBe(16);
  });

  it('uses the big sizes when given big metrics, and drops the legend', async () => {
    const big = displayMetrics('big', 390, 844);
    await render(<PracticeDisplay model={modelAt(3)} metrics={big} />);
    const count = flat(screen.getByTestId('display-count').props.style);
    expect(count.fontSize).toBe(big.countFontSize);
    expect(count.fontSize).toBeGreaterThan(NORMAL_DISPLAY_METRICS.countFontSize);
    expect(screen.queryAllByText('●')).toHaveLength(0);
  });

  it("keeps large-text settings from enlarging Big's count (already sized to the screen)", async () => {
    await render(<PracticeDisplay model={modelAt(3)} metrics={displayMetrics('big', 390, 844)} />);
    expect(screen.getByTestId('display-count').props.maxFontSizeMultiplier).toBe(1);
  });

  it('paints the phase color, see-through over the camera', async () => {
    const model = modelAt(16);
    const { rerender } = await render(<PracticeDisplay model={model} />);
    const label = displayAccessibilityLabel(model);
    expect(flat(screen.getByLabelText(label).props.style).backgroundColor).toBe(
      lightTheme.phase.release,
    );
    await rerender(<PracticeDisplay model={model} overlay />);
    expect(flat(screen.getByLabelText(label).props.style).backgroundColor).toBe(
      `${lightTheme.phase.release}D9`,
    );
  });

  it('follows a forced dark appearance', async () => {
    const model = modelAt(16);
    await render(
      <AppearanceContext.Provider value="dark">
        <PracticeDisplay model={model} />
      </AppearanceContext.Provider>,
    );
    expect(
      flat(screen.getByLabelText(displayAccessibilityLabel(model)).props.style).backgroundColor,
    ).toBe(darkTheme.phase.release);
  });
});
