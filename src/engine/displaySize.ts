/**
 * Practice display size: the normal card, or a big one for reading across
 * the floor.
 *
 * Performers often prop the phone against a wall or a bag a few meters away
 * while they spin. At that distance the normal 120-pt count and 30-pt
 * headline are hard to read, so "Big" sizes the count to the screen: as large
 * as two digits (phrases go up to 32 counts) can be while still fitting the
 * width and leaving room for the headline, the phrase strip and the buttons.
 *
 * Pure layout math, no React: the component passes the window size in.
 */

import { STRIP_DOT_SIZE } from './stripLayout';

export type DisplaySize = 'normal' | 'big';

/** In the order the Settings chips show them. */
export const DISPLAY_SIZES: readonly DisplaySize[] = ['normal', 'big'];

export const DEFAULT_DISPLAY_SIZE: DisplaySize = 'normal';

export function isDisplaySize(value: unknown): value is DisplaySize {
  return value === 'normal' || value === 'big';
}

/** Chip text. */
export function displaySizeLabel(size: DisplaySize): string {
  return size === 'normal' ? 'Normal' : 'Big';
}

/** Screen-reader label of each chip. */
export function displaySizeAccessibilityLabel(size: DisplaySize): string {
  return size === 'normal'
    ? 'Normal practice display'
    : 'Big practice display, for across the floor';
}

/** The note under the chips. */
export function displaySizeNote(size: DisplaySize): string {
  return size === 'normal'
    ? 'Big makes the count and cues readable from a few meters away.'
    : 'The count fills the width; the legend is hidden and the strip is larger.';
}

/** Sizes, in points, the practice display uses. */
export interface DisplayMetrics {
  /** Max width of the display card (null = full width minus the page margin). */
  maxWidth: number | null;
  /** The big count. */
  countFontSize: number;
  countLineHeight: number;
  /** "Release!", "Catch!", "4 count". */
  headlineFontSize: number;
  /** The headline on the release and the catch. */
  headlineHighlightFontSize: number;
  /** "Catch on 4", "Release in 3 counts". */
  detailFontSize: number;
  /** "2 to catch". */
  countdownFontSize: number;
  /** "Toss 4 · Next 5" values. */
  callValueFontSize: number;
  /** Largest phrase-strip dot (the strip still shrinks to fit, see stripLayout.ts). */
  maxDotSize: number;
}

export const NORMAL_DISPLAY_METRICS: DisplayMetrics = {
  maxWidth: 360,
  countFontSize: 120,
  countLineHeight: 132,
  headlineFontSize: 30,
  headlineHighlightFontSize: 36,
  detailFontSize: 18,
  countdownFontSize: 16,
  callValueFontSize: 24,
  maxDotSize: STRIP_DOT_SIZE,
};

/** Page margin on each side plus the card's own padding on each side. */
export const BIG_DISPLAY_HORIZONTAL_INSET = 16 * 2 + 16 * 2;
/** Width of a two-digit count, in ems, for a heavy tabular font (with margin). */
export const TWO_DIGIT_EM_WIDTH = 1.3;
/** Share of the screen height the count may take, leaving room for the rest. */
export const BIG_COUNT_HEIGHT_SHARE = 0.3;
/** Full-size phrase-strip dot on the big display (normal: STRIP_DOT_SIZE). */
export const BIG_STRIP_DOT_SIZE = 22;
/** Never smaller than the normal count, never absurd on a tablet. */
export const BIG_COUNT_MAX = 300;

/**
 * Metrics for a display size on a window of the given size (points). "Normal"
 * ignores the window; "Big" scales the count so "16" fits the width and the
 * count takes at most ~30% of the height, and scales the text around it.
 */
export function displayMetrics(
  size: DisplaySize,
  windowWidth: number,
  windowHeight: number,
): DisplayMetrics {
  if (size === 'normal') return NORMAL_DISPLAY_METRICS;
  const byWidth = Math.max(0, windowWidth - BIG_DISPLAY_HORIZONTAL_INSET) / TWO_DIGIT_EM_WIDTH;
  const byHeight = Math.max(0, windowHeight) * BIG_COUNT_HEIGHT_SHARE;
  const count = Math.floor(
    Math.min(
      BIG_COUNT_MAX,
      Math.max(NORMAL_DISPLAY_METRICS.countFontSize, Math.min(byWidth, byHeight)),
    ),
  );
  // Text around the count grows by the same factor, a bit less for the
  // headline (it's words, it has to fit "Mark time" on one line).
  const factor = count / NORMAL_DISPLAY_METRICS.countFontSize;
  const scaled = (n: number, damping = 1) => Math.round(n * (1 + (factor - 1) * damping));
  return {
    maxWidth: null,
    countFontSize: count,
    countLineHeight: Math.round(count * 1.1),
    headlineFontSize: scaled(NORMAL_DISPLAY_METRICS.headlineFontSize, 0.5),
    headlineHighlightFontSize: scaled(NORMAL_DISPLAY_METRICS.headlineHighlightFontSize, 0.5),
    detailFontSize: scaled(NORMAL_DISPLAY_METRICS.detailFontSize, 0.4),
    countdownFontSize: scaled(NORMAL_DISPLAY_METRICS.countdownFontSize, 0.4),
    callValueFontSize: scaled(NORMAL_DISPLAY_METRICS.callValueFontSize, 0.5),
    maxDotSize: BIG_STRIP_DOT_SIZE,
  };
}
