import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

import { AppearancePreference, DEFAULT_APPEARANCE } from '../engine';
import { Theme, themeForAppearance } from './colors';

/**
 * The appearance chosen in Settings (System / Light / Dark). App provides it
 * from the saved settings; without a provider the theme follows the phone.
 */
export const AppearanceContext = createContext<AppearancePreference>(DEFAULT_APPEARANCE);

/** The palette for the chosen appearance, following the phone live under "System". */
export function useTheme(): Theme {
  return themeForAppearance(useContext(AppearanceContext), useColorScheme());
}

/**
 * Wrap a `(theme) => StyleSheet.create(...)` factory so each theme's styles
 * are built once, not on every render.
 */
export function themed<T>(factory: (theme: Theme) => T): (theme: Theme) => T {
  const cache = new Map<Theme, T>();
  return (theme) => {
    let styles = cache.get(theme);
    if (styles === undefined) {
      styles = factory(theme);
      cache.set(theme, styles);
    }
    return styles;
  };
}
