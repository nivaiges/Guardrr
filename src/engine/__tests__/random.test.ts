import { createRng, normalizeTossCounts, pickTossCount, tossCountsInRange } from '../random';

describe('createRng', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, a);
    const seqB = Array.from({ length: 20 }, b);
    expect(seqA).toEqual(seqB);
  });

  it('differs between seeds and stays in [0, 1)', () => {
    const a = Array.from({ length: 1000 }, createRng(1));
    const b = Array.from({ length: 1000 }, createRng(2));
    expect(a).not.toEqual(b);
    for (const x of [...a, ...b]) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('rejects non-finite seeds', () => {
    expect(() => createRng(Number.NaN)).toThrow(RangeError);
  });
});

describe('tossCountsInRange', () => {
  it('builds an inclusive range', () => {
    expect(tossCountsInRange(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(tossCountsInRange(3, 3)).toEqual([3]);
  });

  it('rejects invalid ranges', () => {
    expect(() => tossCountsInRange(0, 5)).toThrow(RangeError);
    expect(() => tossCountsInRange(5, 4)).toThrow(RangeError);
    expect(() => tossCountsInRange(1.5, 4)).toThrow(RangeError);
  });
});

describe('normalizeTossCounts', () => {
  it('dedupes and sorts', () => {
    expect(normalizeTossCounts([5, 3, 5, 1])).toEqual([1, 3, 5]);
  });

  it('rejects empty sets and bad values', () => {
    expect(() => normalizeTossCounts([])).toThrow(RangeError);
    expect(() => normalizeTossCounts([0, 2])).toThrow(RangeError);
    expect(() => normalizeTossCounts([2.25])).toThrow(RangeError);
    expect(() => normalizeTossCounts([0.5])).toThrow(RangeError);
    expect(() => normalizeTossCounts([NaN])).toThrow(RangeError);
  });

  it('accepts "and" calls in half-count steps', () => {
    expect(normalizeTossCounts([3, 2.5, 2, 2.5])).toEqual([2, 2.5, 3]);
  });
});

describe('pickTossCount', () => {
  it('only returns allowed counts and covers all of them', () => {
    const rng = createRng(7);
    const allowed = [2, 4, 6];
    const seen = new Set<number>();
    for (let i = 0; i < 300; i++) {
      const n = pickTossCount(allowed, rng);
      expect(allowed).toContain(n);
      seen.add(n);
    }
    expect(seen).toEqual(new Set(allowed));
  });

  it('is roughly uniform', () => {
    const rng = createRng(123);
    const counts = new Map<number, number>();
    const draws = 7000;
    for (let i = 0; i < draws; i++) {
      const n = pickTossCount(tossCountsInRange(1, 7), rng);
      counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    for (const c of counts.values()) {
      expect(c).toBeGreaterThan(800);
      expect(c).toBeLessThan(1200);
    }
  });

  it('never repeats the previous call when repeats are disabled', () => {
    const rng = createRng(99);
    let previous: number | undefined;
    for (let i = 0; i < 500; i++) {
      const n = pickTossCount([1, 2, 3], rng, { previous, allowRepeats: false });
      expect(n).not.toBe(previous);
      previous = n;
    }
  });

  it('allows repeats by default', () => {
    // An rng stuck at 0 always picks the first candidate.
    const zero = () => 0;
    expect(pickTossCount([4, 5], zero, { previous: 4 })).toBe(4);
    expect(pickTossCount([4, 5], zero, { previous: 4, allowRepeats: false })).toBe(5);
  });

  it('returns the only option even if it repeats', () => {
    expect(pickTossCount([5], createRng(1), { previous: 5, allowRepeats: false })).toBe(5);
  });

  it('clamps an rng that returns exactly 1', () => {
    expect(pickTossCount([1, 2, 3], () => 1)).toBe(3);
  });
});
