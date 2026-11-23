import {
  BIG_COUNT_MAX,
  BIG_STRIP_DOT_SIZE,
  DEFAULT_DISPLAY_SIZE,
  DISPLAY_SIZES,
  NORMAL_DISPLAY_METRICS,
  TWO_DIGIT_EM_WIDTH,
  displayMetrics,
  displaySizeAccessibilityLabel,
  displaySizeLabel,
  displaySizeNote,
  isDisplaySize,
} from '../displaySize';
import { STRIP_DOT_SIZE } from '../stripLayout';

describe('display size', () => {
  it('starts with the normal display', () => {
    expect(DEFAULT_DISPLAY_SIZE).toBe('normal');
    expect(DISPLAY_SIZES).toEqual(['normal', 'big']);
  });

  it('recognizes only the two sizes', () => {
    for (const s of DISPLAY_SIZES) expect(isDisplaySize(s)).toBe(true);
    for (const v of ['Big', 'large', '', null, undefined, 1, {}])
      expect(isDisplaySize(v)).toBe(false);
  });

  it('labels the chips and explains them', () => {
    expect(DISPLAY_SIZES.map(displaySizeLabel)).toEqual(['Normal', 'Big']);
    expect(displaySizeAccessibilityLabel('big')).toMatch(/across the floor/);
    expect(displaySizeNote('normal')).toMatch(/few meters/);
    expect(displaySizeNote('big')).toMatch(/fills the width/);
  });

  it("keeps today's sizes for Normal, whatever the window", () => {
    expect(displayMetrics('normal', 390, 844)).toBe(NORMAL_DISPLAY_METRICS);
    expect(displayMetrics('normal', 1024, 1366)).toBe(NORMAL_DISPLAY_METRICS);
    expect(NORMAL_DISPLAY_METRICS).toMatchObject({
      maxWidth: 360,
      countFontSize: 120,
      headlineFontSize: 30,
      maxDotSize: STRIP_DOT_SIZE,
    });
  });

  it('about doubles the count on a 390 x 844 phone, and "16" still fits the width', () => {
    const m = displayMetrics('big', 390, 844);
    expect(m.maxWidth).toBeNull();
    expect(m.countFontSize).toBeGreaterThanOrEqual(240);
    // Two digits fit inside the card (390 minus page margin and card padding).
    expect(m.countFontSize * TWO_DIGIT_EM_WIDTH).toBeLessThanOrEqual(390 - 64);
    // At most ~30% of the height, so the headline, strip and buttons still fit.
    expect(m.countLineHeight).toBeLessThanOrEqual(844 * 0.33);
    expect(m.headlineFontSize).toBeGreaterThan(30);
    expect(m.headlineHighlightFontSize).toBeGreaterThan(m.headlineFontSize);
    expect(m.detailFontSize).toBeGreaterThan(18);
    expect(m.maxDotSize).toBe(BIG_STRIP_DOT_SIZE);
  });

  it('keeps the headline short enough for "Mark time" on a small phone (320 pt)', () => {
    const m = displayMetrics('big', 320, 568);
    // "Mark time" is ~9 characters at ~0.6 em each in a bold font.
    expect(m.headlineFontSize * 9 * 0.6).toBeLessThanOrEqual(320 - 64);
    expect(m.countFontSize * TWO_DIGIT_EM_WIDTH).toBeLessThanOrEqual(320 - 64);
  });

  it('is limited by the height in landscape', () => {
    expect(displayMetrics('big', 900, 500).countFontSize).toBe(150);
    // A phone on its side: never smaller than the normal count.
    expect(displayMetrics('big', 844, 390).countFontSize).toBe(120);
  });

  it('never goes below the normal count, nor above the cap on a tablet', () => {
    expect(displayMetrics('big', 100, 100).countFontSize).toBe(120);
    expect(displayMetrics('big', 0, 0).countFontSize).toBe(120);
    expect(displayMetrics('big', 2048, 2732).countFontSize).toBe(BIG_COUNT_MAX);
  });
});
