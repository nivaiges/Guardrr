import { SessionRecord } from '../history';
import {
  TREND_SESSIONS,
  TrendPoint,
  callTrend,
  callTrends,
  trendDirection,
  trendHalves,
} from '../historyTrend';

/** A session `daysAgo` days back with the given [times, drops] per call. */
function session(daysAgo: number, calls: Record<string, [number, number]>): SessionRecord {
  const timesCalled: Record<string, number> = {};
  const timesDropped: Record<string, number> = {};
  let tosses = 0;
  let drops = 0;
  for (const [key, [n, d]] of Object.entries(calls)) {
    timesCalled[key] = n;
    if (d > 0) timesDropped[key] = d;
    tosses += n;
    drops += d;
  }
  return {
    startedAt: 1_700_000_000_000 - daysAgo * 86_400_000,
    durationMs: 60_000,
    bpm: 120,
    phraseLength: 16,
    tosses,
    drops,
    timesCalled,
    timesDropped,
  };
}

const point = (tosses: number, drops: number): TrendPoint => ({
  startedAt: 0,
  tosses,
  drops,
  rate: (tosses - drops) / tosses,
});

describe('trendDirection', () => {
  it('is steady with fewer than two sessions', () => {
    expect(trendDirection([])).toBe('steady');
    expect(trendDirection([point(10, 5)])).toBe('steady');
  });

  it('compares the earlier half with the later half', () => {
    expect(trendDirection([point(10, 4), point(10, 1)])).toBe('better');
    expect(trendDirection([point(10, 0), point(10, 3)])).toBe('worse');
    // Odd count: the middle session is left out.
    expect(trendDirection([point(10, 5), point(10, 0), point(10, 5)])).toBe('steady');
  });

  it('calls a change under 5 points steady', () => {
    expect(trendDirection([point(25, 1), point(25, 0)])).toBe('steady'); // 96% → 100%
    expect(trendDirection([point(20, 1), point(20, 0)])).toBe('better'); // 95% → 100%
  });

  it('weighs sessions by their tosses', () => {
    // Earlier: 2/2 and 10/30 → 12/32 = 38%; later: 18/20 and 1/2 → 19/22 = 86%.
    expect(trendDirection([point(2, 0), point(30, 20), point(20, 2), point(2, 1)])).toBe('better');
  });
});

describe('trendHalves', () => {
  it('pools the tosses of each half', () => {
    // Earlier: 3/4 and 1/2 → 4/6; later: 4/4 and 2/2 → 6/6.
    const halves = trendHalves([point(4, 1), point(2, 1), point(4, 0), point(2, 0)]);
    expect(halves.earlier).toBeCloseTo(4 / 6);
    expect(halves.later).toBe(1);
  });

  it('agrees with the summary when first and last sessions are the same', () => {
    // 100% → 50% → 100% session by session is steady, and reads "100% → 100%".
    const points = [point(4, 0), point(4, 2), point(4, 0)];
    expect(trendHalves(points)).toEqual({ earlier: 1, later: 1 });
    expect(trendDirection(points)).toBe('steady');
  });

  it('uses the one session for both halves', () => {
    expect(trendHalves([point(4, 1)])).toEqual({ earlier: 0.75, later: 0.75 });
  });
});

describe('callTrend', () => {
  // Newest first, as History keeps them.
  const history = [
    session(0, { '5': [6, 0], '7': [4, 2] }),
    session(1, { '7': [5, 1] }),
    session(2, { '5': [4, 1], '3': [3, 0] }),
    session(3, { '5': [3, 1], '7': [6, 3] }),
  ];

  it('lists the sessions the call came up in, oldest first', () => {
    const trend = callTrend(history, 5);
    expect(trend).not.toBeNull();
    expect(trend!.points.map((p) => [p.tosses, p.drops])).toEqual([
      [3, 1],
      [4, 1],
      [6, 0],
    ]);
    expect(trend!.points[0].startedAt).toBe(history[3].startedAt);
    // Three sessions: the middle one is left out of the comparison.
    expect(trend!.earlier).toBe('67%');
    expect(trend!.later).toBe('100%');
    expect(trend!.summary).toBe('67% → 100%');
    expect(trend!.direction).toBe('better');
    expect(trend!.accessibilityLabel).toBe(
      '5: caught 67%, then 100%, over 3 sessions: getting better',
    );
  });

  it('needs the call in at least two sessions', () => {
    expect(callTrend(history, 3)).toBeNull();
    expect(callTrend(history, 6)).toBeNull();
    expect(callTrend([], 5)).toBeNull();
  });

  it('keeps only the latest sessions', () => {
    const many = Array.from({ length: TREND_SESSIONS + 5 }, (_, i) =>
      // Newest first: the newest 10 have no drops, the 5 oldest drop everything.
      session(i, { '4': [4, i < TREND_SESSIONS ? 0 : 4] }),
    );
    const trend = callTrend(many, 4)!;
    expect(trend.points).toHaveLength(TREND_SESSIONS);
    expect(trend.points.every((p) => p.rate === 1)).toBe(true);
    expect(trend.direction).toBe('steady');
    expect(callTrend(many, 4, 3)!.points).toHaveLength(3);
  });

  it('labels "and" calls and caps bad drop counts', () => {
    const odd = [session(0, { '2.5': [2, 0] }), session(1, { '2.5': [2, 0] })];
    odd[1] = { ...odd[1], timesDropped: { '2.5': 9 } };
    const trend = callTrend(odd, 2.5)!;
    expect(trend.label).toBe('2 and');
    expect(trend.earlier).toBe('0%');
    expect(trend.later).toBe('100%');
    expect(trend.direction).toBe('better');
  });
});

describe('callTrends', () => {
  it('keeps the order given and skips calls without a trend', () => {
    const history = [
      session(0, { '7': [4, 1], '5': [4, 0] }),
      session(1, { '7': [4, 2], '5': [4, 2], '3': [2, 1] }),
    ];
    expect(callTrends(history, [7, 3, 5]).map((t) => [t.label, t.direction])).toEqual([
      ['7', 'better'],
      ['5', 'better'],
    ]);
  });
});
