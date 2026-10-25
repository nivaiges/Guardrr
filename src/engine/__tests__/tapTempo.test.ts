import { addTap, tapTempoBpm } from '../tapTempo';

const tapAll = (times: number[], options?: Parameters<typeof addTap>[2]) =>
  times.reduce<number[]>((taps, t) => addTap(taps, t, options), []);

describe('tap tempo', () => {
  it('needs two taps before it has a tempo', () => {
    expect(tapTempoBpm([])).toBeNull();
    expect(tapTempoBpm(tapAll([1000]))).toBeNull();
    expect(tapTempoBpm(tapAll([1000, 1500]))).toBe(120);
  });

  it('measures steady taps', () => {
    expect(tapTempoBpm(tapAll([0, 600, 1200, 1800]))).toBe(100);
    expect(tapTempoBpm(tapAll([0, 333, 667, 1000]))).toBe(180);
  });

  it('ignores one hesitant tap (median, not mean)', () => {
    // 500 ms intervals with one 900 ms gap: a mean would say ~102 BPM.
    expect(tapTempoBpm(tapAll([0, 500, 1000, 1900, 2400, 2900]))).toBe(120);
  });

  it('starts over after a long pause', () => {
    const taps = tapAll([0, 500, 1000, 5000]);
    expect(taps).toEqual([5000]);
    expect(tapTempoBpm(addTap(taps, 5400))).toBe(150);
  });

  it('starts over if the clock goes backwards or repeats', () => {
    expect(tapAll([1000, 1500, 1500])).toEqual([1500]);
    expect(tapAll([1000, 1500, 1200])).toEqual([1200]);
  });

  it('keeps only the most recent taps so tempo changes are followed', () => {
    const slow = [0, 1000, 2000, 3000];
    const fast = [3500, 4000, 4500, 5000, 5500, 6000];
    const taps = tapAll([...slow, ...fast], { maxTaps: 6 });
    expect(taps).toEqual(fast);
    expect(tapTempoBpm(taps)).toBe(120);
  });

  it('clamps to the supported BPM range', () => {
    expect(tapTempoBpm([0, 100])).toBe(400);
    expect(tapTempoBpm([0, 1900])).toBe(32);
    expect(tapTempoBpm(tapAll([0, 4000], { resetAfterMs: 5000 }))).toBe(20);
  });

  it('rejects bad input', () => {
    expect(() => addTap([], Number.NaN)).toThrow(RangeError);
    expect(() => addTap([], 0, { maxTaps: 1 })).toThrow(RangeError);
  });
});
