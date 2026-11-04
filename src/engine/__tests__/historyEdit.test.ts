import {
  EMPTY_HISTORY_STATE,
  HistoryState,
  SessionRecord,
  clearHistory,
  deleteFromHistory,
  deletionMessage,
  restoreToHistory,
  saveToHistory,
} from '../history';

const NOW = new Date(2026, 10, 4, 18, 30).getTime(); // Nov 4 2026, 6:30 PM local

const session = (startedAt: number, tosses = 2): SessionRecord => ({
  startedAt,
  durationMs: 60_000,
  bpm: 120,
  phraseLength: 16,
  tosses,
  drops: 0,
  timesCalled: { '5': tosses },
  timesDropped: {},
});

const starts = (state: HistoryState) => state.sessions.map((r) => r.startedAt);

const three: HistoryState = { sessions: [session(300), session(200), session(100)], deleted: [] };

describe('saveToHistory', () => {
  it('adds new sessions newest first and replaces re-saved ones', () => {
    let state = saveToHistory(EMPTY_HISTORY_STATE, session(100));
    state = saveToHistory(state, session(200));
    state = saveToHistory(state, session(100, 5));
    expect(starts(state)).toEqual([200, 100]);
    expect(state.sessions[1].tosses).toBe(5);
  });

  it('ignores a late re-save of a deleted session', () => {
    const { state } = deleteFromHistory(three, [200]);
    expect(saveToHistory(state, session(200, 9))).toBe(state);
  });

  it('keeps the limit', () => {
    expect(starts(saveToHistory(three, session(400), 2))).toEqual([400, 300]);
  });
});

describe('deleteFromHistory', () => {
  it('removes one session and returns it for Undo', () => {
    const { state, removed } = deleteFromHistory(three, [200]);
    expect(starts(state)).toEqual([300, 100]);
    expect(removed.map((r) => r.startedAt)).toEqual([200]);
    expect(state.deleted).toEqual([200]);
  });

  it('is a no-op for unknown start times', () => {
    const result = deleteFromHistory(three, [999]);
    expect(result.state).toBe(three);
    expect(result.removed).toEqual([]);
  });

  it('does not list a start time as deleted twice', () => {
    const first = deleteFromHistory(three, [200]);
    const undone = restoreToHistory(first.state, first.removed);
    expect(deleteFromHistory(undone, [200]).state.deleted).toEqual([200]);
  });
});

describe('clearHistory', () => {
  it('removes everything and blocks re-saves of the cleared sessions only', () => {
    const { state, removed } = clearHistory(three);
    expect(state.sessions).toEqual([]);
    expect(removed).toHaveLength(3);
    expect(saveToHistory(state, session(300)).sessions).toEqual([]);
    expect(starts(saveToHistory(state, session(400)))).toEqual([400]);
  });

  it('is a no-op on an empty history', () => {
    expect(clearHistory(EMPTY_HISTORY_STATE).removed).toEqual([]);
  });
});

describe('restoreToHistory', () => {
  it('undoes a delete in place and allows re-saves again', () => {
    const { state, removed } = deleteFromHistory(three, [200]);
    const restored = restoreToHistory(state, removed);
    expect(starts(restored)).toEqual([300, 200, 100]);
    expect(restored.deleted).toEqual([]);
    expect(saveToHistory(restored, session(200, 7)).sessions[1].tosses).toBe(7);
  });

  it('undoes Clear all, keeping sessions saved since', () => {
    const { state, removed } = clearHistory(three);
    const after = saveToHistory(state, session(400));
    expect(starts(restoreToHistory(after, removed))).toEqual([400, 300, 200, 100]);
  });

  it('keeps a newer copy saved since instead of the removed one', () => {
    const { removed } = deleteFromHistory(three, [200]);
    const resaved: HistoryState = { sessions: [session(200, 8)], deleted: [] };
    const restored = restoreToHistory(resaved, removed);
    expect(restored.sessions).toHaveLength(1);
    expect(restored.sessions[0].tosses).toBe(8);
  });

  it('keeps the limit', () => {
    const { state, removed } = clearHistory(three);
    expect(starts(restoreToHistory(state, removed, 2))).toEqual([300, 200]);
  });
});

describe('deletionMessage', () => {
  it('names a single session by its date', () => {
    const at = new Date(2026, 10, 4, 18, 5).getTime();
    expect(deletionMessage([session(at)], NOW)).toBe('Deleted Today 6:05 PM');
  });

  it('counts several sessions', () => {
    expect(deletionMessage(three.sessions, NOW)).toBe('Deleted 3 sessions');
  });
});
