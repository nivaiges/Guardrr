import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import {
  CallNameOptions,
  DEFAULT_ROTATION_MAP,
  HistoryState,
  SessionRecord,
  clearHistory,
  deleteFromHistory,
  restoreToHistory,
} from '../../engine';
import { SessionHistoryCard } from '../SessionHistoryCard';

const NAMES: CallNameOptions = { callNaming: 'rotations', rotationMap: DEFAULT_ROTATION_MAP };
const DAY = 86_400_000;
const NOW = new Date(2026, 10, 26, 12).getTime();

function record(
  startedAt: number,
  called: Record<string, number>,
  dropped: Record<string, number>,
  extra: Partial<SessionRecord> = {},
): SessionRecord {
  return {
    startedAt,
    durationMs: 60_000,
    bpm: 155,
    phraseLength: 16,
    tosses: Object.values(called).reduce((a, b) => a + b, 0),
    drops: Object.values(dropped).reduce((a, b) => a + b, 0),
    timesCalled: called,
    timesDropped: dropped,
    ...extra,
  };
}

// Newest first: two Quads 155 sessions where the double got better, and one at 120 BPM.
const HISTORY: SessionRecord[] = [
  record(NOW - 1000, { '2.5': 4, '4': 4 }, { '2.5': 1 }, { preset: 'Quads 155' }),
  record(NOW - DAY, { '2.5': 4 }, { '2.5': 2 }, { preset: 'Quads 155' }),
  record(NOW - 2 * DAY, { '5': 4 }, {}, { bpm: 120 }),
];

/** The card over real history state, deleting and restoring as App's storage hook does. */
function Harness({
  initial = HISTORY,
  names,
  onShare,
}: {
  initial?: SessionRecord[];
  names?: CallNameOptions;
  onShare?: (sessions: readonly SessionRecord[], label: string | null) => Promise<string | null>;
}) {
  const [state, setState] = useState<HistoryState>({ sessions: initial, deleted: [] });
  return (
    <SessionHistoryCard
      history={state.sessions}
      names={names}
      nowMs={NOW}
      onDelete={(startedAt) => {
        const { state: next, removed } = deleteFromHistory(state, [startedAt]);
        setState(next);
        return removed;
      }}
      onClear={() => {
        const { state: next, removed } = clearHistory(state);
        setState(next);
        return removed;
      }}
      onRestore={(records) => setState((s) => restoreToHistory(s, records))}
      onShare={onShare}
    />
  );
}

describe('SessionHistoryCard', () => {
  it('shows nothing without saved sessions', async () => {
    await render(<Harness initial={[]} />);
    expect(screen.queryByText('History')).toBeNull();
  });

  it('totals every session and narrows them with a preset chip', async () => {
    await render(<Harness />);
    expect(screen.getByLabelText('3 sessions, 16 tosses, 81% caught, 3:00 in total')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('history-filter-preset:Quads 155'));
    expect(screen.getByLabelText('2 sessions, 12 tosses, 75% caught, 2:00 in total')).toBeTruthy();
  });

  it('shares only the sessions the filter shows', async () => {
    const onShare = jest.fn(async (sessions: readonly SessionRecord[]) =>
      sessions.length === 2 ? 'Shared 2 sessions' : null,
    );
    await render(<Harness onShare={onShare} />);
    await fireEvent.press(screen.getByTestId('history-filter-preset:Quads 155'));
    await fireEvent.press(screen.getByTestId('history-share'));
    expect(onShare).toHaveBeenCalledWith(
      [HISTORY[0], HISTORY[1]],
      expect.stringContaining('Quads 155'),
    );
    expect((await screen.findByTestId('history-share-note')).props.children).toBe(
      'Shared 2 sessions',
    );
  });

  it('labels the calls dropped most and their trend as counts', async () => {
    await render(<Harness />);
    expect(screen.getByTestId('history-hardest-2.5').props.children).toBe('2 and');
    expect(screen.getByLabelText(/^2 and: caught 50%, then 75%, over 2 sessions/)).toBeTruthy();
  });

  it('names them by rotation, and opens the details with the count', async () => {
    await render(<Harness names={NAMES} />);
    expect(screen.getByTestId('history-hardest-2.5').props.children).toBe('Double');
    expect(screen.getByLabelText(/^Double: caught 50%, then 75%, over 2 sessions/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('history-trend-2.5'));
    expect(screen.getByText('Double (2 and) — every session')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('history-call-detail-close'));
    expect(screen.queryByText('Double (2 and) — every session')).toBeNull();
  });

  it('deletes a session with Undo', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByTestId('history-edit'));
    await fireEvent.press(screen.getByTestId(`history-delete-${NOW - 1000}`));
    expect(screen.getByLabelText(/^Undo: Deleted Today/)).toBeTruthy();
    expect(screen.getByLabelText('2 sessions, 8 tosses, 75% caught, 2:00 in total')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('history-undo'));
    expect(screen.getByLabelText('3 sessions, 16 tosses, 81% caught, 3:00 in total')).toBeTruthy();
  });

  it('asks before clearing everything, and can bring it all back', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByTestId('history-edit'));
    await fireEvent.press(screen.getByTestId('history-clear'));
    expect(screen.getByText('Delete all 3 sessions?')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('history-clear-cancel'));
    expect(screen.queryByText('Delete all 3 sessions?')).toBeNull();
    await fireEvent.press(screen.getByTestId('history-clear'));
    await fireEvent.press(screen.getByTestId('history-clear-confirm'));
    expect(screen.getByText('No sessions saved.')).toBeTruthy();
    expect(screen.getByText('Deleted 3 sessions')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('history-undo'));
    expect(screen.getByLabelText(/^3 sessions, 16 tosses/)).toBeTruthy();
  });
});
