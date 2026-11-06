import { PAGES, pageDotsLabel, pageFromOffset, settingsLinkLabel } from '../pages';

describe('pageFromOffset', () => {
  it('rounds to the nearest page', () => {
    expect(pageFromOffset(0, 390)).toBe(0);
    expect(pageFromOffset(194, 390)).toBe(0);
    expect(pageFromOffset(196, 390)).toBe(1);
    expect(pageFromOffset(390, 390)).toBe(1);
  });

  it('clamps overscroll to the pages that exist', () => {
    expect(pageFromOffset(-60, 390)).toBe(0);
    expect(pageFromOffset(900, 390)).toBe(1);
  });

  it('stays on the first page before layout or on bad input', () => {
    expect(pageFromOffset(390, 0)).toBe(0);
    expect(pageFromOffset(NaN, 390)).toBe(0);
    expect(pageFromOffset(390, NaN)).toBe(0);
  });
});

describe('labels', () => {
  it('names each page for screen readers', () => {
    expect(PAGES).toHaveLength(2);
    expect(pageDotsLabel(0)).toBe('Page 1 of 2: Practice');
    expect(pageDotsLabel(1)).toBe('Page 2 of 2: Settings & stats');
  });

  it('mentions the swipe until the settings page has been seen', () => {
    expect(settingsLinkLabel(false)).toBe('Swipe left for settings & stats ›');
    expect(settingsLinkLabel(true)).toBe('Settings & stats ›');
  });
});
