import { CallSequence, DEFAULT_TOSS_SETTINGS, TossSettings } from '../announce';
import { cueForTick } from '../practice';
import { createRng } from '../random';
import {
  EMPTY_STATS,
  STATS_HISTORY_LIMIT,
  SessionStats,
  formatDuration,
  recordCue,
  summarizeStats,
} from '../stats';

const MS_PER_TICK = 250; // 120 BPM, two ticks per count

/** Play `counts` counts (with "and" ticks) and fold every cue into stats. */
function play(settings: TossSettings, counts: number, seed = 3) {
  const calls = new CallSequence(settings, createRng(seed));
  let stats: SessionStats = EMPTY_STATS;
  for (let tick = 0; tick < counts * 2; tick++) {
    const cue = cueForTick(
      { tick, countIndex: Math.floor(tick / 2), subdivision: tick % 2 },
      settings,
      calls,
    );
    stats = recordCue(stats, cue, 1000 + tick * MS_PER_TICK);
  }
  return { stats, calls };
}

describe('session stats', () => {
  it('starts empty', () => {
    const s = summarizeStats(EMPTY_STATS);
    expect(s).toMatchObject({ tosses: 0, catches: 0, durationMs: 0, duration: '0:00' });
    expect(s.tally).toEqual([]);
    expect(s.mostCalled).toEqual([]);
    expect(s.latest).toEqual([]);
  });

  it('counts nothing during the lead-in phrase', () => {
    const { stats } = play(DEFAULT_TOSS_SETTINGS, 16);
    expect(stats.countsPlayed).toBe(16);
    expect(stats.tosses).toBe(0);
    expect(stats.recent).toEqual([]);
  });

  it('records one toss per phrase after the lead-in, with the called count', () => {
    const { stats, calls } = play(DEFAULT_TOSS_SETTINGS, 16 * 6);
    expect(stats.tosses).toBe(5);
    expect(stats.catches).toBe(5);
    expect(stats.recent).toEqual(
      [1, 2, 3, 4, 5].map((phrase) => ({ phrase, call: calls.callFor(phrase) })),
    );
    const total = Object.values(stats.timesCalled).reduce((a, b) => a + b, 0);
    expect(total).toBe(5);
  });

  it('counts a toss as released on count 1 even if the session stops before the catch', () => {
    // Lead-in (16) + count 1 of phrase 1 only.
    const { stats } = play(DEFAULT_TOSS_SETTINGS, 17);
    expect(stats.tosses).toBe(1);
    expect(stats.catches).toBe(0);
  });

  it('counts "and" catches and pop tosses', () => {
    const settings: TossSettings = { ...DEFAULT_TOSS_SETTINGS, allowedTossCounts: [1, 2.5] };
    const { stats } = play(settings, 16 * 11);
    expect(stats.tosses).toBe(10);
    expect(stats.catches).toBe(10);
    expect(Object.keys(stats.timesCalled).sort()).toEqual(['1', '2.5']);
  });

  it('measures elapsed time from the first cue to the last', () => {
    const { stats } = play(DEFAULT_TOSS_SETTINGS, 16 * 2);
    // 64 ticks from t=1000; the last one is a silent "and", so the last
    // recorded cue is tick 62 (the final count).
    expect(summarizeStats(stats).durationMs).toBe(62 * MS_PER_TICK);
    expect(summarizeStats(stats).duration).toBe('0:15');
  });

  it('keeps only the latest tosses in the history but tallies all of them', () => {
    const settings: TossSettings = { ...DEFAULT_TOSS_SETTINGS, phraseLength: 8 };
    const phrases = STATS_HISTORY_LIMIT + 10;
    const { stats, calls } = play(settings, 8 * (phrases + 1));
    expect(stats.tosses).toBe(phrases);
    expect(stats.recent).toHaveLength(STATS_HISTORY_LIMIT);
    expect(stats.recent[0].phrase).toBe(11);
    expect(stats.recent.at(-1)).toEqual({ phrase: phrases, call: calls.callFor(phrases) });
    const total = Object.values(stats.timesCalled).reduce((a, b) => a + b, 0);
    expect(total).toBe(phrases);
  });

  it('returns the same object for silent "and" ticks', () => {
    const calls = new CallSequence(DEFAULT_TOSS_SETTINGS, createRng(1));
    const cue = cueForTick(
      { tick: 1, countIndex: 0, subdivision: 1 },
      DEFAULT_TOSS_SETTINGS,
      calls,
    );
    expect(recordCue(EMPTY_STATS, cue, 0)).toBe(EMPTY_STATS);
  });

  it('summarizes the tally, the most called and the latest tosses', () => {
    const stats: SessionStats = {
      ...EMPTY_STATS,
      startedAtMs: 0,
      lastCueAtMs: 125_000,
      tosses: 5,
      recent: [
        { phrase: 1, call: 5 },
        { phrase: 2, call: 2.5 },
        { phrase: 3, call: 5 },
        { phrase: 4, call: 3 },
        { phrase: 5, call: 3 },
      ],
      timesCalled: { '5': 2, '2.5': 1, '3': 2 },
    };
    const s = summarizeStats(stats, 3);
    expect(s.duration).toBe('2:05');
    expect(s.tally.map((t) => [t.label, t.times])).toEqual([
      ['2 and', 1],
      ['3', 2],
      ['5', 2],
    ]);
    expect(s.tally[1].share).toBeCloseTo(0.4);
    expect(s.mostCalled).toEqual([3, 5]);
    expect(s.latest).toEqual(['3', '3', '5']);
  });
});

describe('formatDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(59_999)).toBe('0:59');
    expect(formatDuration(61_000)).toBe('1:01');
    expect(formatDuration(3_600_000 + 5 * 60_000 + 7_000)).toBe('1:05:07');
  });

  it('treats negative and invalid input as zero', () => {
    expect(formatDuration(-5)).toBe('0:00');
    expect(formatDuration(NaN)).toBe('0:00');
  });
});
