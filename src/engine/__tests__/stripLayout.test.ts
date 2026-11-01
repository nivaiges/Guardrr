import {
  STRIP_DOT_SIZE,
  STRIP_EDGE_ROOM,
  STRIP_GAP,
  STRIP_MIN_DOT_SIZE,
  STRIP_MIN_GAP,
  phraseStripLayout,
} from '../stripLayout';

const widthOf = (perRow: number, dot: number, gap: number) =>
  perRow * dot + (perRow - 1) * gap + 2 * STRIP_EDGE_ROOM;

describe('phraseStripLayout', () => {
  it('keeps a 16-count phrase on one row on a 390-pt phone (310 pt of strip)', () => {
    const layout = phraseStripLayout(16, 310);
    expect(layout.rows).toHaveLength(1);
    expect(layout.rows[0]).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
    expect(layout.dotSize).toBeLessThan(STRIP_DOT_SIZE);
    expect(widthOf(16, layout.dotSize, layout.gap)).toBeLessThanOrEqual(310);
  });

  it('uses full-size dots when there is room', () => {
    expect(phraseStripLayout(16, 400)).toMatchObject({ dotSize: STRIP_DOT_SIZE, gap: STRIP_GAP });
    expect(phraseStripLayout(8, 310)).toMatchObject({ dotSize: STRIP_DOT_SIZE, gap: STRIP_GAP });
  });

  it('uses full-size dots before the width is known', () => {
    const layout = phraseStripLayout(16, 0);
    expect(layout.rows).toHaveLength(1);
    expect(layout.dotSize).toBe(STRIP_DOT_SIZE);
    expect(phraseStripLayout(16, NaN).dotSize).toBe(STRIP_DOT_SIZE);
  });

  it('splits long phrases into even rows of at most 16', () => {
    expect(phraseStripLayout(32, 1000).rows.map((r) => r.length)).toEqual([16, 16]);
    expect(phraseStripLayout(24, 1000).rows.map((r) => r.length)).toEqual([12, 12]);
    expect(phraseStripLayout(64, 1000).rows.map((r) => r.length)).toEqual([16, 16, 16, 16]);
  });

  it('adds a row rather than shrinking dots below the minimum', () => {
    const layout = phraseStripLayout(16, 150);
    expect(layout.rows.length).toBeGreaterThan(1);
    expect(layout.dotSize).toBeGreaterThanOrEqual(STRIP_MIN_DOT_SIZE);
    expect(layout.gap).toBeGreaterThanOrEqual(STRIP_MIN_GAP);
    const perRow = Math.max(...layout.rows.map((r) => r.length));
    expect(widthOf(perRow, layout.dotSize, layout.gap)).toBeLessThanOrEqual(150);
  });

  it('lists every count exactly once, in order', () => {
    for (const length of [1, 4, 7, 8, 12, 16, 20, 32, 64]) {
      for (const width of [0, 120, 310, 600]) {
        const flat = phraseStripLayout(length, width).rows.flat();
        expect(flat).toEqual(Array.from({ length }, (_, i) => i + 1));
      }
    }
  });

  it('falls back to one count per row when nothing fits', () => {
    const layout = phraseStripLayout(4, 5);
    expect(layout.rows).toEqual([[1], [2], [3], [4]]);
    expect(layout).toMatchObject({ dotSize: STRIP_MIN_DOT_SIZE, gap: STRIP_MIN_GAP });
  });
});
