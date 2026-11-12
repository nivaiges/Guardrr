import { SessionRecord } from '../history';
import { callDetail } from '../historyTrend';

const DAY = 86_400_000;
// Local noon today, so "Today"/"Yesterday" don't depend on when the test runs.
const NOW = (() => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime();
})();

function record(
  startedAt: number,
  called: Record<string, number>,
  dropped: Record<string, number> = {},
  extra: Partial<SessionRecord> = {},
): SessionRecord {
  return {
    startedAt,
    durationMs: 60_000,
    bpm: 120,
    phraseLength: 16,
    tosses: Object.values(called).reduce((a, b) => a + b, 0),
    drops: Object.values(dropped).reduce((a, b) => a + b, 0),
    timesCalled: called,
    timesDropped: dropped,
    ...extra,
  };
}

// Newest first, like stored history.
const HISTORY = [
  record(NOW - 1000, { '7': 5, '5': 2 }, { '7': 1 }, { preset: 'Quads 155', bpm: 155 }),
  record(NOW - DAY, { '5': 3 }),
  record(NOW - 2 * DAY, { '7': 4 }, { '7': 2 }),
];

describe('callDetail', () => {
  it('lists every session the call came up in, newest first, with its catch rate', () => {
    const detail = callDetail(HISTORY, 7, NOW)!;
    expect(detail.rows.map((r) => [r.drill, r.caughtOf, r.caught])).toEqual([
      ['Quads 155 · 155 BPM', '4 of 5', '80%'],
      ['120 BPM · 16 counts', '2 of 4', '50%'],
    ]);
    expect(detail.rows[0].date).toMatch(/^Today /);
    expect(detail.rows[0].rate).toBeCloseTo(0.8);
  });

  it('totals the call over those sessions', () => {
    const detail = callDetail(HISTORY, 7, NOW)!;
    expect(detail).toMatchObject({ sessions: 2, tosses: 9, drops: 3, caught: '67%', more: 0 });
    expect(detail.summary).toBe('7: 2 sessions, 9 tosses, 67% caught');
  });

  it('uses singular words and call labels', () => {
    const detail = callDetail([record(NOW, { '9': 1 })], 9, NOW)!;
    expect(detail.summary).toBe('9: 1 session, 1 toss, 100% caught');
    const and = callDetail([record(NOW, { '4.5': 2 })], 4.5, NOW)!;
    expect(and.label).toBe('4 and');
  });

  it('is null for a call that never came up', () => {
    expect(callDetail(HISTORY, 3, NOW)).toBeNull();
    expect(callDetail([], 7, NOW)).toBeNull();
  });

  it('lists at most `limit` rows but counts every session', () => {
    const many = Array.from({ length: 30 }, (_, i) => record(NOW - i * DAY, { '5': 2 }));
    const detail = callDetail(many, 5, NOW, 25)!;
    expect(detail.rows).toHaveLength(25);
    expect(detail.sessions).toBe(30);
    expect(detail.more).toBe(5);
    expect(detail.tosses).toBe(60);
  });

  it('never counts more drops than tosses', () => {
    const detail = callDetail([record(NOW, { '5': 2 }, { '5': 3 })], 5, NOW)!;
    expect(detail.rows[0].caughtOf).toBe('0 of 2');
    expect(detail.drops).toBe(2);
  });

  it('reads well to a screen reader', () => {
    const detail = callDetail(HISTORY, 7, NOW)!;
    expect(detail.rows[0].accessibilityLabel).toMatch(
      /^Today \d+:\d\d [AP]M, Quads 155, 155 BPM: caught 4 of 5, 80%$/,
    );
  });
});
