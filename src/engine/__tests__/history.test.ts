import {
  HISTORY_LIMIT,
  MAX_RECORD_PRESET_LENGTH,
  SessionRecord,
  formatSessionDate,
  parseStoredHistory,
  serializeHistory,
  sessionRecord,
  summarizeHistory,
  upsertSession,
} from '../history';
import { EMPTY_STATS, SessionStats } from '../stats';

const NOW = new Date(2026, 10, 1, 18, 30).getTime(); // Nov 1 2026, 6:30 PM local

function record(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    startedAt: NOW - 3_600_000,
    durationMs: 300_000,
    bpm: 120,
    phraseLength: 16,
    tosses: 4,
    drops: 1,
    timesCalled: { '3': 1, '5': 3 },
    timesDropped: { '5': 1 },
    ...overrides,
  };
}

describe('sessionRecord', () => {
  const stats: SessionStats = {
    ...EMPTY_STATS,
    startedAtMs: 1000,
    lastCueAtMs: 61_000,
    countsPlayed: 120,
    tosses: 4,
    catches: 4,
    timesCalled: { '3': 1, '5': 3 },
    drops: 1,
    timesDropped: { '5': 1 },
  };

  it('keeps the totals, per-call counts and the session context', () => {
    expect(sessionRecord(stats, { startedAt: 42, bpm: 132, phraseLength: 8 })).toEqual({
      startedAt: 42,
      durationMs: 60_000,
      bpm: 132,
      phraseLength: 8,
      tosses: 4,
      drops: 1,
      timesCalled: { '3': 1, '5': 3 },
      timesDropped: { '5': 1 },
    });
  });

  it('rounds the duration to whole milliseconds (the clock is sub-millisecond)', () => {
    const precise = { ...stats, startedAtMs: 1000.25, lastCueAtMs: 9003.45 };
    expect(sessionRecord(precise, { startedAt: 1, bpm: 120, phraseLength: 16 })?.durationMs).toBe(
      8003,
    );
  });

  it('is null when nothing was tossed', () => {
    expect(sessionRecord(EMPTY_STATS, { startedAt: 1, bpm: 120, phraseLength: 16 })).toBeNull();
    const leadInOnly = { ...EMPTY_STATS, startedAtMs: 0, lastCueAtMs: 4000, countsPlayed: 8 };
    expect(sessionRecord(leadInOnly, { startedAt: 1, bpm: 120, phraseLength: 16 })).toBeNull();
  });
});

describe('upsertSession', () => {
  it('puts the newest session first', () => {
    const older = record({ startedAt: 100 });
    const newer = record({ startedAt: 200 });
    expect(upsertSession([older], newer).map((r) => r.startedAt)).toEqual([200, 100]);
    expect(upsertSession([newer], older).map((r) => r.startedAt)).toEqual([200, 100]);
  });

  it('replaces a session with the same start time (a drop marked after Stop)', () => {
    const before = record({ startedAt: 100, drops: 0, timesDropped: {} });
    const after = record({ startedAt: 100 });
    const history = upsertSession([before, record({ startedAt: 50 })], after);
    expect(history).toHaveLength(2);
    expect(history[0]).toBe(after);
  });

  it('forgets the oldest sessions past the limit', () => {
    let history: SessionRecord[] = [];
    for (let i = 1; i <= HISTORY_LIMIT + 5; i++)
      history = upsertSession(history, record({ startedAt: i }));
    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history[0].startedAt).toBe(HISTORY_LIMIT + 5);
    expect(history[history.length - 1].startedAt).toBe(6);
    expect(upsertSession(history, record({ startedAt: 999 }), 2)).toHaveLength(2);
  });
});

describe('stored history', () => {
  it('round-trips', () => {
    const history = [
      record({ startedAt: 300 }),
      record({ startedAt: 200, timesCalled: { '1.5': 4 }, timesDropped: { '1.5': 1 } }),
    ];
    expect(parseStoredHistory(serializeHistory(history))).toEqual(history);
  });

  it.each([null, undefined, '', 'not json', '[]', '{"sessions":5}', '42'])(
    'reads %p as no history',
    (json) => {
      expect(parseStoredHistory(json as string | null)).toEqual([]);
    },
  );

  it('skips unreadable or inconsistent records and keeps the rest', () => {
    const good = record({ startedAt: 500 });
    const bad = [
      null,
      'session',
      record({ startedAt: -1 }),
      record({ startedAt: 1.5 }),
      record({ bpm: 0 }),
      record({ phraseLength: 0 }),
      record({ tosses: 0, drops: 0, timesCalled: {}, timesDropped: {} }),
      record({ tosses: 5 }), // per-call counts add up to 4
      record({ drops: 2 }), // per-call drops add up to 1
      record({ timesCalled: { '3': 1, '99': 3 } }), // 99 isn't a valid call
      record({ timesDropped: { '3': 2 }, timesCalled: { '3': 1, '5': 3 }, drops: 2 }), // more drops than tosses of 3
      record({ timesCalled: { '3': 1, '5': 2.5 } }),
      { ...record(), timesCalled: undefined },
    ];
    const json = JSON.stringify({ version: 1, sessions: [good, ...bad] });
    expect(parseStoredHistory(json)).toEqual([good]);
  });

  it('reads a fractional duration (saved by an earlier build) as whole milliseconds', () => {
    const json = JSON.stringify({ version: 1, sessions: [record({ durationMs: 8003.2 })] });
    expect(parseStoredHistory(json)).toEqual([record({ durationMs: 8003 })]);
  });

  it('sorts newest first and drops duplicate start times', () => {
    const json = JSON.stringify({
      version: 1,
      sessions: [
        record({ startedAt: 1, bpm: 100 }),
        record({ startedAt: 3 }),
        record({ startedAt: 1, bpm: 90 }),
      ],
    });
    const history = parseStoredHistory(json);
    expect(history.map((r) => r.startedAt)).toEqual([3, 1]);
    expect(history[1].bpm).toBe(100);
  });
});

