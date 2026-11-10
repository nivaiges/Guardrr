import { SessionRecord } from '../history';
import {
  parseHistoryFilterKey,
  ALL_SESSIONS,
  NO_PRESET,
  filterHistory,
  historyFilterLabel,
  historyFilters,
  resolveHistoryFilter,
  sessionFilterKey,
} from '../historyFilter';

function record(startedAt: number, preset?: string): SessionRecord {
  return {
    startedAt,
    durationMs: 60_000,
    bpm: 120,
    phraseLength: 16,
    tosses: 4,
    drops: 1,
    timesCalled: { '5': 4 },
    timesDropped: { '5': 1 },
    ...(preset ? { preset } : {}),
  };
}

// Newest first, like stored history.
const HISTORY = [
  record(500, 'Quads 155'),
  record(400),
  record(300, 'Standard 16'),
  record(200, 'Quads 155'),
  record(100),
];

describe('sessionFilterKey', () => {
  it('groups by preset name, or "none" without one', () => {
    expect(sessionFilterKey(record(1, 'Quads 155'))).toBe('preset:Quads 155');
    expect(sessionFilterKey(record(1))).toBe(NO_PRESET);
  });
});

describe('historyFilters', () => {
  it('offers All, presets by most recent use, then No preset, with counts', () => {
    expect(historyFilters(HISTORY)).toEqual([
      { key: ALL_SESSIONS, label: 'All', sessions: 5 },
      { key: 'preset:Quads 155', label: 'Quads 155', sessions: 2 },
      { key: 'preset:Standard 16', label: 'Standard 16', sessions: 1 },
      { key: NO_PRESET, label: 'No preset', sessions: 2 },
    ]);
  });

  it('orders presets by recency even if the input is not sorted', () => {
    const shuffled = [record(1, 'Old'), record(9, 'New')];
    expect(historyFilters(shuffled).map((f) => f.label)).toEqual(['All', 'New', 'Old']);
  });

  it('offers nothing when every session is in one group', () => {
    expect(historyFilters([])).toEqual([]);
    expect(historyFilters([record(2, 'Quads 155'), record(1, 'Quads 155')])).toEqual([]);
    expect(historyFilters([record(2), record(1)])).toEqual([]);
  });

  it('leaves out No preset when every session has one', () => {
    const labels = historyFilters([record(2, 'A'), record(1, 'B')]).map((f) => f.label);
    expect(labels).toEqual(['All', 'A', 'B']);
  });

  it('keeps names that only differ in case apart', () => {
    expect(historyFilters([record(2, 'quads'), record(1, 'Quads')])).toHaveLength(3);
  });
});

describe('filterHistory', () => {
  it('keeps one preset’s sessions in order', () => {
    expect(filterHistory(HISTORY, 'preset:Quads 155').map((r) => r.startedAt)).toEqual([500, 200]);
  });

  it('keeps sessions without a preset', () => {
    expect(filterHistory(HISTORY, NO_PRESET).map((r) => r.startedAt)).toEqual([400, 100]);
  });

  it('keeps everything for All and for keys that match nothing', () => {
    expect(filterHistory(HISTORY, ALL_SESSIONS)).toEqual(HISTORY);
    expect(filterHistory(HISTORY, 'preset:Gone')).toEqual(HISTORY);
  });

  it('returns a copy', () => {
    expect(filterHistory(HISTORY, ALL_SESSIONS)).not.toBe(HISTORY);
  });
});

describe('resolveHistoryFilter', () => {
  it('keeps a key that still has sessions', () => {
    expect(resolveHistoryFilter(HISTORY, 'preset:Standard 16')).toBe('preset:Standard 16');
  });

  it('falls back to All once a preset’s sessions are deleted', () => {
    const without = HISTORY.filter((r) => r.preset !== 'Standard 16');
    expect(resolveHistoryFilter(without, 'preset:Standard 16')).toBe(ALL_SESSIONS);
  });

  it('falls back to All when only one group is left', () => {
    const quadsOnly = HISTORY.filter((r) => r.preset === 'Quads 155');
    expect(resolveHistoryFilter(quadsOnly, 'preset:Quads 155')).toBe(ALL_SESSIONS);
  });
});

describe('historyFilterLabel', () => {
  it('names the filter, or null for All', () => {
    expect(historyFilterLabel(ALL_SESSIONS)).toBeNull();
    expect(historyFilterLabel(NO_PRESET)).toBe('No preset');
    expect(historyFilterLabel('preset:Quads 155')).toBe('Quads 155');
    expect(historyFilterLabel('nonsense')).toBeNull();
  });
});

describe('parseHistoryFilterKey', () => {
  it('keeps All, No preset and preset keys', () => {
    expect(parseHistoryFilterKey(ALL_SESSIONS)).toBe(ALL_SESSIONS);
    expect(parseHistoryFilterKey(NO_PRESET)).toBe(NO_PRESET);
    expect(parseHistoryFilterKey('preset:Quads 155')).toBe('preset:Quads 155');
  });

  it('keeps a preset key with no sessions yet (History loads later)', () => {
    const key = parseHistoryFilterKey('preset:Gone');
    expect(key).toBe('preset:Gone');
    expect(resolveHistoryFilter([], key)).toBe(ALL_SESSIONS);
  });

  it('falls back to All for anything else', () => {
    for (const raw of [
      undefined,
      null,
      3,
      '',
      'preset:',
      'preset:   ',
      'Quads',
      {},
      'preset:' + 'x'.repeat(100),
    ]) {
      expect(parseHistoryFilterKey(raw)).toBe(ALL_SESSIONS);
    }
  });
});
