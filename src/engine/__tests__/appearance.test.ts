import {
  APPEARANCE_PREFERENCES,
  DEFAULT_APPEARANCE,
  appearanceAccessibilityLabel,
  appearanceLabel,
  appearanceNote,
  isAppearancePreference,
  resolveDark,
} from '../appearance';

describe('appearance', () => {
  it('follows the phone by default', () => {
    expect(DEFAULT_APPEARANCE).toBe('system');
    expect(APPEARANCE_PREFERENCES).toEqual(['system', 'light', 'dark']);
  });

  it('recognizes only the three preferences', () => {
    for (const p of APPEARANCE_PREFERENCES) expect(isAppearancePreference(p)).toBe(true);
    for (const v of ['auto', 'Dark', '', null, undefined, 1, true, {}])
      expect(isAppearancePreference(v)).toBe(false);
  });

  it('resolves System to the phone scheme, treating unknown as light', () => {
    expect(resolveDark('system', 'dark')).toBe(true);
    expect(resolveDark('system', 'light')).toBe(false);
    expect(resolveDark('system', null)).toBe(false);
    expect(resolveDark('system', undefined)).toBe(false);
    expect(resolveDark('system', 'unspecified')).toBe(false);
  });

  it('forces light or dark whatever the phone says', () => {
    for (const scheme of ['light', 'dark', null]) {
      expect(resolveDark('light', scheme)).toBe(false);
      expect(resolveDark('dark', scheme)).toBe(true);
    }
  });

  it('labels the chips', () => {
    expect(APPEARANCE_PREFERENCES.map(appearanceLabel)).toEqual(['System', 'Light', 'Dark']);
    expect(APPEARANCE_PREFERENCES.map(appearanceAccessibilityLabel)).toEqual([
      "Match the phone's appearance",
      'Always light',
      'Always dark',
    ]);
  });

  it('says what System currently means', () => {
    expect(appearanceNote('system', 'dark')).toBe('Following the phone: dark right now.');
    expect(appearanceNote('system', null)).toBe('Following the phone: light right now.');
    expect(appearanceNote('dark', 'light')).toBe('Sounds, haptics and the camera are unaffected.');
  });
});
