import { SessionRecord, summarizeHistory } from '../history';
import { callDetail, callTrend, callTrends } from '../historyTrend';
import { CallNameOptions, callLabelWithCount, statsLabelForCall } from '../practice';
import { DEFAULT_ROTATION_MAP } from '../rotations';
import {
  EMPTY_STATS,
  SessionStats,
  dropButtonText,
  mostCalledLabel,
  mostCalledSpoken,
  summarizeStats,
} from '../stats';

// Single 2, double 2&, triple 3, quad 3&.
const NAMES: CallNameOptions = { callNaming: 'rotations', rotationMap: DEFAULT_ROTATION_MAP };
const COUNTS: CallNameOptions = { callNaming: 'counts', rotationMap: DEFAULT_ROTATION_MAP };

const DAY = 86_400_000;
const NOW = (() => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime();
})();

function record(
  startedAt: number,
  called: Record<string, number>,
  dropped: Record<string, number> = {},
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
  };
}

describe('statsLabelForCall / callLabelWithCount', () => {
  it('reads a named call by its name and others as counts', () => {
    expect(statsLabelForCall(2.5, NAMES)).toBe('Double');
    expect(statsLabelForCall(3.5, NAMES)).toBe('Quad');
    expect(statsLabelForCall(4.5, NAMES)).toBe('4 and');
    expect(callLabelWithCount(2.5, NAMES)).toBe('Double (2 and)');
    expect(callLabelWithCount(5, NAMES)).toBe('5');
  });

  it('keeps counts when calls are said as counts, or without options', () => {
    expect(statsLabelForCall(2.5, COUNTS)).toBe('2 and');
    expect(statsLabelForCall(2.5)).toBe('2 and');
    expect(callLabelWithCount(3, COUNTS)).toBe('3');
  });
});

describe('session stats with rotation names', () => {
  const stats: SessionStats = {
    ...EMPTY_STATS,
    startedAtMs: 0,
    lastCueAtMs: 60_000,
    tosses: 4,
    drops: 1,
    recent: [
      { phrase: 1, call: 3 },
      { phrase: 2, call: 2.5 },
      { phrase: 3, call: 5 },
      { phrase: 4, call: 3, dropped: true },
    ],
    timesCalled: { '3': 2, '2.5': 1, '5': 1 },
    timesDropped: { '3': 1 },
  };

  it('labels the tally and the latest calls by name', () => {
    const s = summarizeStats(stats, 8, NAMES);
    expect(s.tally.map((t) => t.label)).toEqual(['Double', 'Triple', '5']);
    expect(s.latest).toEqual(['Triple ✗', '5', 'Double', 'Triple']);
  });

  it('is unchanged with counts', () => {
    const s = summarizeStats(stats, 8, COUNTS);
    expect(s.tally.map((t) => t.label)).toEqual(['2 and', '3', '5']);
    expect(s.latest[0]).toBe('3 ✗');
  });

  it('names the most called', () => {
    expect(mostCalledLabel([2.5, 3], 2, NAMES)).toBe('Double, Triple');
    expect(mostCalledLabel([2.5, 4.5], 2, NAMES)).toBe('Double, 4&');
    expect(mostCalledSpoken([3, 4.5], NAMES)).toBe('Triple, 4 and');
  });

  it('names the toss the Drop button marks', () => {
    const latest = { ...stats, catches: 4 };
    expect(dropButtonText(latest, NAMES)!.hint).toBe(
      'Counts the latest toss (Triple) as caught again',
    );
    const withPrevious: SessionStats = {
      ...EMPTY_STATS,
      tosses: 2,
      catches: 1,
      countsPlayed: 20,
      recent: [
        { phrase: 1, call: 3.5 },
        { phrase: 2, call: 5, releasedAtCount: 19 },
      ],
      timesCalled: { '3.5': 1, '5': 1 },
    };
    const text = dropButtonText(withPrevious, NAMES)!;
    expect(text.detail).toBe('toss 1 · Quad');
    expect(text.hint).toBe('Marks the previous toss (Quad) as dropped');
  });
});

describe('History with rotation names', () => {
  // Newest first.
  const history = [
    record(NOW - 1000, { '2.5': 4, '4': 2 }, { '2.5': 1 }),
    record(NOW - DAY, { '2.5': 4 }, { '2.5': 2 }),
  ];

  it('labels calls and "Dropped most" by name', () => {
    const h = summarizeHistory(history, NOW, 10, NAMES);
    expect(h.calls.map((c) => c.label)).toEqual(['Double', '4']);
    expect(h.hardest.map((c) => c.label)).toEqual(['Double']);
  });

  it('names the trend and reads it out by name', () => {
    const trend = callTrend(history, 2.5, 10, NAMES)!;
    expect(trend.label).toBe('Double');
    expect(trend.accessibilityLabel).toMatch(/^Double: caught 50%, then 75%/);
    expect(callTrends(history, [2.5], 10, NAMES)[0].label).toBe('Double');
  });

  it('heads the call detail with the name and the count it is caught on', () => {
    const detail = callDetail(history, 2.5, NOW, 25, NAMES)!;
    expect(detail.label).toBe('Double (2 and)');
    expect(detail.summary).toBe('Double (2 and): 2 sessions, 8 tosses, 63% caught');
  });

  it('keeps counts without names', () => {
    expect(summarizeHistory(history, NOW).calls[0].label).toBe('2 and');
    expect(callDetail(history, 2.5, NOW)!.label).toBe('2 and');
  });
});
