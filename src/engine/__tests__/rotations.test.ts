import { TossSettings } from '../announce';
import { callLabel } from '../calls';
import {
  CALL_NAMINGS,
  DEFAULT_CALL_NAMING,
  DEFAULT_ROTATION_MAP,
  ROTATIONS,
  ROTATION_CALL_CHOICES,
  RotationMap,
  callNamingLabel,
  isCallNaming,
  isValidRotationMap,
  parseStoredRotationMap,
  rotationCalls,
  rotationChoiceIndex,
  rotationChoiceLimits,
  rotationForCall,
  rotationLabel,
  unnamedCallsNote,
  usesRotationCalls,
  withRotationCalls,
  withRotationChoice,
} from '../rotations';

const quads: TossSettings = {
  phraseLength: 16,
  leadCounts: 4,
  allowedTossCounts: [3, 3.5, 4, 4.5, 5],
  allowRepeats: true,
};

describe('rotation names', () => {
  it('says calls as counts unless the performer picks rotations', () => {
    expect(DEFAULT_CALL_NAMING).toBe('counts');
    expect(CALL_NAMINGS.map(callNamingLabel)).toEqual(['Counts', 'Rotations']);
    expect(isCallNaming('rotations')).toBe(true);
    for (const v of ['Rotations', 'names', '', null, 1]) expect(isCallNaming(v)).toBe(false);
  });

  it("defaults to The DrillMaster's map: single 2, double 2&, triple 3, quad 3&", () => {
    expect(ROTATIONS.map(rotationLabel)).toEqual(['Single', 'Double', 'Triple', 'Quad']);
    expect(DEFAULT_ROTATION_MAP).toEqual({ single: 2, double: 2.5, triple: 3, quad: 3.5 });
    expect(isValidRotationMap(DEFAULT_ROTATION_MAP)).toBe(true);
  });

  it('finds the name for a call, or none', () => {
    expect(rotationForCall(2.5, DEFAULT_ROTATION_MAP)).toBe('double');
    expect(rotationForCall(3.5, DEFAULT_ROTATION_MAP)).toBe('quad');
    expect(rotationForCall(4, DEFAULT_ROTATION_MAP)).toBeNull();
  });

  it('offers the pop toss, then every half count, never "1 and"', () => {
    expect(ROTATION_CALL_CHOICES.slice(0, 4)).toEqual([1, 2, 2.5, 3]);
    expect(ROTATION_CALL_CHOICES).not.toContain(1.5);
    expect(ROTATION_CALL_CHOICES[ROTATION_CALL_CHOICES.length - 1]).toBe(32);
  });

  it('rejects maps out of order, with gaps in the names or impossible calls', () => {
    const bad: unknown[] = [
      null,
      'single',
      { single: 2, double: 2.5, triple: 3 },
      { single: 3, double: 2.5, triple: 4, quad: 5 },
      { single: 2, double: 2, triple: 3, quad: 4 },
      { single: 1.5, double: 2.5, triple: 3, quad: 4 },
      { single: 2, double: 2.25, triple: 3, quad: 4 },
      { single: 2, double: 3, triple: 4, quad: 40 },
      { single: '2', double: 3, triple: 4, quad: 5 },
    ];
    for (const map of bad) expect(isValidRotationMap(map)).toBe(false);
  });

  it('reads a stored map, falling back to the default', () => {
    const custom: RotationMap = { single: 3, double: 4, triple: 5, quad: 6 };
    expect(parseStoredRotationMap({ ...custom, extra: 1 })).toEqual(custom);
    expect(parseStoredRotationMap(undefined)).toEqual(DEFAULT_ROTATION_MAP);
    expect(parseStoredRotationMap({ single: 5, double: 4, triple: 3, quad: 2 })).toEqual(
      DEFAULT_ROTATION_MAP,
    );
  });

  describe('editing the map', () => {
    it('keeps each rotation between its neighbours', () => {
      const map = DEFAULT_ROTATION_MAP;
      // single: from the pop toss up to just before the double (2&).
      expect(rotationChoiceLimits(map, 'single')).toEqual({
        min: 0,
        max: ROTATION_CALL_CHOICES.indexOf(2),
      });
      // quad: from just after the triple to the end.
      expect(rotationChoiceLimits(map, 'quad')).toEqual({
        min: ROTATION_CALL_CHOICES.indexOf(3.5),
        max: ROTATION_CALL_CHOICES.length - 1,
      });
    });

    it('steps a rotation by one choice: 2 → 1 skips "1 and", 3& → 4', () => {
      const map = DEFAULT_ROTATION_MAP;
      const single = withRotationChoice(map, 'single', rotationChoiceIndex(map, 'single') - 1);
      expect(single.single).toBe(1);
      const quad = withRotationChoice(map, 'quad', rotationChoiceIndex(map, 'quad') + 1);
      expect(quad).toEqual({ ...map, quad: 4 });
    });

    it("clamps instead of overtaking a neighbour, and doesn't touch the input", () => {
      const map = DEFAULT_ROTATION_MAP;
      const pushed = withRotationChoice(map, 'double', rotationChoiceIndex(map, 'double') + 5);
      expect(pushed.double).toBe(2.5); // the triple (3) is right after it
      const spread = withRotationChoice(map, 'quad', 1000);
      expect(spread.quad).toBe(32);
      expect(map.quad).toBe(3.5);
    });
  });

  describe('"Use these calls"', () => {
    it('practices only the named calls', () => {
      expect(rotationCalls(DEFAULT_ROTATION_MAP, 16)).toEqual([2, 2.5, 3, 3.5]);
      const next = withRotationCalls(quads, DEFAULT_ROTATION_MAP);
      expect(next.allowedTossCounts).toEqual([2, 2.5, 3, 3.5]);
      expect(usesRotationCalls(next, DEFAULT_ROTATION_MAP)).toBe(true);
      expect(usesRotationCalls(quads, DEFAULT_ROTATION_MAP)).toBe(false);
    });

    it('drops names that need a longer phrase, and leaves the calls alone if none fit', () => {
      const long: RotationMap = { single: 3, double: 5, triple: 7, quad: 9 };
      const eight = { ...quads, phraseLength: 8 };
      expect(rotationCalls(long, 8)).toEqual([3, 5, 7]);
      expect(withRotationCalls(eight, long).allowedTossCounts).toEqual([3, 5, 7]);
      const huge: RotationMap = { single: 10, double: 11, triple: 12, quad: 13 };
      expect(rotationCalls(huge, 8)).toEqual([]);
      expect(withRotationCalls(eight, huge)).toBe(eight);
    });
  });

  it('says which picked calls have no name', () => {
    expect(unnamedCallsNote(quads, DEFAULT_ROTATION_MAP, callLabel)).toBe(
      '4, 4 and, 5 have no name and are still called as counts.',
    );
    const one = { ...quads, allowedTossCounts: [3, 4] };
    expect(unnamedCallsNote(one, DEFAULT_ROTATION_MAP, callLabel)).toBe(
      '4 has no name and is still called as a count.',
    );
    const named = withRotationCalls(quads, DEFAULT_ROTATION_MAP);
    expect(unnamedCallsNote(named, DEFAULT_ROTATION_MAP, callLabel)).toBeNull();
  });
});
