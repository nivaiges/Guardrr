/**
 * Layout of the per-count phrase strip under the big count.
 *
 * Pure: given the phrase length and the width available, decide how many
 * rows the dots go on and how big they are. The strip used to wrap
 * wherever flexbox ran out of room (on a 390-pt phone a 16-count phrase put
 * its 16th dot alone on a second line), which hides the shape of the phrase.
 * Here rows are always even splits (a 32-count phrase is two rows of 16, a
 * 24 is two of 12) and the dots shrink before an extra row is added.
 */

/** Dot diameter and gap at full size. */
export const STRIP_DOT_SIZE = 14;
export const STRIP_GAP = 6;
/** Smallest dot / gap before another row is used instead. */
export const STRIP_MIN_DOT_SIZE = 8;
export const STRIP_MIN_GAP = 3;
/** Never more counts per row than this, however wide the screen. */
export const STRIP_MAX_PER_ROW = 16;
/**
 * Room kept at each end of a row: the "and" marker hangs 6 pt past the last
 * dot and the current dot is drawn 1.4× its size.
 */
export const STRIP_EDGE_ROOM = 6;

export interface StripLayout {
  /** Counts (1-based) on each row, in order. */
  rows: number[][];
  dotSize: number;
  gap: number;
}

function rowWidth(perRow: number, dot: number, gap: number): number {
  return perRow * dot + (perRow - 1) * gap + 2 * STRIP_EDGE_ROOM;
}

function split(phraseLength: number, rows: number): number[][] {
  const perRow = Math.ceil(phraseLength / rows);
  const out: number[][] = [];
  for (let start = 1; start <= phraseLength; start += perRow) {
    const row: number[] = [];
    for (let c = start; c < start + perRow && c <= phraseLength; c++) row.push(c);
    out.push(row);
  }
  return out;
}

/**
 * Rows and dot size for a phrase strip `width` points wide. An unknown or
 * non-positive width (before the first layout pass) gets full-size dots.
 */
export function phraseStripLayout(phraseLength: number, width: number): StripLayout {
  const length = Math.max(1, Math.floor(phraseLength));
  const known = Number.isFinite(width) && width > 0;
  for (let rows = Math.ceil(length / STRIP_MAX_PER_ROW); rows <= length; rows++) {
    const perRow = Math.ceil(length / rows);
    if (!known) return { rows: split(length, rows), dotSize: STRIP_DOT_SIZE, gap: STRIP_GAP };
    const scale = Math.min(1, width / rowWidth(perRow, STRIP_DOT_SIZE, STRIP_GAP));
    const dotSize = Math.floor(STRIP_DOT_SIZE * scale);
    const gap = Math.floor(STRIP_GAP * scale);
    if (
      dotSize >= STRIP_MIN_DOT_SIZE &&
      gap >= STRIP_MIN_GAP &&
      rowWidth(perRow, dotSize, gap) <= width
    ) {
      return { rows: split(length, rows), dotSize, gap };
    }
  }
  // Absurdly narrow: one count per row at the minimum size.
  return { rows: split(length, length), dotSize: STRIP_MIN_DOT_SIZE, gap: STRIP_MIN_GAP };
}
