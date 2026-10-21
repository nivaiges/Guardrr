import {
  countIndexAt,
  countIndexOf,
  countStartTime,
  countsUntilNextDownbeat,
  msPerCount,
  phrasePosition,
} from '../timing';

describe('msPerCount', () => {
  it('converts bpm to milliseconds per count', () => {
    expect(msPerCount(60)).toBe(1000);
    expect(msPerCount(120)).toBe(500);
    expect(msPerCount(90)).toBeCloseTo(666.667, 3);
  });

  it('rejects out-of-range or non-finite bpm', () => {
    expect(() => msPerCount(0)).toThrow(RangeError);
    expect(() => msPerCount(19)).toThrow(RangeError);
    expect(() => msPerCount(401)).toThrow(RangeError);
    expect(() => msPerCount(Number.NaN)).toThrow(RangeError);
  });
});

describe('countStartTime', () => {
  it('is computed from the start time, not accumulated', () => {
    expect(countStartTime(0, 120, 1000)).toBe(1000);
    expect(countStartTime(4, 120, 1000)).toBe(3000);
    // 10,000 counts at 90 bpm — no accumulated float drift
    expect(countStartTime(10_000, 90)).toBeCloseTo((10_000 * 60_000) / 90, 6);
  });

  it('rejects negative or fractional count indices', () => {
    expect(() => countStartTime(-1, 120)).toThrow(RangeError);
    expect(() => countStartTime(1.5, 120)).toThrow(RangeError);
  });
});

describe('countIndexAt', () => {
  it('returns -1 before the first count', () => {
    expect(countIndexAt(-1, 120)).toBe(-1);
  });

  it('maps elapsed time to the sounding count', () => {
    expect(countIndexAt(0, 120)).toBe(0);
    expect(countIndexAt(499, 120)).toBe(0);
    expect(countIndexAt(500, 120)).toBe(1);
    expect(countIndexAt(7_999, 120)).toBe(15);
  });

  it('resolves exact boundaries to the new count despite float error', () => {
    const t = countStartTime(3, 90);
    expect(countIndexAt(t, 90)).toBe(3);
  });

  it('round-trips with countStartTime', () => {
    for (let i = 0; i < 200; i++) {
      expect(countIndexAt(countStartTime(i, 137), 137)).toBe(i);
    }
  });
});

describe('phrasePosition', () => {
  it('maps count indices onto a 16-count phrase', () => {
    expect(phrasePosition(0, 16)).toEqual({
      phrase: 0,
      count: 1,
      isDownbeat: true,
      isLastCount: false,
    });
    expect(phrasePosition(15, 16)).toEqual({
      phrase: 0,
      count: 16,
      isDownbeat: false,
      isLastCount: true,
    });
    expect(phrasePosition(16, 16)).toMatchObject({ phrase: 1, count: 1, isDownbeat: true });
    expect(phrasePosition(37, 16)).toMatchObject({ phrase: 2, count: 6 });
  });

  it('supports other phrase lengths', () => {
    expect(phrasePosition(8, 8)).toMatchObject({ phrase: 1, count: 1 });
    expect(phrasePosition(31, 32)).toMatchObject({ phrase: 0, count: 32, isLastCount: true });
  });

  it('treats a 1-count phrase as all downbeats', () => {
    expect(phrasePosition(5, 1)).toEqual({
      phrase: 5,
      count: 1,
      isDownbeat: true,
      isLastCount: true,
    });
  });

  it('rejects invalid phrase lengths', () => {
    expect(() => phrasePosition(0, 0)).toThrow(RangeError);
    expect(() => phrasePosition(0, 65)).toThrow(RangeError);
    expect(() => phrasePosition(0, 7.5)).toThrow(RangeError);
  });
});

describe('countIndexOf', () => {
  it('is the inverse of phrasePosition', () => {
    for (let i = 0; i < 100; i++) {
      const { phrase, count } = phrasePosition(i, 16);
      expect(countIndexOf(phrase, count, 16)).toBe(i);
    }
  });

  it('rejects counts outside the phrase', () => {
    expect(() => countIndexOf(0, 0, 16)).toThrow(RangeError);
    expect(() => countIndexOf(0, 17, 16)).toThrow(RangeError);
    expect(() => countIndexOf(-1, 1, 16)).toThrow(RangeError);
  });
});

describe('countsUntilNextDownbeat', () => {
  it('counts down to the next release', () => {
    expect(countsUntilNextDownbeat(15, 16)).toBe(1); // on 16, next count is 1
    expect(countsUntilNextDownbeat(12, 16)).toBe(4); // on 13
    expect(countsUntilNextDownbeat(0, 16)).toBe(16); // on 1, next release is a phrase away
  });
});
