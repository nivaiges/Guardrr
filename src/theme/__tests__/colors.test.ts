import { contrastRatio, luminance } from '../contrast';
import { Theme, darkTheme, lightTheme, themeFor } from '../colors';

describe('contrast math', () => {
  it('matches the WCAG reference values', () => {
    expect(luminance('#000')).toBe(0);
    expect(luminance('#ffffff')).toBe(1);
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21);
    expect(contrastRatio('#ffffff', '#ffffff')).toBe(1);
    // Order doesn't matter.
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(contrastRatio('#ffffff', '#777777'));
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });

  it('rejects malformed colors', () => {
    expect(() => luminance('red')).toThrow();
    expect(() => luminance('#12345')).toThrow();
  });
});

describe.each<[string, Theme]>([
  ['light', lightTheme],
  ['dark', darkTheme],
])('%s theme', (_name, t) => {
  const AA_TEXT = 4.5;
  const AA_UI = 3;

  it('has readable text on every background it sits on', () => {
    const backgrounds = [t.background, t.surface, t.control, ...Object.values(t.phase)];
    for (const bg of backgrounds) {
      expect(contrastRatio(t.text, bg)).toBeGreaterThanOrEqual(AA_TEXT);
    }
    for (const bg of [t.background, t.surface, ...Object.values(t.phase)]) {
      expect(contrastRatio(t.textMuted, bg)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it('has readable text on the primary, stop and warning colors', () => {
    expect(contrastRatio(t.onPrimary, t.primary)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(t.onPrimary, t.danger)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(t.warningText, t.warningBackground)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('has readable drop marks on the background and the stats card', () => {
    for (const bg of [t.background, t.surface]) {
      expect(contrastRatio(t.dangerText, bg)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it('has phrase-strip markers and bars visible on the display at rest', () => {
    for (const m of Object.values(t.marker)) {
      expect(contrastRatio(m, t.phase.ready)).toBeGreaterThanOrEqual(AA_UI);
    }
    expect(contrastRatio(t.primary, t.track)).toBeGreaterThanOrEqual(AA_UI);
  });

  it('keeps the phases distinguishable from the resting display', () => {
    for (const phase of ['release', 'in-air', 'catch'] as const) {
      expect(t.phase[phase]).not.toBe(t.phase.ready);
    }
  });
});

describe('themeFor', () => {
  it('picks dark only for the dark scheme', () => {
    expect(themeFor('dark')).toBe(darkTheme);
    expect(themeFor('light')).toBe(lightTheme);
    expect(themeFor(null)).toBe(lightTheme);
    expect(themeFor(undefined)).toBe(lightTheme);
  });
});
