import { fireEvent, render, screen } from '@testing-library/react-native';

import {
  CallNameOptions,
  DEFAULT_ROTATION_MAP,
  EMPTY_STATS,
  SessionRecord,
  SessionStats,
} from '../../engine';
import { SessionStatsCard } from '../SessionStatsCard';

const NAMES: CallNameOptions = { callNaming: 'rotations', rotationMap: DEFAULT_ROTATION_MAP };

// Three tosses on Quads 155: a double, a triple (dropped) and a 4.
const STATS: SessionStats = {
  ...EMPTY_STATS,
  startedAtMs: 0,
  lastCueAtMs: 65_000,
  countsPlayed: 60,
  tosses: 3,
  catches: 3,
  drops: 1,
  recent: [
    { phrase: 1, call: 2.5 },
    { phrase: 2, call: 3, dropped: true },
    { phrase: 3, call: 4 },
  ],
  timesCalled: { '2.5': 1, '3': 1, '4': 1 },
  timesDropped: { '3': 1 },
};

const NOW = new Date(2026, 10, 26, 12).getTime();
const HISTORY: SessionRecord[] = [
  {
    startedAt: NOW - 60_000,
    durationMs: 60_000,
    bpm: 155,
    phraseLength: 16,
    tosses: 4,
    drops: 1,
    timesCalled: { '2.5': 4 },
    timesDropped: { '2.5': 1 },
  },
];

describe('SessionStatsCard', () => {
  it('shows nothing before the first session', async () => {
    await render(<SessionStatsCard stats={EMPTY_STATS} running={false} />);
    expect(screen.queryByText('Last session')).toBeNull();
  });

  it('shows the totals, the tally and the latest calls as counts', async () => {
    await render(<SessionStatsCard stats={STATS} running />);
    expect(screen.getByText('This session')).toBeTruthy();
    expect(screen.getByLabelText('tosses: 3')).toBeTruthy();
    expect(screen.getByLabelText('time: 1:05')).toBeTruthy();
    expect(screen.getByLabelText('caught: 67%')).toBeTruthy();
    expect(screen.getByLabelText('2 and: called 1 time')).toBeTruthy();
    expect(screen.getByLabelText('3: called 1 time, dropped 1')).toBeTruthy();
    expect(screen.getByText('Latest: 4 · 3 ✗ · 2 and')).toBeTruthy();
  });

  it('names calls by rotation when calls are said as rotations', async () => {
    await render(<SessionStatsCard stats={STATS} running={false} names={NAMES} />);
    expect(screen.getByText('Last session')).toBeTruthy();
    expect(screen.getByLabelText('Double: called 1 time')).toBeTruthy();
    expect(screen.getByLabelText('Triple: called 1 time, dropped 1')).toBeTruthy();
    // 4 has no name in the default map, so it stays a count.
    expect(screen.getByLabelText('4: called 1 time')).toBeTruthy();
    expect(screen.getByText('Latest: 4 · Triple ✗ · Double')).toBeTruthy();
    // Three tied calls: one name and "+2" so the column doesn't wrap; all of them read out.
    expect(screen.getByText('Double +2')).toBeTruthy();
    expect(screen.getByLabelText('called most: Double, Triple, 4')).toBeTruthy();
  });

  it('opens a named call’s sessions with the count it is caught on', async () => {
    await render(
      <SessionStatsCard
        stats={STATS}
        running={false}
        names={NAMES}
        history={HISTORY}
        nowMs={NOW}
      />,
    );
    expect(screen.getByText('Tap a call for every session it came up in.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('stats-call-2.5'));
    expect(screen.getByText('Double (2 and) — every session')).toBeTruthy();
    // Calls without saved sessions aren't buttons.
    expect(screen.queryByTestId('stats-call-3')).toBeNull();
  });
});
