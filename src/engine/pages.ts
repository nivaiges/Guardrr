/**
 * The two swipeable pages of the app (practice over the camera, then
 * settings & stats) and the small bits of logic around them: which page a
 * scroll offset lands on, what the page dots say to a screen reader, and
 * the first-open swipe hint.
 */

export const PAGES = ['Practice', 'Settings & stats'] as const;
export type PageIndex = 0 | 1;

/**
 * The page a horizontal scroll offset shows. Rounds to the nearest page and
 * clamps, so iOS overscroll (a negative offset, or past the last page) and a
 * zero width (before layout) never yield a page that doesn't exist.
 */
export function pageFromOffset(offsetX: number, pageWidth: number): PageIndex {
  if (!(pageWidth > 0) || !Number.isFinite(offsetX)) return 0;
  const page = Math.round(offsetX / pageWidth);
  return page >= PAGES.length - 1 ? 1 : 0;
}

/** "Page 1 of 2: Practice" — the page dots as one screen-reader label. */
export function pageDotsLabel(page: PageIndex): string {
  return `Page ${page + 1} of ${PAGES.length}: ${PAGES[page]}`;
}

/**
 * The label of the link from practice to settings. Until the performer has
 * seen the settings page once, it also says the page is a swipe away.
 */
export function settingsLinkLabel(swipeHintSeen: boolean): string {
  return swipeHintSeen ? 'Settings & stats ›' : 'Swipe left for settings & stats ›';
}
