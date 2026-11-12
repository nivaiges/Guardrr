import { SessionRecord } from '../history';
import {
  ALL_SESSIONS,
  ALL_TEMPOS,
  combinedFilterLabel,
  filterByTempo,
  parseTempoFilterKey,
  resolveTempoFilter,
  sessionTempoKey,
  tempoFilterLabel,
  tempoFilters,
} from '../historyFilter';

function record(startedAt: number, bpm: number, phraseLength = 16, preset?: string): SessionRecord {
  return {
    startedAt,
    durationMs: 60_000,
    bpm,
    phraseLength,
    tosses: 4,
    drops: 0,
    timesCalled: { '5': 4 },
    timesDropped: {},
    ...(preset ? { preset } : {}),
  };
}

// Newest first, like stored history.
const HISTORY = [record(500, 155), record(400, 120), record(300, 155), record(200, 96)];

describe('sessionTempoKey', () => {
  it('groups by tempo and phrase length', () => {
    expect(sessionTempoKey(record(1, 155))).toBe('tempo:155/16');
    expect(sessionTempoKey(record(1, 155, 8))).toBe('tempo:155/8');
  });
});

describe('tempoFilters', () => {
  it('offers All tempos, then each tempo slowest first with session counts', () => {
    expect(tempoFilters(HISTORY)).toEqual([
      { key: ALL_TEMPOS, label: 'All tempos', sessions: 4 },
      { key: 'tempo:96/16', label: '96 BPM', sessions: 1 },
      { key: 'tempo:120/16', label: '120 BPM', sessions: 1 },
      { key: 'tempo:155/16', label: '155 BPM', sessions: 2 },
    ]);
  });

  it('is empty when every session shares one tempo and phrase length', () => {
    expect(tempoFilters([record(2, 155), record(1, 155)])).toEqual([]);
    expect(tempoFilters([])).toEqual([]);
  });

  it('names the phrase length once sessions use more than one', () => {
    const labels = tempoFilters([record(3, 155, 8), record(2, 155, 16), record(1, 120, 16)]).map(
      (f) => f.label,
    );
    expect(labels).toEqual(['All tempos', '120 BPM · 16', '155 BPM · 8', '155 BPM · 16']);
  });
});

describe('resolveTempoFilter / filterByTempo', () => {
  it('keeps only the chosen tempo, in order', () => {
    expect(filterByTempo(HISTORY, 'tempo:155/16').map((r) => r.startedAt)).toEqual([500, 300]);
  });

  it('falls back to All tempos when nothing matches or only one tempo is left', () => {
    expect(resolveTempoFilter(HISTORY, 'tempo:200/16')).toBe(ALL_TEMPOS);
    expect(filterByTempo(HISTORY, 'tempo:200/16')).toHaveLength(4);
    // A preset filter can leave one tempo: the tempo chips disappear, so show everything.
    const oneTempo = [record(2, 155), record(1, 155)];
    expect(resolveTempoFilter(oneTempo, 'tempo:155/16')).toBe(ALL_TEMPOS);
    expect(filterByTempo(oneTempo, 'tempo:155/16')).toHaveLength(2);
  });

  it('returns a copy for All tempos', () => {
    const all = filterByTempo(HISTORY, ALL_TEMPOS);
    expect(all).toEqual(HISTORY);
    expect(all).not.toBe(HISTORY);
  });
});

describe('labels', () => {
  it('spells the tempo out for sharing', () => {
    expect(tempoFilterLabel('tempo:120/16')).toBe('120 BPM · 16 counts');
    expect(tempoFilterLabel(ALL_TEMPOS)).toBeNull();
    expect(tempoFilterLabel('preset:Quads 155')).toBeNull();
  });

  it('joins the preset and tempo filters', () => {
    expect(combinedFilterLabel('preset:Quads 155', 'tempo:155/16')).toBe(
      'Quads 155 · 155 BPM · 16 counts',
    );
    expect(combinedFilterLabel(ALL_SESSIONS, 'tempo:120/8')).toBe('120 BPM · 8 counts');
    expect(combinedFilterLabel('preset:Quick 8', ALL_TEMPOS)).toBe('Quick 8');
    expect(combinedFilterLabel(ALL_SESSIONS, ALL_TEMPOS)).toBeNull();
  });
});

describe('parseTempoFilterKey', () => {
  it('keeps well-formed keys', () => {
    expect(parseTempoFilterKey('tempo:155/16')).toBe('tempo:155/16');
    expect(parseTempoFilterKey(ALL_TEMPOS)).toBe(ALL_TEMPOS);
  });

  it('falls back to All tempos for anything else', () => {
    for (const raw of [
      undefined,
      null,
      155,
      'tempo:',
      'tempo:0/16',
      'tempo:155',
      'preset:x',
      'tempo:1550/16',
    ]) {
      expect(parseTempoFilterKey(raw)).toBe(ALL_TEMPOS);
    }
  });
});
