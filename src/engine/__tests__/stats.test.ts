import { CallSequence, DEFAULT_TOSS_SETTINGS, TossSettings } from '../announce';
import { cueForTick } from '../practice';
import { createRng } from '../random';
import {
  DROP_GRACE_COUNTS,
  EMPTY_STATS,
  STATS_HISTORY_LIMIT,
  SessionStats,
  dropButtonText,
  dropTarget,
  formatDuration,
  latestTossDropped,
  recordCue,
  summarizeStats,
  toggleDrop,
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
      [1, 2, 3, 4, 5].map((phrase) => ({
        phrase,
        call: calls.callFor(phrase),
        caught: true,
        // Count 1 of phrase p is the (16p + 1)th count played.
        releasedAtCount: 16 * phrase + 1,
      })),
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
    expect(stats.recent.at(-1)).toMatchObject({ phrase: phrases, call: calls.callFor(phrases) });
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

describe('drops', () => {
  it('does nothing before the first toss', () => {
    expect(toggleDrop(EMPTY_STATS)).toBe(EMPTY_STATS);
    expect(latestTossDropped(EMPTY_STATS)).toBe(false);
    const s = summarizeStats(EMPTY_STATS);
    expect(s.catchRate).toBeNull();
    expect(s.catchRateLabel).toBe('–');
  });

  it('marks the latest toss and a second tap undoes it', () => {
    const { stats } = play(DEFAULT_TOSS_SETTINGS, 16 * 4);
    expect(stats.tosses).toBeGreaterThanOrEqual(2);
    const last = stats.recent[stats.recent.length - 1];
    const dropped = toggleDrop(stats);
    expect(latestTossDropped(dropped)).toBe(true);
    expect(dropped.drops).toBe(1);
    expect(dropped.timesDropped).toEqual({ [String(last.call)]: 1 });
    // Earlier tosses are untouched.
    expect(dropped.recent.slice(0, -1)).toEqual(stats.recent.slice(0, -1));

    const undone = toggleDrop(dropped);
    expect(latestTossDropped(undone)).toBe(false);
    expect(undone.drops).toBe(0);
    expect(undone.timesDropped).toEqual({});
  });

  it('keeps drops when later cues are recorded and a new toss is releasable', () => {
    const settings: TossSettings = { ...DEFAULT_TOSS_SETTINGS, phraseLength: 8, leadCounts: 4 };
    const calls = new CallSequence(settings, createRng(1));
    let stats: SessionStats = EMPTY_STATS;
    let marked = false;
    for (let tick = 0; tick < 8 * 2 * 4; tick++) {
      const cue = cueForTick(
        { tick, countIndex: Math.floor(tick / 2), subdivision: tick % 2 },
        settings,
        calls,
      );
      stats = recordCue(stats, cue, tick * MS_PER_TICK);
      // Drop the first toss once, right after it is released.
      if (!marked && stats.tosses === 1) {
        stats = toggleDrop(stats);
        marked = true;
      }
    }
    expect(stats.tosses).toBe(3);
    expect(stats.drops).toBe(1);
    expect(stats.recent.map((r) => r.dropped === true)).toEqual([true, false, false]);
    // The newest toss isn't dropped, so Drop would mark it, not the first one.
    expect(latestTossDropped(stats)).toBe(false);
  });

  it('summarizes the catch rate, per-call drops and marks dropped tosses', () => {
    const stats: SessionStats = {
      ...EMPTY_STATS,
      tosses: 4,
      recent: [
        { phrase: 1, call: 5 },
        { phrase: 2, call: 7, dropped: true },
        { phrase: 3, call: 5 },
        { phrase: 4, call: 7, dropped: true },
      ],
      timesCalled: { '5': 2, '7': 2 },
      drops: 2,
      timesDropped: { '7': 2 },
    };
    const s = summarizeStats(stats);
    expect(s.drops).toBe(2);
    expect(s.catchRate).toBeCloseTo(0.5);
    expect(s.catchRateLabel).toBe('50%');
    expect(s.tally.map((t) => [t.label, t.times, t.drops])).toEqual([
      ['5', 2, 0],
      ['7', 2, 2],
    ]);
    expect(s.latest).toEqual(['7 ✗', '5', '7 ✗', '5']);
  });

  it('rounds the catch rate to a whole percent', () => {
    const s = summarizeStats({
      ...EMPTY_STATS,
      tosses: 3,
      drops: 1,
      recent: [{ phrase: 1, call: 5, dropped: true }],
      timesCalled: { '5': 3 },
      timesDropped: { '5': 1 },
    });
    expect(s.catchRateLabel).toBe('67%');
  });
});

describe('drop grace period', () => {
  // 8-count phrase, 7-count calls: caught on 7, the next release one count later.
  const settings: TossSettings = {
    ...DEFAULT_TOSS_SETTINGS,
    phraseLength: 8,
    leadCounts: 4,
    allowedTossCounts: [7],
    allowRepeats: true,
  };

  /** Play tick by tick, calling `each` after every count is recorded. */
  function playCounts(counts: number, each?: (stats: SessionStats) => SessionStats) {
    const calls = new CallSequence(settings, createRng(1));
    let stats: SessionStats = EMPTY_STATS;
    for (let tick = 0; tick < counts * 2; tick++) {
      const cue = cueForTick(
        { tick, countIndex: Math.floor(tick / 2), subdivision: tick % 2 },
        settings,
        calls,
      );
      stats = recordCue(stats, cue, tick * MS_PER_TICK);
      if (each && tick % 2 === 0) stats = each(stats);
    }
    return stats;
  }

  it('marks the latest toss when there is no earlier one, even in the air', () => {
    const stats = playCounts(9); // first release on count 9
    expect(stats.tosses).toBe(1);
    expect(dropTarget(stats)).toEqual({
      index: 0,
      toss: 1,
      call: 7,
      dropped: false,
      previous: false,
    });
    expect(latestTossDropped(toggleDrop(stats))).toBe(true);
  });

  it('marks the previous toss for DROP_GRACE_COUNTS counts after a release', () => {
    const atRelease = playCounts(17); // second release on count 17
    expect(atRelease.tosses).toBe(2);
    expect(dropTarget(atRelease)).toMatchObject({ index: 0, toss: 1, previous: true });
    const marked = toggleDrop(atRelease);
    expect(marked.recent.map((r) => r.dropped === true)).toEqual([true, false]);
    expect(marked.timesDropped).toEqual({ '7': 1 });
    // A second tap still in the grace period undoes it.
    expect(toggleDrop(marked).drops).toBe(0);

    const stillGrace = playCounts(16 + DROP_GRACE_COUNTS);
    expect(dropTarget(stillGrace)).toMatchObject({ toss: 1, previous: true });
    const after = playCounts(17 + DROP_GRACE_COUNTS);
    expect(dropTarget(after)).toMatchObject({ index: 1, toss: 2, previous: false });
  });

  it('ends the grace period as soon as the new toss is caught', () => {
    const pop: TossSettings = { ...settings, allowedTossCounts: [1] };
    const calls = new CallSequence(pop, createRng(1));
    let stats: SessionStats = EMPTY_STATS;
    // Through the "and" of count 17: the second "1" is caught there.
    for (let tick = 0; tick < 17 * 2; tick++) {
      const cue = cueForTick(
        { tick, countIndex: Math.floor(tick / 2), subdivision: tick % 2 },
        pop,
        calls,
      );
      stats = recordCue(stats, cue, tick * MS_PER_TICK);
    }
    expect(stats.tosses).toBe(2);
    expect(stats.recent[1].caught).toBe(true);
    expect(dropTarget(stats)).toMatchObject({ toss: 2, previous: false });
  });

  it('keeps an earlier mark when the grace period ends', () => {
    let done = false;
    const stats = playCounts(32, (s) => {
      if (!done && s.tosses === 2) {
        done = true;
        return toggleDrop(s);
      }
      return s;
    });
    expect(stats.tosses).toBe(3);
    expect(stats.recent.map((r) => r.dropped === true)).toEqual([true, false, false]);
    expect(stats.drops).toBe(1);
  });

  it('counts the toss number past the kept history', () => {
    const stats: SessionStats = {
      ...EMPTY_STATS,
      countsPlayed: 100,
      tosses: 60,
      recent: [
        { phrase: 59, call: 3, caught: true, releasedAtCount: 90 },
        { phrase: 60, call: 5, releasedAtCount: 100 },
      ],
      timesCalled: { '3': 30, '5': 30 },
    };
    expect(dropTarget(stats)).toMatchObject({ index: 0, toss: 59, call: 3, previous: true });
  });

  it('describes the target on the button', () => {
    expect(dropButtonText(EMPTY_STATS)).toBeNull();
    const latest = playCounts(9);
    expect(dropButtonText(latest)).toEqual({
      label: 'Drop',
      detail: null,
      hint: 'Marks the latest toss (7) as dropped',
    });
    const grace = playCounts(17);
    expect(dropButtonText(grace)).toEqual({
      label: 'Drop',
      detail: 'toss 1 · 7',
      hint: 'Marks the previous toss (7) as dropped',
    });
    expect(dropButtonText(toggleDrop(grace))).toEqual({
      label: 'Undo drop',
      detail: 'toss 1 · 7',
      hint: 'Counts the previous toss (7) as caught again',
    });
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
