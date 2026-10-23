import { Tick, createScheduler } from '../scheduler';

beforeEach(() => {
  jest.useFakeTimers({ now: 0 });
});

afterEach(() => {
  jest.useRealTimers();
});

const clock = () => Date.now();

function collect() {
  const ticks: Tick[] = [];
  const firedAt: number[] = [];
  return {
    ticks,
    firedAt,
    onTick: (t: Tick) => {
      ticks.push(t);
      firedAt.push(Date.now());
    },
  };
}

describe('createScheduler', () => {
  it('ticks once per count at 120 BPM, starting immediately', () => {
    const c = collect();
    const s = createScheduler({ bpm: 120, onTick: c.onTick, now: clock });
    s.start();
    expect(c.ticks.map((t) => t.countIndex)).toEqual([0]);
    jest.advanceTimersByTime(2000);
    expect(c.ticks.map((t) => t.countIndex)).toEqual([0, 1, 2, 3, 4]);
    expect(c.firedAt).toEqual([0, 500, 1000, 1500, 2000]);
    expect(c.ticks.every((t) => t.lateMs === 0 && t.subdivision === 0)).toBe(true);
    s.stop();
  });

  it('does not accumulate drift when every timer fires late', () => {
    const c = collect();
    const JITTER = 7;
    const s = createScheduler({
      bpm: 100, // 600 ms per count
      onTick: c.onTick,
      now: clock,
      setTimer: (fn, ms) => setTimeout(fn, ms + JITTER),
    });
    s.start();
    jest.advanceTimersByTime(600 * 200 + JITTER);
    expect(c.ticks).toHaveLength(201);
    c.ticks.forEach((t, i) => {
      expect(t.targetTimeMs).toBe(i * 600);
      // Each tick is at most one jitter late — never 200 × 7 ms.
      expect(t.lateMs).toBeLessThanOrEqual(JITTER);
    });
    s.stop();
  });

  it('a naive chained setTimeout would drift (sanity check of the test setup)', () => {
    const fired: number[] = [];
    const step = () => {
      fired.push(Date.now());
      if (fired.length < 100) setTimeout(step, 600 + 7);
    };
    step();
    jest.advanceTimersByTime(600 * 100 * 2);
    expect(fired[99] - 99 * 600).toBe(99 * 7);
  });

  it('subdivides into "and" ticks', () => {
    const c = collect();
    const s = createScheduler({ bpm: 120, ticksPerCount: 2, onTick: c.onTick, now: clock });
    s.start();
    jest.advanceTimersByTime(1000);
    expect(c.ticks.map((t) => [t.countIndex, t.subdivision])).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 0],
    ]);
    expect(c.firedAt).toEqual([0, 250, 500, 750, 1000]);
    s.stop();
  });

  it('runs callbacks early by the lookahead but reports true target times', () => {
    const c = collect();
    const s = createScheduler({ bpm: 120, lookaheadMs: 100, onTick: c.onTick, now: clock });
    s.start(1000);
    expect(c.ticks).toHaveLength(0);
    jest.advanceTimersByTime(1400);
    expect(c.firedAt).toEqual([900, 1400]);
    expect(c.ticks.map((t) => t.targetTimeMs)).toEqual([1000, 1500]);
    expect(c.ticks[0].lateMs).toBe(-100);
    s.stop();
  });

  it('stops cleanly and can restart from tick 0', () => {
    const c = collect();
    const s = createScheduler({ bpm: 120, onTick: c.onTick, now: clock });
    s.start();
    jest.advanceTimersByTime(1000);
    s.stop();
    expect(s.running).toBe(false);
    jest.advanceTimersByTime(5000);
    expect(c.ticks).toHaveLength(3);
    expect(jest.getTimerCount()).toBe(0);
    s.start();
    expect(c.ticks[3].tick).toBe(0);
    expect(c.ticks[3].targetTimeMs).toBe(6000);
    s.stop();
  });

  it('changes tempo without jumping the next tick', () => {
    const c = collect();
    const s = createScheduler({ bpm: 120, onTick: c.onTick, now: clock });
    s.start();
    jest.advanceTimersByTime(1100); // ticks at 0, 500, 1000; next due 1500
    s.setBpm(60);
    jest.advanceTimersByTime(2400); // to 3500
    expect(c.firedAt).toEqual([0, 500, 1000, 1500, 2500, 3500]);
    expect(s.targetTimeOf(s.nextTick)).toBe(4500);
    s.stop();
  });

  it('skips ticks that are far too late instead of bursting them', () => {
    const c = collect();
    const skipped: number[][] = [];
    let stalled = false;
    const s = createScheduler({
      bpm: 120,
      onTick: c.onTick,
      onSkip: (ticks) => skipped.push(ticks),
      now: clock,
      // Simulate the JS thread stalling for 2.2 s once.
      setTimer: (fn, ms) => setTimeout(fn, !stalled && (stalled = true) ? ms + 2200 : ms),
    });
    s.start();
    jest.advanceTimersByTime(3500);
    // Tick 1 was due at 500 but ran at 2700: ticks 1–4 are > 500 ms late.
    expect(skipped).toEqual([[1, 2, 3, 4]]);
    expect(c.ticks.map((t) => t.tick)).toEqual([0, 5, 6, 7]);
    expect(c.firedAt).toEqual([0, 2700, 3000, 3500]);
    s.stop();
  });

  it('validates options', () => {
    const onTick = () => {};
    expect(() => createScheduler({ bpm: 10, onTick })).toThrow(RangeError);
    expect(() => createScheduler({ bpm: 120, ticksPerCount: 0, onTick })).toThrow(RangeError);
    expect(() => createScheduler({ bpm: 120, lookaheadMs: -1, onTick })).toThrow(RangeError);
  });
});
