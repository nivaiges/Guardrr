import {
  POP_TOSS_CATCH,
  airTimeCounts,
  callLabel,
  catchCountOf,
  catchPositionOf,
  catchesOnAnd,
  isAndCall,
  isValidCall,
} from '../calls';
import { tossCountsInRange } from '../random';

describe('toss calls', () => {
  it('validates half-count steps from 1 up', () => {
    for (const ok of [1, 1.5, 2, 7, 15.5, 32]) expect(isValidCall(ok)).toBe(true);
    for (const bad of [0, 0.5, -2, 2.25, NaN, Infinity]) expect(isValidCall(bad)).toBe(false);
    expect(() => catchPositionOf(2.2)).toThrow(RangeError);
  });

  it('catches a whole call on its count', () => {
    expect(catchPositionOf(5)).toBe(5);
    expect(catchCountOf(5)).toBe(5);
    expect(catchesOnAnd(5)).toBe(false);
    expect(airTimeCounts(5)).toBe(4);
  });

  it('catches an "and" call on the and after its count', () => {
    expect(isAndCall(2.5)).toBe(true);
    expect(catchPositionOf(2.5)).toBe(2.5);
    expect(catchCountOf(2.5)).toBe(2);
    expect(catchesOnAnd(2.5)).toBe(true);
    expect(airTimeCounts(2.5)).toBe(1.5);
  });

  it('treats "1" as a pop toss caught on the and of 1', () => {
    expect(POP_TOSS_CATCH).toBe(1.5);
    expect(catchPositionOf(1)).toBe(1.5);
    expect(catchesOnAnd(1)).toBe(true);
    expect(isAndCall(1)).toBe(false);
    expect(airTimeCounts(1)).toBe(0.5);
  });

  it('labels calls the way they are spoken', () => {
    expect(callLabel(1)).toBe('1');
    expect(callLabel(7)).toBe('7');
    expect(callLabel(2.5)).toBe('2 and');
    expect(callLabel(15.5)).toBe('15 and');
  });

  it('builds ranges with optional and calls', () => {
    expect(tossCountsInRange(2, 4)).toEqual([2, 3, 4]);
    expect(tossCountsInRange(2, 4, { andCounts: true })).toEqual([2, 2.5, 3, 3.5, 4]);
  });
});