describe('formatSessionDate', () => {
  it('says today / yesterday with a 12-hour time', () => {
    expect(formatSessionDate(new Date(2026, 10, 1, 9, 5).getTime(), NOW)).toBe('Today 9:05 AM');
    expect(formatSessionDate(new Date(2026, 10, 1, 0, 0).getTime(), NOW)).toBe('Today 12:00 AM');
    expect(formatSessionDate(new Date(2026, 9, 31, 12, 30).getTime(), NOW)).toBe(
      'Yesterday 12:30 PM',
    );
  });

  it('gives the date for older sessions, with the year only when it differs', () => {
    expect(formatSessionDate(new Date(2026, 9, 28, 19, 0).getTime(), NOW)).toBe('Oct 28 7:00 PM');
    expect(formatSessionDate(new Date(2025, 11, 30, 19, 0).getTime(), NOW)).toBe(
      'Dec 30, 2025 7:00 PM',
    );
  });
});

describe('summarizeHistory', () => {
  it('is empty with no sessions', () => {
    const s = summarizeHistory([], NOW);
    expect(s).toMatchObject({
      sessions: 0,
      tosses: 0,
      catchRate: null,
      caught: '–',
      totalDuration: '0:00',
    });
    expect(s.calls).toEqual([]);
    expect(s.hardest).toEqual([]);
    expect(s.rows).toEqual([]);
  });

  it('totals every session and the catch rate per call', () => {
    const history = [
      record({
        startedAt: NOW - 1000,
        durationMs: 60_000,
        tosses: 4,
        drops: 2,
        timesCalled: { '5': 2, '7': 2 },
        timesDropped: { '5': 1, '7': 1 },
      }),
      record({
        startedAt: NOW - 90_000_000,
        durationMs: 120_000,
        tosses: 6,
        drops: 1,
        timesCalled: { '3': 4, '5': 2 },
        timesDropped: { '5': 1 },
      }),
    ];
    const s = summarizeHistory(history, NOW);
    expect(s).toMatchObject({
      sessions: 2,
      tosses: 10,
      drops: 3,
      catchRate: 0.7,
      caught: '70%',
      totalDuration: '3:00',
    });
    expect(s.calls.map((c) => [c.label, c.times, c.drops, c.caught])).toEqual([
      ['3', 4, 0, '100%'],
      ['5', 4, 2, '50%'],
      ['7', 2, 1, '50%'],
    ]);
    // Worst catch rate first; ties go to the call tossed more often.
    expect(s.hardest.map((c) => c.call)).toEqual([5, 7]);
    expect(s.rows.map((r) => [r.date, r.tosses, r.caught, r.duration])).toEqual([
      ['Today 6:29 PM', 4, '50%', '1:00'],
      ['Yesterday 5:30 PM', 6, '83%', '2:00'],
    ]);
  });

  it('lists only the newest rows but totals them all', () => {
    const history = Array.from({ length: 15 }, (_, i) => record({ startedAt: NOW - i * 1000 }));
    const s = summarizeHistory(history, NOW, 10);
    expect(s.rows).toHaveLength(10);
    expect(s.rows[0].startedAt).toBe(NOW);
    expect(s.sessions).toBe(15);
    expect(s.tosses).toBe(60);
  });
});

describe('preset names in records', () => {
  const stats: SessionStats = {
    ...EMPTY_STATS,
    startedAtMs: 0,
    lastCueAtMs: 10_000,
    tosses: 2,
    catches: 2,
    timesCalled: { '4': 2 },
  };
  const context = { startedAt: 5, bpm: 155, phraseLength: 16 };

  it('keeps the preset the drill matched', () => {
    expect(sessionRecord(stats, { ...context, preset: 'Quads 155' })?.preset).toBe('Quads 155');
  });

  it('leaves the preset out for hand-tuned settings', () => {
    for (const preset of [undefined, null, '', '   ']) {
      const r = sessionRecord(stats, { ...context, preset });
      expect(r).not.toHaveProperty('preset');
    }
  });

  it('tidies whitespace and caps very long names', () => {
    expect(sessionRecord(stats, { ...context, preset: '  My   drill ' })?.preset).toBe('My drill');
    expect(sessionRecord(stats, { ...context, preset: 'x'.repeat(100) })?.preset).toHaveLength(
      MAX_RECORD_PRESET_LENGTH,
    );
  });

  it('survives a save and load, and older records without one still load', () => {
    const withPreset = record({ startedAt: 2, preset: 'Quick 8' });
    const without = record({ startedAt: 1 });
    const loaded = parseStoredHistory(serializeHistory([withPreset, without]));
    expect(loaded).toEqual([withPreset, without]);
    expect(loaded[1]).not.toHaveProperty('preset');
  });

  it('ignores a stored preset that is not a name instead of dropping the session', () => {
    const json = JSON.stringify({ version: 1, sessions: [{ ...record(), preset: 42 }] });
    const [loaded] = parseStoredHistory(json);
    expect(loaded).toEqual(record());
  });

  it('shows the preset on history rows (null when there is none)', () => {
    const rows = summarizeHistory(
      [record({ startedAt: 2, preset: 'Quick 8' }), record({ startedAt: 1 })],
      NOW,
    ).rows;
    expect(rows.map((r) => r.preset)).toEqual(['Quick 8', null]);
  });
});
