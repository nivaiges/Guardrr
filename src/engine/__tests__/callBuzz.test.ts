import {
  DEFAULT_TOSS_SETTINGS,
  callBuzzNote,
  MAX_COUNT_PULSES,
  PULSE_GAP_MAX_MS,
  PULSE_GAP_MIN_MS,
  callBuzzStyleLabel,
  callPulsePattern,
  callsTooLongToBuzz,
  isCallBuzzStyle,
} from '..';

const atMs = (pulses: ReturnType<typeof callPulsePattern>) => pulses?.map((p) => p.atMs);

describe('callPulsePattern', () => {
  it('buzzes a 5 as five even pulses at the widest gap when there is room', () => {
    // 120 BPM, 4 lead counts: 2000 ms − half a count = 1750 ms for 4 gaps.
    const pulses = callPulsePattern(5, 120, 4);
    expect(atMs(pulses)).toEqual([0, 200, 400, 600, 800]);
    expect(pulses?.every((p) => p.strength === 'medium')).toBe(true);
  });

  it('adds a lighter pulse after a double gap for an "and" call', () => {
    const pulses = callPulsePattern(3.5, 120, 4);
    expect(pulses).toEqual([
      { atMs: 0, strength: 'medium' },
      { atMs: 200, strength: 'medium' },
      { atMs: 400, strength: 'medium' },
      { atMs: 800, strength: 'light' },
    ]);
  });

  it('buzzes a pop toss as a single pulse, whatever the tempo', () => {
    expect(callPulsePattern(1, 400, 1)).toEqual([{ atMs: 0, strength: 'medium' }]);
  });

  it('squeezes the pulses closer at fast tempos and ends half a count before the release', () => {
    // Quads 155: 4 lead counts ≈ 1548 ms; minus half a count ≈ 1355 ms. A 5 fits at 200 ms.
    expect(atMs(callPulsePattern(5, 155, 4))).toEqual([0, 200, 400, 600, 800]);
    // 2 lead counts at 155: ≈ 581 ms for 4 gaps → 145 ms apart.
    const tight = callPulsePattern(5, 155, 2)!;
    const gap = tight[1].atMs;
    expect(gap).toBeGreaterThanOrEqual(PULSE_GAP_MIN_MS);
    expect(gap).toBeLessThan(PULSE_GAP_MAX_MS);
    const releaseAt = (2 * 60000) / 155;
    expect(tight[tight.length - 1].atMs).toBeLessThanOrEqual(releaseAt - 60000 / 155 / 2);
  });

  it('gives up (double buzz) when the pulses would blur together', () => {
    // 1 lead count at 155: ≈ 194 ms for 4 gaps (≈ 193 ms for a 2).
    expect(callPulsePattern(5, 155, 1)).toBeNull();
    expect(callPulsePattern(2, 155, 1)).toEqual([
      { atMs: 0, strength: 'medium' },
      { atMs: 193, strength: 'medium' },
    ]);
  });

  it('gives up on calls too long to count by feel', () => {
    expect(callPulsePattern(MAX_COUNT_PULSES, 60, 8)).not.toBeNull();
    expect(callPulsePattern(MAX_COUNT_PULSES + 1, 60, 8)).toBeNull();
  });

  it('rejects calls that are not calls', () => {
    expect(() => callPulsePattern(0, 120, 4)).toThrow(RangeError);
    expect(() => callPulsePattern(2.25, 120, 4)).toThrow(RangeError);
  });
});

describe('callsTooLongToBuzz', () => {
  it('lists the calls that fall back to the double buzz', () => {
    expect(callsTooLongToBuzz([3, 3.5, 4, 4.5, 5], 155, 4)).toEqual([]);
    expect(callsTooLongToBuzz([1, 2, 3, 5, 7], 155, 1)).toEqual([3, 5, 7]);
  });
});

describe('call buzz style', () => {
  it('recognizes the two styles and labels them', () => {
    expect(isCallBuzzStyle('double')).toBe(true);
    expect(isCallBuzzStyle('count')).toBe(true);
    expect(isCallBuzzStyle('numbers')).toBe(false);
    expect(callBuzzStyleLabel('double')).toBe('Double buzz');
    expect(callBuzzStyleLabel('count')).toBe('Buzz the number');
  });
});

describe('callBuzzNote', () => {
  const quads = { ...DEFAULT_TOSS_SETTINGS, leadCounts: 4, allowedTossCounts: [3, 3.5, 4, 4.5, 5] };

  it('says nothing for the double buzz', () => {
    expect(callBuzzNote('double', quads, 155)).toBeNull();
  });

  it('explains the taps when every call fits', () => {
    expect(callBuzzNote('count', quads, 155)).toBe(
      'A 5 is five taps; an "and" call adds a lighter tap after a pause.',
    );
    expect(callBuzzNote('count', { ...quads, allowedTossCounts: [3, 4, 5] }, 155)).toBe(
      'A 5 is five taps.',
    );
  });

  it('names the calls that fall back to the double buzz', () => {
    const tight = { ...DEFAULT_TOSS_SETTINGS, leadCounts: 1, allowedTossCounts: [1, 2, 3, 5] };
    expect(callBuzzNote('count', tight, 155)).toBe(
      "Calls 3 and 5 don't fit as taps before the release at 155 BPM, so they get the double buzz.",
    );
    expect(callBuzzNote('count', { ...tight, allowedTossCounts: [2, 3] }, 155)).toBe(
      "Call 3 doesn't fit as taps before the release at 155 BPM, so it gets the double buzz.",
    );
  });

  it('sums up calls too long to tap out at any tempo', () => {
    const full = { ...DEFAULT_TOSS_SETTINGS, leadCounts: 4, allowedTossCounts: [3, 5, 9, 12] };
    expect(callBuzzNote('count', full, 120)).toBe(
      'A 5 is five taps. Calls over 8 counts get the double buzz (too many taps to count).',
    );
    const tight = { ...full, leadCounts: 1, allowedTossCounts: [2, 3, 9] };
    expect(callBuzzNote('count', tight, 155)).toBe(
      "Call 3 doesn't fit as taps before the release at 155 BPM, so it gets the double buzz. Calls over 8 counts get the double buzz (too many taps to count).",
    );
  });

  it('says so when no call fits', () => {
    const tight = { ...DEFAULT_TOSS_SETTINGS, leadCounts: 1, allowedTossCounts: [4, 5] };
    expect(callBuzzNote('count', tight, 155)).toMatch(/^No call fits as taps/);
  });

  it('ignores calls that never fit the phrase', () => {
    const short = {
      ...DEFAULT_TOSS_SETTINGS,
      phraseLength: 8,
      leadCounts: 4,
      allowedTossCounts: [3, 9],
    };
    expect(callBuzzNote('count', short, 120)).toBe('A 5 is five taps.');
  });
});
